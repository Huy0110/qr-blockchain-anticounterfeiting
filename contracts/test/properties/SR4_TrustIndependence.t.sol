// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ProductRegistryFixture} from "../fixtures/ProductRegistryFixture.sol";
import {ProductDoesNotExist} from "../../src/errors/Errors.sol";

/// @title SR4 — Trust-independence property test.
/// @notice Paper SR4 (verbatim, lines 275-283):
///         "The verification outcome MUST NOT depend on the honesty of the
///          Coordination Hub I or any off-chain party. A malicious hub
///          submitting redeemProduct(phi, sid*) with sid* not previously
///          registered under phi cannot fabricate an AUTHENTIC outcome."
///
///         Encoded operationally: a caller (modelling hub, attacker, or any
///         third party) submitting (phi, fakeSid) where sha256(fakeSid) is
///         not in products[phi] always produces a revert, regardless of
///         what other (phi', sid') pairs are registered.
contract SR4_TrustIndependenceTest is ProductRegistryFixture {
    function setUp() public {
        _deployFixture();
    }

    /// @notice ∀ (phi, sid, fakeSid). With (phi, sid) registered + redeemable
    ///         and fakeSid having a different sha256 hash, a redeem with
    ///         fakeSid (from any caller) reverts with ProductDoesNotExist.
    function testFuzz_SR4_HubCannotFabricateAuthentic(
        bytes32 phi,
        bytes calldata sid,
        bytes calldata fakeSid,
        address attacker
    ) public {
        // Empty sid / fakeSid are in scope (EC-12); the != hash assume below
        // keeps the property well-defined when one side happens to be empty.
        vm.assume(sid.length < 1024);
        vm.assume(fakeSid.length < 1024);
        vm.assume(sha256(sid) != sha256(fakeSid));
        vm.assume(attacker != address(0));

        vm.prank(producer);
        registry.registerProject(phi);

        bytes32 hReal = sha256(sid);
        bytes32[] memory hashes = _singleHash(hReal);
        vm.prank(producer);
        registry.registerBatch(phi, hashes);

        bytes32 hFake = sha256(fakeSid);
        vm.expectRevert(abi.encodeWithSelector(ProductDoesNotExist.selector, phi, hFake));
        vm.prank(attacker);
        registry.redeemProduct(phi, fakeSid);

        // The legitimate (phi, sid) is still redeemable — the attack didn't
        // poison the registry.
        vm.prank(consumer);
        registry.redeemProduct(phi, sid);
        (, bool redeemed, ) = registry.verifyProduct(phi, hReal);
        assertTrue(redeemed, "legitimate redeem must still succeed");
    }
}
