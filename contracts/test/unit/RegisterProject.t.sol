// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProjectAlreadyExists} from "../../src/errors/Errors.sol";
import {IProductRegistry} from "../../src/interfaces/IProductRegistry.sol";

/// @title RegisterProject unit tests — covers AC-SC-1, AC-SC-2.
contract RegisterProjectTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice AC-SC-1: registerProject emits ProjectCreated and binds msg.sender.
    function test_registerProject_emitsEvent_andBindsProducer() public {
        vm.expectEmit(true, true, false, false, address(registry));
        emit IProductRegistry.ProjectCreated(PHI_DEFAULT, producer);

        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);

        // verifyProduct returns the producerAddress in slot 3 even when h is absent.
        (, , address recordedProducer) = registry.verifyProduct(PHI_DEFAULT, bytes32(0));
        assertEq(recordedProducer, producer, "producerAddress not bound");
        assertTrue(registry.projectExists(PHI_DEFAULT), "projectExists false after register");
    }

    /// @notice AC-SC-2: a second registerProject for the same phi reverts.
    function test_registerProject_revertsOnDuplicate() public {
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);

        vm.expectRevert(abi.encodeWithSelector(ProjectAlreadyExists.selector, PHI_DEFAULT));
        vm.prank(otherProducer);
        registry.registerProject(PHI_DEFAULT);
    }

    /// @notice Producers can register multiple distinct phis from the same wallet.
    function test_registerProject_sameProducerMultipleProjects() public {
        bytes32 phi1 = keccak256("phi:1");
        bytes32 phi2 = keccak256("phi:2");

        vm.startPrank(producer);
        registry.registerProject(phi1);
        registry.registerProject(phi2);
        vm.stopPrank();

        assertTrue(registry.projectExists(phi1));
        assertTrue(registry.projectExists(phi2));
    }

    /// @notice Different producers can hold different projects (no global collision).
    function test_registerProject_distinctProducersDistinctProjects() public {
        bytes32 phiA = keccak256("phi:A");
        bytes32 phiB = keccak256("phi:B");

        vm.prank(producer);
        registry.registerProject(phiA);

        vm.prank(otherProducer);
        registry.registerProject(phiB);

        (, , address producerA) = registry.verifyProduct(phiA, bytes32(0));
        (, , address producerB) = registry.verifyProduct(phiB, bytes32(0));
        assertEq(producerA, producer);
        assertEq(producerB, otherProducer);
    }

    /// @notice projectExists returns false for a never-registered phi.
    function test_projectExists_falseBeforeRegister() public view {
        assertFalse(registry.projectExists(keccak256("never-registered")));
    }
}
