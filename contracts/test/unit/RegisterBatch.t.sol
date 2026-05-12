// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProjectDoesNotExist, UnauthorizedProducer, BatchTooLarge, EmptyBatch, DuplicateProductHash} from "../../src/errors/Errors.sol";
import {IProductRegistry} from "../../src/interfaces/IProductRegistry.sol";

/// @title RegisterBatch unit tests — covers AC-SC-3, AC-SC-4, AC-SC-5.
contract RegisterBatchTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);
    }

    /// @notice Happy path: a small batch is accepted; ProductsRegistered fires
    ///         with the correct count; verifyProduct shows each entry as exists+!redeemed.
    function test_registerBatch_happyPath_emitsEvent_andStores() public {
        bytes32[] memory hashes = new bytes32[](3);
        hashes[0] = sha256(bytes("sid-1"));
        hashes[1] = sha256(bytes("sid-2"));
        hashes[2] = sha256(bytes("sid-3"));

        vm.expectEmit(true, false, false, true, address(registry));
        emit IProductRegistry.ProductsRegistered(PHI_DEFAULT, 3);

        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        for (uint256 i = 0; i < 3; ++i) {
            (bool exists, bool redeemed, address recordedProducer) = registry.verifyProduct(PHI_DEFAULT, hashes[i]);
            assertTrue(exists, "hash not stored");
            assertFalse(redeemed, "hash should not be redeemed yet");
            assertEq(recordedProducer, producer, "producer mismatch");
        }
    }

    /// @notice AC-SC-3: registerBatch from an address other than the bound
    ///         producer reverts with UnauthorizedProducer.
    function test_registerBatch_revertsForNonProducer() public {
        bytes32[] memory hashes = _singleHash(sha256(bytes("sid")));

        vm.expectRevert(abi.encodeWithSelector(UnauthorizedProducer.selector, PHI_DEFAULT, otherProducer));
        vm.prank(otherProducer);
        registry.registerBatch(PHI_DEFAULT, hashes);
    }

    /// @notice registerBatch on a phi that was never registered reverts.
    function test_registerBatch_revertsForUnknownProject() public {
        bytes32 phiUnknown = keccak256("unknown");
        bytes32[] memory hashes = _singleHash(sha256(bytes("sid")));

        vm.expectRevert(abi.encodeWithSelector(ProjectDoesNotExist.selector, phiUnknown));
        vm.prank(producer);
        registry.registerBatch(phiUnknown, hashes);
    }

    /// @notice EC-3: empty batch reverts with EmptyBatch().
    function test_registerBatch_revertsOnEmptyBatch() public {
        bytes32[] memory empty = new bytes32[](0);
        vm.expectRevert(EmptyBatch.selector);
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, empty);
    }

    /// @notice AC-SC-4: N=501 reverts with BatchTooLarge(501).
    function test_registerBatch_revertsWhenSize501() public {
        bytes32[] memory hashes = new bytes32[](501);
        for (uint256 i = 0; i < 501; ++i) {
            hashes[i] = sha256(abi.encodePacked("sid-", i));
        }

        vm.expectRevert(abi.encodeWithSelector(BatchTooLarge.selector, uint256(501)));
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);
    }

    /// @notice Boundary: N=500 (MAX_BATCH_SIZE) is accepted.
    function test_registerBatch_acceptsAtMaxBatchSize() public {
        bytes32[] memory hashes = new bytes32[](500);
        for (uint256 i = 0; i < 500; ++i) {
            hashes[i] = sha256(abi.encodePacked("sid-max-", i));
        }
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        // Spot check: first and last entries stored.
        (bool firstExists, , ) = registry.verifyProduct(PHI_DEFAULT, hashes[0]);
        (bool lastExists, , ) = registry.verifyProduct(PHI_DEFAULT, hashes[499]);
        assertTrue(firstExists);
        assertTrue(lastExists);
    }

    /// @notice AC-SC-5 / EC-5: a hash that already exists in products[phi] (from
    ///         a prior batch) reverts the entire batch with DuplicateProductHash.
    function test_registerBatch_revertsOnCrossBatchDuplicate() public {
        bytes32 h1 = sha256(bytes("sid-x"));

        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, _singleHash(h1));

        // Now try to register the same hash again across a separate batch.
        bytes32[] memory dup = _singleHash(h1);
        vm.expectRevert(abi.encodeWithSelector(DuplicateProductHash.selector, PHI_DEFAULT, h1));
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, dup);
    }

    /// @notice EC-5: a duplicate hash within the SAME batch reverts the whole tx.
    function test_registerBatch_revertsOnIntraBatchDuplicate() public {
        bytes32 h = sha256(bytes("dup-sid"));
        bytes32[] memory hashes = new bytes32[](2);
        hashes[0] = h;
        hashes[1] = h;

        vm.expectRevert(abi.encodeWithSelector(DuplicateProductHash.selector, PHI_DEFAULT, h));
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        // Confirm whole-batch atomicity: hash[0] was NOT persisted.
        (bool exists, , ) = registry.verifyProduct(PHI_DEFAULT, h);
        assertFalse(exists, "intra-batch duplicate left a partial write");
    }
}
