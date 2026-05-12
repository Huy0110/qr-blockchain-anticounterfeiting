// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";

/// @title ProjectExists view tests — covers AC-SC-11.
contract ProjectExistsTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    function test_projectExists_falseWhenNotRegistered() public view {
        assertFalse(registry.projectExists(keccak256("missing")));
    }

    function test_projectExists_trueAfterRegister() public {
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);
        assertTrue(registry.projectExists(PHI_DEFAULT));
    }

    function test_projectExists_independentOfBatch() public {
        // Project exists before any batch is registered.
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);
        assertTrue(registry.projectExists(PHI_DEFAULT));

        // And remains true after a batch is added.
        bytes32[] memory hashes = _singleHash(_hashSid(SID_DEFAULT));
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);
        assertTrue(registry.projectExists(PHI_DEFAULT));
    }
}
