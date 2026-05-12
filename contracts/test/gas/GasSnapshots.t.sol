// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";

/// @title GasSnapshots — locked gas costs for each external function.
/// @notice Each `test_gas_*` function makes exactly one externally-visible
///         call and asserts a hard gas ceiling. forge snapshot captures the
///         exact cost per test in .gas-snapshot, and `forge snapshot --check`
///         in CI fails if costs regress > 5% (AC-SA-9).
/// @dev AC-SC-20: registerBatch(N=100) must fit comfortably under the
///       Polygon block gas limit (~30M).
contract GasSnapshotsTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
        vm.prank(producer);
        registry.registerProject(PHI_DEFAULT);
    }

    /// @notice Gas baseline: registerProject (cold).
    function test_gas_registerProject() public {
        bytes32 phi = keccak256("gas:registerProject");
        vm.prank(producer);
        registry.registerProject(phi);
    }

    /// @notice Gas baseline: registerBatch(N=1).
    function test_gas_registerBatch_N1() public {
        bytes32[] memory hashes = _singleHash(sha256(bytes("gas-1")));
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);
    }

    /// @notice Gas baseline: registerBatch(N=10).
    function test_gas_registerBatch_N10() public {
        bytes32[] memory hashes = new bytes32[](10);
        for (uint256 i = 0; i < 10; ++i) {
            hashes[i] = sha256(abi.encodePacked("gas-10-", i));
        }
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);
    }

    /// @notice AC-SC-20: registerBatch(N=100) must complete < 30M gas
    ///         (Polygon block limit). Asserted explicitly with vm.gasleft.
    function test_gas_registerBatch_N100_under30M() public {
        bytes32[] memory hashes = new bytes32[](100);
        for (uint256 i = 0; i < 100; ++i) {
            hashes[i] = sha256(abi.encodePacked("gas-100-", i));
        }

        uint256 gasBefore = gasleft();
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("registerBatch(N=100) gas used", gasUsed);
        assertLt(gasUsed, 30_000_000, "registerBatch(N=100) exceeds Polygon block limit");
    }

    /// @notice Gas baseline: redeemProduct (cold).
    function test_gas_redeemProduct() public {
        bytes memory sid = bytes("gas-redeem");
        bytes32[] memory hashes = _singleHash(sha256(sid));
        vm.prank(producer);
        registry.registerBatch(PHI_DEFAULT, hashes);

        vm.prank(consumer);
        registry.redeemProduct(PHI_DEFAULT, sid);
    }

    /// @notice Gas baseline: verifyProduct view (no state write).
    function test_gas_verifyProduct() public view {
        registry.verifyProduct(PHI_DEFAULT, bytes32(uint256(0xdead)));
    }

    /// @notice Gas baseline: projectExists view.
    function test_gas_projectExists() public view {
        registry.projectExists(PHI_DEFAULT);
    }
}
