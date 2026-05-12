# Feature F7 — Static Analysis & Property Tests (cross-cutting)

**Module:** `contracts/test/`, `contracts/slither.config.json`, CI workflows
**Priority:** P0
**Depends on:** F1
**Paper section:** SR1–SR4 (lines 244–283), §3 defensive list in `repo_requirements.md`.

---

## Purpose

Automated, CI-enforced quality gates for the smart contract that demonstrate to Reviewer 1:

- The implementation is well-tested (≥ 90% line coverage).
- Common Solidity vulnerabilities are absent (Slither static analysis, 0 high-severity findings).
- The four security requirements SR1–SR4 from the paper are formally encoded as Foundry property tests (invariants).

This is the central piece of "defensive coverage" — if a reviewer reads the test suite, they should be convinced the paper's claims hold in the code.

---

## User stories

- **US-SA-1.** As a **reviewer**, I want to read `contracts/test/properties/SR1_Unforgeability.t.sol` and see fuzz-driven assertions that no PPT adversary can forge a valid sid → so I trust SR1.
- **US-SA-2.** As a **reviewer**, I want to read `contracts/test/properties/SR2_NonReplayability.t.sol` and see assertions that any sid can be redeemed at most once → so I trust SR2.
- **US-SA-3.** As a **reviewer**, I want to read `contracts/test/properties/SR3_NonRepudiation.t.sol` and see that every successful `redeemProduct` produces a `ProductRedeemed` event with `block.timestamp` → so I trust SR3.
- **US-SA-4.** As a **reviewer**, I want to read `contracts/test/properties/SR4_TrustIndependence.t.sol` and see that arbitrary external `redeemProduct` calls cannot fabricate `AUTHENTIC` outcomes → so I trust SR4.
- **US-SA-5.** As a **reviewer**, I want CI to run Slither on every push and PR and fail if a high-severity finding is introduced.
- **US-SA-6.** As a **reviewer**, I want a coverage badge in the README pointing to the latest CI report.
- **US-SA-7.** As a **reviewer**, I want a `docs/SECURITY_ANALYSIS.md` that maps each SR to the test file:line that proves it.

---

## Detailed requirements

### Test layout

```
contracts/
  test/
    unit/
      RegisterProject.t.sol           # AC-SC-1, AC-SC-2
      RegisterBatch.t.sol             # AC-SC-3..AC-SC-5
      RedeemProduct.t.sol             # AC-SC-6..AC-SC-8
      VerifyProduct.t.sol             # AC-SC-9, AC-SC-10
      ProjectExists.t.sol             # AC-SC-11
      Hashing.t.sol                   # AC-SC-12 (sha256 vs keccak)
    properties/
      SR1_Unforgeability.t.sol
      SR2_NonReplayability.t.sol
      SR3_NonRepudiation.t.sol
      SR4_TrustIndependence.t.sol
    invariants/
      RegistryInvariants.t.sol        # invariant testing harness
    fixtures/
      ProductRegistryFixture.sol      # shared deploy + helpers
    gas/
      GasSnapshots.t.sol              # AC-SC-20
```

### Property test specifics

**`SR1_Unforgeability.t.sol`**

```solidity
// For all (phi, sid) where sid is freshly generated and never registered,
// redeemProduct(phi, sid) MUST revert with ProductDoesNotExist.
function testFuzz_SR1_UnregisteredSidAlwaysReverts(bytes32 phi, bytes calldata sid) public {
  vm.assume(sid.length > 0 && sid.length < 1024);
  registry.registerProject(phi);
  // sid never registered for phi
  vm.expectRevert(ProductDoesNotExist.selector);
  registry.redeemProduct(phi, sid);
}
```

**`SR2_NonReplayability.t.sol`**

```solidity
// For all (phi, sid) registered, the second redeemProduct call MUST revert.
function testFuzz_SR2_SecondRedeemReverts(bytes32 phi, bytes calldata sid) public {
  vm.assume(sid.length > 0 && sid.length < 1024);
  registry.registerProject(phi);
  bytes32 h = sha256(sid);
  bytes32[] memory hashes = new bytes32[](1);
  hashes[0] = h;
  registry.registerBatch(phi, hashes);
  registry.redeemProduct(phi, sid);
  vm.expectRevert(ProductAlreadyRedeemed.selector);
  registry.redeemProduct(phi, sid);
}
```

**`SR3_NonRepudiation.t.sol`**

```solidity
// Every successful redeemProduct emits ProductRedeemed with correct args + block.timestamp.
function testFuzz_SR3_EventEmittedWithTimestamp(bytes32 phi, bytes calldata sid) public {
  vm.assume(sid.length > 0 && sid.length < 1024);
  registry.registerProject(phi);
  bytes32 h = sha256(sid);
  bytes32[] memory hashes = new bytes32[](1);
  hashes[0] = h;
  registry.registerBatch(phi, hashes);
  vm.expectEmit(true, true, true, true);
  emit ProductRedeemed(phi, h, address(this), block.timestamp);
  registry.redeemProduct(phi, sid);
}
```

**`SR4_TrustIndependence.t.sol`**

