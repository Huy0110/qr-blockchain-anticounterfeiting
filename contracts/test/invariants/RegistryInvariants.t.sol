// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProductRegistry} from "../../src/ProductRegistry.sol";

/// @title RegistryInvariantsHandler — bounded random caller for the invariant
///        suite.
/// @notice Foundry's invariant runner picks one of these external functions
///         at random and calls it with random arguments. The handler maintains
///         ghost state (knownPhis, phiHashes, hashToSid) so it can split the
///         caller surface into two channels:
///           * redeemKnown — DETERMINISTIC success path. Picks a registered
///             (phi, h), looks the original sid up in hashToSid, calls
///             redeemProduct. First call per (phi, h) succeeds; replays revert
///             with ProductAlreadyRedeemed (caught + ignored).
///           * redeemRandom — SR1/SR4 revert path. Caller-supplied sid is
///             almost always unregistered, so redeemProduct reverts. The catch
///             block exists only because of the negligible chance of a sha256
///             collision with a registered hash.
///         The split (added per Phase 1 review I-2) ensures the invariant
///         runner actually exercises real success transitions instead of
///         revert-spamming the contract.
contract RegistryInvariantsHandler is Test {
    ProductRegistry public registry;
    address public producer;

    bytes32[] public knownPhis;
    mapping(bytes32 => bool) public phiRegistered;
    mapping(bytes32 => bytes32[]) public phiHashes;
    mapping(bytes32 => mapping(bytes32 => bool)) public hashKnown;
    /// @dev (phi, h) -> the sid that produced h. Lets redeemKnown call
    ///      redeemProduct with valid arguments.
    mapping(bytes32 => mapping(bytes32 => bytes)) public hashToSid;

    /// @dev Set of (phi, h) pairs we've successfully redeemed; tracked so the
    ///      "no un-redemption" invariant can re-check the redeemed flag.
    bytes32[] public redeemedKeys;
    mapping(bytes32 => bytes32) public redeemedPhi;
    mapping(bytes32 => bytes32) public redeemedH;
    mapping(bytes32 => bool) internal _isRedeemedKey;

    constructor(ProductRegistry _registry, address _producer) {
        registry = _registry;
        producer = _producer;
    }

    function registerProject(bytes32 phi) external {
        if (phiRegistered[phi]) return;
        phiRegistered[phi] = true;
        knownPhis.push(phi);

        vm.prank(producer);
        registry.registerProject(phi);
    }

    function registerBatch(uint256 phiSeed, bytes calldata sid) external {
        if (knownPhis.length == 0) return;
        bytes32 phi = knownPhis[phiSeed % knownPhis.length];
        if (sid.length == 0 || sid.length > 256) return;

        bytes32 h = sha256(sid);
        if (hashKnown[phi][h]) return;
        hashKnown[phi][h] = true;
        phiHashes[phi].push(h);
        hashToSid[phi][h] = sid;

        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = h;
        vm.prank(producer);
        registry.registerBatch(phi, hashes);
    }

    /// @notice Deterministic success path: pick a registered (phi, h), look up
    ///         the original sid, and redeem. Records the (phi, h) in
    ///         redeemedKeys on first success so the invariants can check it.
    function redeemKnown(uint256 phiSeed, uint256 hSeed) external {
        if (knownPhis.length == 0) return;
        bytes32 phi = knownPhis[phiSeed % knownPhis.length];
        bytes32[] storage hashes = phiHashes[phi];
        if (hashes.length == 0) return;

        bytes32 h = hashes[hSeed % hashes.length];
        bytes memory sid = hashToSid[phi][h];

        try registry.redeemProduct(phi, sid) {
            bytes32 key = keccak256(abi.encodePacked(phi, h));
            if (!_isRedeemedKey[key]) {
                _isRedeemedKey[key] = true;
                redeemedKeys.push(key);
                redeemedPhi[key] = phi;
                redeemedH[key] = h;
            }
        } catch {
            // Already redeemed (replay attempt) — invariants still hold.
        }
    }

    /// @notice SR1/SR4 revert path: caller-supplied sid is almost certainly
    ///         not registered. Catches reverts so the runner doesn't get
    ///         counted as a failed sequence.
    function redeemRandom(uint256 phiSeed, bytes calldata sid) external {
        if (knownPhis.length == 0) return;
        if (sid.length == 0 || sid.length > 256) return;
        bytes32 phi = knownPhis[phiSeed % knownPhis.length];

        try registry.redeemProduct(phi, sid) {
            // Implausible: random sid happens to hash to a stored entry.
            bytes32 h = sha256(sid);
            bytes32 key = keccak256(abi.encodePacked(phi, h));
            if (!_isRedeemedKey[key]) {
                _isRedeemedKey[key] = true;
                redeemedKeys.push(key);
                redeemedPhi[key] = phi;
                redeemedH[key] = h;
            }
        } catch {}
    }

    function redeemedKeysLength() external view returns (uint256) {
        return redeemedKeys.length;
    }
}

/// @title Stateful invariants for ProductRegistry.
/// @notice Asserts the two paper-derived stateful invariants:
///         (1) totalRedeemed is monotonically non-decreasing across any
///             sequence of valid + invalid external calls;
///         (2) once a (phi, h) is redeemed, subsequent verifyProduct queries
///             always return redeemed=true (no un-redemption).
contract RegistryInvariantsTest is Test {
    ProductRegistry internal registry;
    RegistryInvariantsHandler internal handler;
    address internal producer;

    uint256 internal lastTotalRedeemed;

    function setUp() public {
        producer = makeAddr("producer");
        registry = new ProductRegistry();
        handler = new RegistryInvariantsHandler(registry, producer);
        targetContract(address(handler));
    }

    /// @notice Invariant 1: totalRedeemed never decreases.
    function invariant_totalRedeemedMonotonic() public {
        uint256 current = registry.totalRedeemed();
        assertGe(current, lastTotalRedeemed, "totalRedeemed decreased");
        lastTotalRedeemed = current;
    }

    /// @notice Invariant 2: every (phi, h) the handler has previously
    ///         observed as redeemed must still report redeemed=true.
    function invariant_noUnredemption() public view {
        uint256 n = handler.redeemedKeysLength();
        for (uint256 i = 0; i < n; ++i) {
            bytes32 key = handler.redeemedKeys(i);
            bytes32 phi = handler.redeemedPhi(key);
            bytes32 h = handler.redeemedH(key);
            (, bool redeemed, ) = registry.verifyProduct(phi, h);
            assertTrue(redeemed, "previously redeemed (phi, h) reverted to !redeemed");
        }
    }

    /// @notice Regression test for review I-2: redeemKnown must actually
    ///         populate redeemedKeys when called against a registered (phi, sid).
    ///         Run as a unit test (not part of the invariant runner) so the
    ///         signal isn't drowned out by random-call statistics.
    function test_handler_redeemKnown_populatesRedeemedKeys() public {
        bytes32 phi = keccak256("regression-phi");
        bytes memory sid = bytes("regression-sid-001");

        handler.registerProject(phi);
        handler.registerBatch(0, sid);
        assertEq(handler.redeemedKeysLength(), 0, "no redeems yet");

        handler.redeemKnown(0, 0);
        assertEq(handler.redeemedKeysLength(), 1, "redeemKnown failed to populate redeemedKeys");

        // Replay must NOT double-count.
        handler.redeemKnown(0, 0);
        assertEq(handler.redeemedKeysLength(), 1, "replay double-counted");
    }
}
