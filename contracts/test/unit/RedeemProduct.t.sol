// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProjectDoesNotExist, ProductDoesNotExist, ProductAlreadyRedeemed} from "../../src/errors/Errors.sol";
import {IProductRegistry} from "../../src/interfaces/IProductRegistry.sol";

/// @title RedeemProduct unit tests — covers AC-SC-6, AC-SC-7, AC-SC-8.
contract RedeemProductTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice AC-SC-6: a valid redemption flips redeemed=true, emits
    ///         ProductRedeemed(phi, h, producer, block.timestamp), and
    ///         increments totalRedeemed.
    function test_redeemProduct_happyPath_emitsAndFlipsRedeemed() public {
        _seedProductForRedeem(PHI_DEFAULT, SID_DEFAULT, producer);
        bytes32 h = _hashSid(SID_DEFAULT);
        uint256 redeemedBefore = registry.totalRedeemed();

        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, true, true, address(registry));
        emit IProductRegistry.ProductRedeemed(PHI_DEFAULT, h, producer, block.timestamp);

        // Per ADR-014 any address may call redeem; consumer (or hub on its
        // behalf) is the typical caller.
        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, SID_DEFAULT);

        (bool exists, bool redeemed, address recordedProducer) = registry.verifyProduct(PHI_DEFAULT, h);
        assertTrue(exists, "exists flag lost on redeem");
        assertTrue(redeemed, "redeemed flag not set");
        assertEq(recordedProducer, producer, "producer must remain bound to phi");
        assertEq(registry.totalRedeemed(), redeemedBefore + 1, "totalRedeemed must increment");
    }

    /// @notice AC-SC-7 / EC-7: the second redeemProduct with the same sid
    ///         reverts with ProductAlreadyRedeemed(phi, h).
    function test_redeemProduct_revertsOnSecondRedeem() public {
        _seedProductForRedeem(PHI_DEFAULT, SID_DEFAULT, producer);
        bytes32 h = _hashSid(SID_DEFAULT);

        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, SID_DEFAULT);

        vm.expectRevert(abi.encodeWithSelector(ProductAlreadyRedeemed.selector, PHI_DEFAULT, h));
        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, SID_DEFAULT);
    }

    /// @notice AC-SC-8 / EC-6: unknown sid (hash never registered under phi)
    ///         reverts with ProductDoesNotExist(phi, h).
    function test_redeemProduct_revertsForUnknownSid() public {
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);

        bytes memory unknownSid = bytes("never-registered-sid");
        bytes32 h = _hashSid(unknownSid);

        vm.expectRevert(abi.encodeWithSelector(ProductDoesNotExist.selector, PHI_DEFAULT, h));
        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, unknownSid);
    }

    /// @notice EC-8: redeemProduct on a phi that doesn't exist reverts.
    function test_redeemProduct_revertsForUnknownProject() public {
        bytes32 phiUnknown = keccak256("nope");
        vm.expectRevert(abi.encodeWithSelector(ProjectDoesNotExist.selector, phiUnknown));
        vm.prank(consumer);
        registry.redeemProduct(phiUnknown, SID_DEFAULT);
    }

    /// @notice SR4 (EC-9): submitting redeemProduct with a sid whose hash is
    ///         not in products[phi] (i.e., a rogue hub trying to fabricate
    ///         AUTHENTIC) reverts with ProductDoesNotExist. The contract
    ///         recomputes the hash internally; the caller cannot lie.
    function test_redeemProduct_hubCannotFakeHash() public {
        _seedProductForRedeem(PHI_DEFAULT, bytes("real-sid"), producer);

        bytes memory fakeSid = bytes("forged-sid");
        bytes32 fakeHash = _hashSid(fakeSid);

        vm.expectRevert(abi.encodeWithSelector(ProductDoesNotExist.selector, PHI_DEFAULT, fakeHash));
        vm.prank(hub); // even from a "trusted" hub address
        registry.redeemProduct(PHI_DEFAULT, fakeSid);
    }
}
