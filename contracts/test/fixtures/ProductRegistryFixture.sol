// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProductRegistry} from "../../src/ProductRegistry.sol";
import {IProductRegistry} from "../../src/interfaces/IProductRegistry.sol";

/// @title ProductRegistryFixture — shared deploy + helper harness for Foundry tests.
/// @notice Inherit from this contract in unit, property, invariant, or gas
///         test files to get a fresh ProductRegistry deployment plus the
///         common labelled accounts (producer, otherProducer, consumer, hub).
/// @dev Each test contract must call `_deployFixture()` from setUp; doing it
///      here (instead of constructor-time) lets sub-contracts declare extra
///      state vars without ordering surprises.
abstract contract ProductRegistryFixture is Test {
    // -------------------------------------------------------------------------
    // System under test
    // -------------------------------------------------------------------------

    ProductRegistry internal registry;

    // -------------------------------------------------------------------------
    // Labelled accounts
    // -------------------------------------------------------------------------

    address internal producer;
    address internal otherProducer;
    address internal consumer;
    address internal hub;

    // -------------------------------------------------------------------------
    // Constants for tests
    // -------------------------------------------------------------------------

    /// @dev Reference phi used in most happy-path unit tests.
    bytes32 internal constant PHI_DEFAULT = keccak256("phi:default");

    /// @dev Reference sid used in most happy-path unit tests.
    bytes internal constant SID_DEFAULT = bytes("sid:default-secret-identifier-001");

    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------

    function _deployFixture() internal {
        producer = makeAddr("producer");
        otherProducer = makeAddr("otherProducer");
        consumer = makeAddr("consumer");
        hub = makeAddr("hub");

        registry = new ProductRegistry();
        vm.label(address(registry), "ProductRegistry");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// @dev Build a one-element bytes32[] from a single hash. Forge's calldata
    ///      construction needs an in-memory slice for this; this helper keeps
    ///      tests terse.
    function _singleHash(bytes32 h) internal pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = h;
        return hashes;
    }

    /// @dev Convenience: hash a sid using the same SHA-256 precompile the
    ///      contract uses internally. Tests must use this — never keccak256 —
    ///      to mirror the paper §7.1 hash function (see ADR-007).
    function _hashSid(bytes memory sid) internal pure returns (bytes32) {
        return sha256(sid);
    }

    /// @dev Pre-register a project + a single product under (phi, sid) so
    ///      individual tests can jump straight to the scenario under test.
    function _seedProductForRedeem(bytes32 phi, bytes memory sid, address asProducer) internal {
        vm.prank(asProducer);
        registry.registerProject(phi);
        bytes32 h = _hashSid(sid);
        vm.prank(asProducer);
        registry.registerBatch(phi, _singleHash(h));
    }
}
