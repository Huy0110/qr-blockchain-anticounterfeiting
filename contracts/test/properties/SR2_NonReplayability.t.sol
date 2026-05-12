// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProductAlreadyRedeemed} from "../../src/errors/Errors.sol";

/// @title SR2 — Non-replayability property test.
/// @notice Paper SR2 (verbatim, lines 257-265):
///         "Every secret identifier sid registered for a project phi can be
///          redeemed at most once. Any subsequent invocation of
///          redeemProduct(phi, sid) MUST revert without altering on-chain
///          state."
///
///         Encoded operationally: for any (phi, sid) registered, the second
///         redeemProduct call always reverts with
///         ProductAlreadyRedeemed(phi, sha256(sid)) and verifyProduct still
///         returns redeemed=true (no rollback).
contract SR2_NonReplayabilityTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice ∀ (phi, sid) registered. The second redeemProduct call always
    ///         reverts; totalRedeemed increments by exactly 1 across the two
    ///         calls; verifyProduct.redeemed remains true.
    function testFuzz_SR2_SecondRedeemAlwaysReverts(bytes32 phi, bytes calldata sid) public {
        // Empty sid IS in scope (EC-12). Length cap keeps the fuzzer fast.
        vm.assume(sid.length < 1024);

        vm.prank(producer);
        registry.registerProject(phi);

        bytes32 h = sha256(sid);
        bytes32[] memory hashes = _singleHash(h);
        vm.prank(producer);
        registry.registerBatch(phi, hashes);

        uint256 redeemedBefore = registry.totalRedeemed();

        vm.prank(consumer);
        registry.redeemProduct(phi, sid);

        // Second redeem must revert and must NOT change state.
        vm.expectRevert(abi.encodeWithSelector(ProductAlreadyRedeemed.selector, phi, h));
        vm.prank(consumer);
        registry.redeemProduct(phi, sid);

        assertEq(registry.totalRedeemed(), redeemedBefore + 1, "second redeem must not increment totalRedeemed");
        (, bool redeemedFlag, ) = registry.verifyProduct(phi, h);
        assertTrue(redeemedFlag, "redeemed flag must remain true after replay attempt");
    }
}
