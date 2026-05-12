// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {IProductRegistry} from "../../src/interfaces/IProductRegistry.sol";

/// @title SR3 — Non-repudiation property test.
/// @notice Paper SR3 (verbatim, lines 266-274):
///         "Every successful redeemProduct invocation MUST emit a publicly
///          observable event ProductRedeemed(phi, h, producer, timestamp)
///          where timestamp is the on-chain block timestamp of the
///          containing block, so an independent observer can audit the
///          history without trusting any off-chain party."
///
///         Encoded operationally: for any (phi, sid) registered and any
///         block timestamp warpableT, the event indexed topics match
///         (phi, h := sha256(sid), producer) and the data field equals
///         block.timestamp at execution time.
contract SR3_NonRepudiationTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice ∀ (phi, sid, t). The successful redeem emits
    ///         ProductRedeemed(phi, sha256(sid), producer, t) where t is
    ///         block.timestamp under vm.warp.
    /// @dev Timestamp is bounded > 0 so vm.warp doesn't reset to genesis;
    ///      bound below 2^63 to avoid solc-level overflow on the warp helper.
    function testFuzz_SR3_EventEmittedWithTimestamp(bytes32 phi, bytes calldata sid, uint64 warpT) public {
        // Empty sid IS in scope (EC-12). Length cap keeps the fuzzer fast.
        vm.assume(sid.length < 1024);
        vm.assume(warpT > 0);

        vm.prank(producer);
        registry.registerProject(phi);

        bytes32 h = sha256(sid);
        bytes32[] memory hashes = _singleHash(h);
        vm.prank(producer);
        registry.registerBatch(phi, hashes);

        vm.warp(warpT);

        vm.expectEmit(true, true, true, true, address(registry));
        emit IProductRegistry.ProductRedeemed(phi, h, producer, warpT);

        vm.prank(consumer);
        registry.redeemProduct(phi, sid);
    }
}
