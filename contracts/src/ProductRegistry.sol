// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IProductRegistry} from "./interfaces/IProductRegistry.sol";
import {ProjectAlreadyExists, ProjectDoesNotExist, UnauthorizedProducer, BatchTooLarge, EmptyBatch, DuplicateProductHash, ProductDoesNotExist, ProductAlreadyRedeemed} from "./errors/Errors.sol";

/// @title ProductRegistry — on-chain registry for QR-coded product authentication.
/// @author paper authors
/// @notice Stateful contract implementing the three primitives of the paper
///         "QR-coded blockchain anti-counterfeiting for agricultural products":
///         project registration (Algorithm 1 line 5), batch registration
///         (Algorithm 1 line 14), and redemption (Algorithm 3 phase 2).
/// @dev Storage layout (locked — see ADR-008, immutable contract):
///      slot 0: mapping(bytes32 => Project) projects     // phi -> Project{producer, exists}
///      slot 1: mapping(bytes32 => mapping(bytes32 => ProductRecord)) products
///                                                        // phi -> h -> ProductRecord{exists, redeemed}
///      slot 2: uint256 totalRedeemed                     // monotonic counter
///
///      The contract has no admin, no upgradeability proxy, no pause switch.
///      Once deployed it is final. This is intentional: the paper claims SR1–SR4
///      hold on the bare contract, so additional moving parts (proxies,
///      pausers) would expand the trust surface.
/// @custom:paper §7.1 lines 846-872; Algorithms 1-3 (lines 509-689); Notation
///                table (lines 1346-1409).
/// @custom:security SR1 unforgeability + SR2 non-replayability + SR3
///                  non-repudiation + SR4 trust-independence are formally
///                  encoded as Foundry property tests under
///                  contracts/test/properties/SR{1,2,3,4}_*.t.sol.
contract ProductRegistry is IProductRegistry {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Maximum number of product hashes accepted in a single
    ///         registerBatch call. Bounded so a producer cannot brick the tx
    ///         with a >block-gas-limit batch.
    /// @dev Hard-coded per gathered-requirements §3.1; not configurable to
    ///      keep the trust surface flat (no admin who could change limits).
    uint256 public constant MAX_BATCH_SIZE = 500;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @dev Project record. `exists` distinguishes a registered phi from the
    ///      mapping default (zero-struct). Without the explicit flag we'd
    ///      have to treat address(0) as "absent", which collides with a
    ///      hypothetical legitimate registration from address(0) (impossible
    ///      in practice but worth being defensive about for proof-friendly
    ///      reasoning).
    struct Project {
        address producerAddress;
        bool exists;
    }

    /// @dev Product record. Two booleans live in one storage slot.
    struct ProductRecord {
        bool exists;
        bool redeemed;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @dev phi -> Project. Private; reads go through views below.
    mapping(bytes32 => Project) private projects;

    /// @dev phi -> h -> ProductRecord. Private; reads go through views below.
    mapping(bytes32 => mapping(bytes32 => ProductRecord)) private products;

    /// @inheritdoc IProductRegistry
    uint256 public totalRedeemed;

    // -------------------------------------------------------------------------
    // Producer-side mutators
    // -------------------------------------------------------------------------

    /// @inheritdoc IProductRegistry
    function registerProject(bytes32 phi) external {
        if (projects[phi].exists) revert ProjectAlreadyExists(phi);
        projects[phi] = Project({producerAddress: msg.sender, exists: true});
        emit ProjectCreated(phi, msg.sender);
    }

    /// @inheritdoc IProductRegistry
    function registerBatch(bytes32 phi, bytes32[] calldata hashes) external {
        Project storage proj = projects[phi];
        if (!proj.exists) revert ProjectDoesNotExist(phi);
        if (proj.producerAddress != msg.sender) {
            revert UnauthorizedProducer(phi, msg.sender);
        }

        uint256 n = hashes.length;
        if (n == 0) revert EmptyBatch();
        if (n > MAX_BATCH_SIZE) revert BatchTooLarge(n);

        mapping(bytes32 => ProductRecord) storage projProducts = products[phi];
        for (uint256 i = 0; i < n; ++i) {
            bytes32 h = hashes[i];
            if (projProducts[h].exists) revert DuplicateProductHash(phi, h);
            projProducts[h] = ProductRecord({exists: true, redeemed: false});
        }

        emit ProductsRegistered(phi, n);
    }

    // -------------------------------------------------------------------------
    // Consumer-side mutator
    // -------------------------------------------------------------------------

    /// @inheritdoc IProductRegistry
    function redeemProduct(bytes32 phi, bytes calldata sid) external {
        Project storage proj = projects[phi];
        if (!proj.exists) revert ProjectDoesNotExist(phi);

        // SR4: hash is computed in-EVM via the SHA-256 precompile (address
        // 0x02). The caller cannot influence h — supplying a doctored sid
        // produces a doctored h that simply will not be present in
        // products[phi], so the lookup below reverts.
        bytes32 h = sha256(sid);

        ProductRecord storage rec = products[phi][h];
        if (!rec.exists) revert ProductDoesNotExist(phi, h);
        if (rec.redeemed) revert ProductAlreadyRedeemed(phi, h);

        rec.redeemed = true;
        unchecked {
            // Cannot overflow: even at one redemption per nanosecond it takes
            // ~5.8e60 years to wrap a uint256. Cheaper than the checked add.
            ++totalRedeemed;
        }

        emit ProductRedeemed(phi, h, proj.producerAddress, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Read-only views
    // -------------------------------------------------------------------------

    /// @inheritdoc IProductRegistry
    function verifyProduct(
        bytes32 phi,
        bytes32 h
    ) external view returns (bool exists, bool redeemed, address producer) {
        ProductRecord storage rec = products[phi][h];
        Project storage proj = projects[phi];
        return (rec.exists, rec.redeemed, proj.producerAddress);
    }

    /// @inheritdoc IProductRegistry
    function projectExists(bytes32 phi) external view returns (bool) {
        return projects[phi].exists;
    }
}
