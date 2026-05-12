// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";

/// @title VerifyProduct view tests — covers AC-SC-9, AC-SC-10.
contract VerifyProductTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice AC-SC-9: returns the zero-tuple for an absent (phi, h) pair.
    function test_verifyProduct_zeroTupleWhenAbsent() public view {
        (bool exists, bool redeemed, address producerAddr) = registry.verifyProduct(
            keccak256("phi:absent"),
            bytes32(uint256(1))
        );
        assertFalse(exists);
        assertFalse(redeemed);
        assertEq(producerAddr, address(0));
    }

    /// @notice After registerBatch, exists=true, redeemed=false, producer set.
    function test_verifyProduct_afterRegisterBatch() public {
        bytes32 h = _hashSid(SID_DEFAULT);
        _seedProductForRedeem(PHI_DEFAULT, SID_DEFAULT, producer);

        (bool exists, bool redeemed, address producerAddr) = registry.verifyProduct(PHI_DEFAULT, h);
        assertTrue(exists);
        assertFalse(redeemed);
        assertEq(producerAddr, producer);
    }

    /// @notice AC-SC-10: after redeemProduct, returns (true, true, producer).
    function test_verifyProduct_afterRedeem_returnsRedeemedTrue() public {
        bytes32 h = _hashSid(SID_DEFAULT);
        _seedProductForRedeem(PHI_DEFAULT, SID_DEFAULT, producer);

        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, SID_DEFAULT);

        (bool exists, bool redeemed, address producerAddr) = registry.verifyProduct(PHI_DEFAULT, h);
        assertTrue(exists);
        assertTrue(redeemed);
        assertEq(producerAddr, producer);
    }

    /// @notice For a registered project but absent hash, exists=false but
    ///         producer is still returned (so the front-end can render
    ///         project metadata even on an invalid scan).
    function test_verifyProduct_projectExistsButHashAbsent() public {
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);

        (bool exists, bool redeemed, address producerAddr) = registry.verifyProduct(
            PHI_DEFAULT,
            keccak256("not-registered")
        );
        assertFalse(exists);
        assertFalse(redeemed);
        assertEq(producerAddr, producer);
    }
}
