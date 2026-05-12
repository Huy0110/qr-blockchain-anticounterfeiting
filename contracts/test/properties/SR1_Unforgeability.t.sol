// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProductDoesNotExist, ProjectDoesNotExist} from "../../src/errors/Errors.sol";

/// @title SR1 — Unforgeability property test.
/// @notice Paper SR1 (verbatim, lines 244-256):
///         "No probabilistic polynomial-time adversary can produce a secret
///          identifier sid* such that redeemProduct(phi, sid*) succeeds for
///          a phi the adversary did not register a corresponding product
///          hash under."
///
///         Encoded operationally: for any caller A and any sid never
///         registered under phi via registerBatch, redeemProduct(phi, sid)
///         MUST revert. The contract's state-transition function is a sound
///         (over)approximation of the cryptographic claim because the only
///         way to make redeem succeed is to have previously called
///         registerBatch with sha256(sid) — which requires being the
///         producer (SR1's authorization side, exercised separately).
contract SR1_UnforgeabilityTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice ∀ (phi, sid). After registerProject(phi) but with sid never
    ///         registered for phi, redeemProduct(phi, sid) reverts with
    ///         ProductDoesNotExist(phi, sha256(sid)).
    /// @dev Bounded sid length so the fuzzer doesn't waste time on
    ///      multi-MB calldata; coverage of the property is identical at
    ///      any nonzero length.
    function testFuzz_SR1_UnregisteredSidAlwaysReverts(bytes32 phi, bytes calldata sid) public {
        // Empty sid IS in scope (EC-12: sha256("") is well-defined). The only
        // reason for the upper bound is to keep the fuzzer from spending its
        // budget on multi-MB calldata; the property is identical at any length.
        vm.assume(sid.length < 1024);

        vm.prank(producer);
        registry.registerProject(phi);

        bytes32 h = sha256(sid);
        vm.expectRevert(abi.encodeWithSelector(ProductDoesNotExist.selector, phi, h));
        vm.prank(consumer);
        registry.redeemProduct(phi, sid);
    }

    /// @notice ∀ (phi, sid). With phi NEVER registered, redeem reverts at the
    ///         project-existence check (not even reaching the hash lookup).
    function testFuzz_SR1_UnknownProjectAlwaysReverts(bytes32 phi, bytes calldata sid) public {
        vm.assume(sid.length < 1024);

        vm.expectRevert(abi.encodeWithSelector(ProjectDoesNotExist.selector, phi));
        vm.prank(consumer);
        registry.redeemProduct(phi, sid);
    }
}
