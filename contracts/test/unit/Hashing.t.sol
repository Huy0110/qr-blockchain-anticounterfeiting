// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProductDoesNotExist} from "../../src/errors/Errors.sol";

/// @title Hashing test — covers AC-SC-12 by proving the contract uses the
///        SHA-256 precompile (address 0x02) inside redeemProduct, NOT keccak256.
/// @notice Strategy: register the SHA-256 hash of a sid; redeem with that sid
///         must succeed. Then build a fresh sid whose KECCAK-256 hash collides
///         with no SHA-256 entry; redeem with that sid must revert. If the
///         contract were using keccak256 internally, the second case would
///         either succeed (collision-style) or give a different revert reason.
contract HashingTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);
    }

    /// @notice Sanity baseline: contract+test agree on sha256(sid).
    function test_redeemProduct_succeedsWhenShaHashRegistered() public {
        bytes memory sid = bytes("sha-test-sid");
        bytes32 hSha = sha256(sid);

        bytes32[] memory hashes = _singleHash(hSha);
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, sid);

        (, bool redeemed, ) = registry.verifyProduct(PHI_DEFAULT, hSha);
        assertTrue(redeemed, "redeem failed even though sha256 hash was registered");
    }

    /// @notice The discriminating test: register only the keccak256(sid) under
    ///         phi, then attempt redeemProduct(sid). If the contract used
    ///         keccak256 internally this would succeed; with sha256 it must
    ///         revert with ProductDoesNotExist(phi, sha256(sid)).
    function test_redeemProduct_failsIfOnlyKeccakRegistered() public {
        bytes memory sid = bytes("discriminator-sid-1");
        bytes32 hSha = sha256(sid);
        bytes32 hKeccak = keccak256(sid);
        // Sanity: the two hash families differ for this sid.
        assertTrue(hSha != hKeccak, "sha256 and keccak256 collided on sid");

        bytes32[] memory hashes = _singleHash(hKeccak);
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        // Contract recomputes sha256(sid) and looks it up; not present => revert.
        vm.expectRevert(abi.encodeWithSelector(ProductDoesNotExist.selector, PHI_DEFAULT, hSha));
        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, sid);
    }

    /// @notice Strong assertion: redeemProduct must invoke a call to address
    ///         0x02 (the SHA-256 precompile) with the caller-supplied sid as
    ///         input. A keccak256 implementation would lower to a SHA3 opcode
    ///         (no precompile call) and the expectCall would fail.
    /// @dev `vm.expectCall(target, data)` records every CALL/STATICCALL to
    ///      `target` whose calldata starts with `data`; if no matching call
    ///      occurs in the next external call, the test fails. Solc's
    ///      `sha256(bytes)` lowers to a STATICCALL(0x02, sid, ..., 32) — the
    ///      input is the raw sid bytes, no ABI selector — so we expect a call
    ///      to address(2) carrying exactly `sid` as data.
    function test_redeemProduct_callsSha256Precompile() public {
        bytes memory sid = bytes("precompile-call-sid");
        bytes32 hSha = sha256(sid);

        bytes32[] memory hashes = _singleHash(hSha);
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        vm.expectCall(address(0x02), sid);
        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, sid);
    }
}