```solidity
// A malicious caller cannot fabricate AUTHENTIC by submitting a sid whose hash isn't on-chain.
// (Confirms hub cannot lie.)
function testFuzz_SR4_HubCannotFabricate(
  bytes32 phi,
  bytes calldata sid,
  bytes calldata fakeSid
) public {
  vm.assume(sid.length > 0 && sha256(sid) != sha256(fakeSid));
  registry.registerProject(phi);
  bytes32 h = sha256(sid);
  bytes32[] memory hashes = new bytes32[](1);
  hashes[0] = h;
  registry.registerBatch(phi, hashes);
  // Hub-impersonator submits fakeSid expecting AUTHENTIC
  vm.expectRevert(ProductDoesNotExist.selector);
  registry.redeemProduct(phi, fakeSid);
}
```

**`RegistryInvariants.t.sol`**

```solidity
// Stateful invariant: total redeemed count never decreases.
function invariant_RedeemedCountMonotonic() public {
  assertGe(registry.totalRedeemed(), lastSnapshotRedeemed);
  lastSnapshotRedeemed = registry.totalRedeemed();
}
```

(Note: `totalRedeemed()` would be added as a `view` function specifically for invariant testing — must be specified in F1.)

### Slither config (`contracts/slither.config.json`)

```json
{
  "detectors_to_exclude": "naming-convention,solc-version,pragma",
  "filter_paths": "lib,test",
  "exclude_low": true,
  "exclude_informational": true,
  "json": "slither-report.json"
}
```

CI step:

```yaml
- name: Slither
  uses: crytic/slither-action@v0.4
  with:
    target: contracts/
    fail-on: high
    slither-config: contracts/slither.config.json
```

Any **high** finding fails CI. Mediums are reviewed manually; documented allowlist in `slither.config.json` if accepted as false-positive.

### Coverage

- `forge coverage --report lcov` → uploaded to Codecov via CI.
- README badge.
- Threshold: 90% lines for `contracts/src/`, fail PR if below.

### Hardhat tests (complementary)

- Use Hardhat for end-to-end deploy + JS-side integration (e.g., ethers.js calling the deployed contract).
- ~10 Hardhat tests covering deployment + happy paths.
- Foundry is the primary test runner (faster, fuzz/property-friendly).

### Gas snapshot (`forge snapshot`)

- `forge snapshot` produces `.gas-snapshot` file committed to repo.
- CI compares current run vs snapshot; fails if any test's gas changes by > 5% (catches accidental regressions).
- Documented in `docs/SECURITY_ANALYSIS.md`.

---

## Edge cases (test-author-facing)

| #       | Scenario                                       | Expected behavior                                     |
| ------- | ---------------------------------------------- | ----------------------------------------------------- |
| EC-SA-1 | Fuzz hits same `phi` twice                     | `vm.assume(!registry.projectExists(phi))` early skip  |
| EC-SA-2 | Fuzz with empty `sid`                          | Allow; covers EC-SC-12 from contract spec             |
| EC-SA-3 | Test runtime > 5 min                           | Reduce fuzz runs in CI (`forge test --fuzz-runs 256`) |
| EC-SA-4 | Coverage tool can't instrument inline assembly | Acceptable; document in slither.config                |

---

## Acceptance criteria

| #        | Criterion                                                                                | Maps to         | Verified by        |
| -------- | ---------------------------------------------------------------------------------------- | --------------- | ------------------ |
| AC-SA-1  | `forge test` runs all unit + property tests; all green                                   | quality         | CI                 |
| AC-SA-2  | Property test for SR1 — fuzz N=1000+, all pass                                           | SR1             | CI                 |
| AC-SA-3  | Property test for SR2 — fuzz N=1000+, all pass                                           | SR2             | CI                 |
| AC-SA-4  | Property test for SR3 — fuzz N=1000+, all pass                                           | SR3             | CI                 |
| AC-SA-5  | Property test for SR4 — fuzz N=1000+, all pass                                           | SR4             | CI                 |
| AC-SA-6  | Stateful invariant test runs ≥ 256 sequences without violation                           | quality         | CI                 |
| AC-SA-7  | `slither contracts/` — 0 high-severity findings                                          | §3 defensive    | CI                 |
| AC-SA-8  | `forge coverage` reports ≥ 90% lines on `contracts/src/`                                 | §3 defensive    | CI                 |
| AC-SA-9  | `forge snapshot` matches committed `.gas-snapshot` (or PR has explicit update)           | quality         | CI                 |
| AC-SA-10 | `docs/SECURITY_ANALYSIS.md` table maps each SR1–SR4 to the test file:line that proves it | reproducibility | Manual review      |
| AC-SA-11 | Coverage badge in README links to live CI report                                         | UX              | Manual             |
| AC-SA-12 | Slither report (JSON) committed to `results/slither/<commit>/` for archival              | reproducibility | CI artifact upload |

---

## Non-goals

- Mythril (deferred to v2).
- Echidna fuzzing campaigns (deferred).
- Formal verification with Certora (deferred).
- Frontend coverage (handled per-app in respective specs).
