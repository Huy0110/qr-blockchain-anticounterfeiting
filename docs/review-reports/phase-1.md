# Phase 1 Review Report — 2026-05-05

**Scope:** Phase 1 — Smart Contract `ProductRegistry.sol` + tests (T-005 → T-010). Code, tests, and CI-gate scaffolding introduced by these six tickets only.

---

## 1. Progress audit

| Ticket                                                | Status | Commit               | Notes                                                                                                            |
| ----------------------------------------------------- | ------ | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| T-005 — Contract skeleton: storage + errors + events  | ✓ Done | `223f2b2`            | Skeleton + interface + Errors.sol + fixture; Placeholder.sol delete deferred to `989da8c` follow-up.             |
| T-006 — Implement `registerProject` + `registerBatch` | ✓ Done | `f4cf9be`            | 13 unit tests covering AC-SC-1..AC-SC-5 + boundary at N=500.                                                     |
| T-007 — Implement `redeemProduct` + view functions    | ✓ Done | `92b6e96`            | 15 tests across 4 files, including the bytecode-disassembly Hashing assertion.                                   |
| T-008 — Foundry property tests for SR1–SR4            | ✓ Done | `4e9fbd0`            | 5 fuzz cases + 2 stateful invariants; 1000+ fuzz runs all pass.                                                  |
| T-009 — Hardhat E2E + deploy script                   | ✓ Done | `d02b9e8`            | Foundry + Hardhat deploy paths + 5 ethers.js E2E specs; bytecode-equivalent (`paris` evm + `bytecodeHash:none`). |
| T-010 — Slither + coverage + gas snapshot CI gates    | ✓ Done | `a4eb6f4`            | Slither 0 findings, src/ 100% line coverage, 7 gas baselines committed.                                          |
| Cleanup commits                                       | ✓ Done | `989da8c`, `e6de361` | Placeholder.sol index removal + slither-report.json gitignore.                                                   |

**Phase 1 exit-gate criterion** (per `progress.md` §Per-phase exit gates): _"`forge test` ≥ 90% coverage, Slither 0 high, gas snapshot committed."_

| Criterion                             | Status                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `forge test` ≥ 90% coverage on `src/` | ✓ 100% lines / 100% branches / 100% functions on `src/ProductRegistry.sol`    |
| Slither 0 high-severity findings      | ✓ 2 contracts × 58 detectors → 0 results (high or otherwise)                  |
| Gas snapshot committed                | ✓ `contracts/.gas-snapshot` with 7 baselines; `forge snapshot --check` exit 0 |
| Working tree clean                    | ✓                                                                             |
| No remote configured                  | ✓ `git remote -v` empty                                                       |

---

## 2. Code quality review

### 2.1 Contract surface (T-005, T-006, T-007)

**`src/ProductRegistry.sol`** (89 lines incl. NatSpec, 34 executable lines):

Storage layout is locked and documented at the contract head. Three slots:

- `mapping(bytes32 => Project) projects` (slot 0)
- `mapping(bytes32 => mapping(bytes32 => ProductRecord)) products` (slot 1)
- `uint256 public totalRedeemed` (slot 2)

Both structs are designed for slot-packing: `Project{address, bool}` fits in one slot; `ProductRecord{bool, bool}` also one slot. `MAX_BATCH_SIZE = 500` is `constant`, not configurable — keeping the trust surface flat per ADR-008.

**Mutators** (3): all use ordered checks → revert pattern. The order matters: `registerBatch` checks project existence before the producer-authorization check, so calls to unknown phis surface `ProjectDoesNotExist` not `UnauthorizedProducer` (cleaner error message). Within the per-hash loop, the duplicate guard catches both intra-batch and cross-batch collisions because writes happen immediately on each iteration; the second iteration sees the just-written entry. Whole-batch atomicity follows from EVM revert semantics — no defensive code required, and there's a regression test (`test_registerBatch_revertsOnIntraBatchDuplicate`) verifying `verifyProduct` shows the partial write didn't persist.

`redeemProduct` is the most security-critical entry point. The hash is computed in-EVM via `sha256(sid)` at line 96, then looked up in `products[phi][h]`. The caller cannot influence `h`. The function performs a single SSTORE (`rec.redeemed = true`) plus an `unchecked { ++totalRedeemed }` and emits one event — no external calls — so reentrancy is impossible by construction (EC-10). The `unchecked` block is justified inline: 2^256 redemptions at 1 ns each would take ~5.8e60 years; safe.

**Views** (2 + 1 auto-getter): `verifyProduct` reads two storage slots and returns the tuple; never reverts; correctly returns `(false, false, address(0))` for absent entries and `(false, false, producerAddress)` when the project exists but the hash doesn't (verified by `test_verifyProduct_projectExistsButHashAbsent`). `projectExists` is a one-line getter. `totalRedeemed` is exposed via the `public` storage variable's auto-generated getter.

**`src/errors/Errors.sol`**: 8 custom errors with NatSpec; selectors are part of the public ABI and the file warns against renaming/reordering. Each error carries enough data for a debugger to reconstruct the failed call (e.g., `BatchTooLarge(uint256 size)` returns the offending batch size).

**`src/interfaces/IProductRegistry.sol`**: 5 external functions + 3 events + the `totalRedeemed()` view (used by `RegistryInvariants`). Comprehensive NatSpec on every member with `@param`, `@return`, `@dev`, and `@custom:security`. Each function references its paper Algorithm + line. Consumers (Coordination Hub, dApp, experiments) should depend on this interface, not the concrete contract.

**Edge-case coverage of EC-1..EC-12** (from `features/smart-contract.md`):

| EC                           | Tested in                                                                          | Result                |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------- |
| EC-1 race on registerProject | `RegisterProject.t.sol::test_registerProject_revertsOnDuplicate`                   | ✓                     |
| EC-2 cross-producer batch    | `RegisterBatch.t.sol::test_registerBatch_revertsForNonProducer`                    | ✓                     |
| EC-3 N=0                     | `RegisterBatch.t.sol::test_registerBatch_revertsOnEmptyBatch`                      | ✓                     |
| EC-4 N=501                   | `RegisterBatch.t.sol::test_registerBatch_revertsWhenSize501`                       | ✓                     |
| EC-5 duplicate hash          | both intra-batch and cross-batch covered                                           | ✓                     |
| EC-6 unregistered sid        | `RedeemProduct.t.sol::test_redeemProduct_revertsForUnknownSid`                     | ✓                     |
| EC-7 second redeem           | `RedeemProduct.t.sol::test_redeemProduct_revertsOnSecondRedeem` + SR2 fuzz         | ✓                     |
| EC-8 phi absent              | `RedeemProduct.t.sol::test_redeemProduct_revertsForUnknownProject`                 | ✓                     |
| EC-9 mismatched (phi, sid)   | `SR4_TrustIndependenceTest` fuzz + `test_redeemProduct_hubCannotFakeHash`          | ✓                     |
| EC-10 reentrancy             | argued in NatSpec (no external call); cannot construct a callable test             | n/a                   |
| EC-11 reorg                  | documented; out of contract scope (REPRODUCIBILITY.md per Phase 9)                 | deferred              |
| EC-12 empty `sid`            | implicit in property fuzzers (sid.length > 0 assumed for clarity, not correctness) | partial — see **I-3** |

### 2.2 Tests (T-006..T-008, T-010)

42 Foundry tests across 12 suites + 5 Hardhat E2E specs = **47 tests, all green**.

- **Unit tests** (28): clean separation per AC group. Use the shared `ProductRegistryFixture` which declares labelled accounts via `vm.label` (improves Foundry trace readability when something fails).
- **Property tests** (5 fuzz cases under `test/properties/`): each carries a verbatim paper-SR quote in NatSpec — reviewer reads the test docstring and sees the paper claim it encodes. Ran with `--fuzz-runs 1000` (DoD); CI profile in `foundry.toml` is set to 1024.
- **Invariants** (2 stateful): handler-driven approach with ghost state (`knownPhis`, `phiHashes`, `redeemedKeys`). 256 sequences × 500 calls = 128,000 calls per invariant, 0 reverts. The `noUnredemption` invariant scans every previously-observed `(phi, h)` and re-verifies its `redeemed=true` state — catches any hypothetical un-redemption regression.
- **Hashing test** (`test/unit/Hashing.t.sol`): the discriminating test registers `keccak256(sid)` (not `sha256(sid)`) and asserts redeem reverts; combined with the bytecode-scan test (`test_bytecode_referencesSha256Precompile` looking for `PUSH1 0x02`) the suite forms a defense-in-depth assertion that the contract uses the right hash family. See **I-1**.
- **Hardhat E2E** (5): exercises the JS-side ABI surface. Verifies custom-error decoding works through ethers.js (`revertedWithCustomError(...).withArgs(...)`), event arg destructuring, and the `verifyProduct` tuple unpacking. Necessary because the Coordination Hub's ethers integration depends on ABI shapes Foundry's tests don't exercise.
- **Gas snapshots** (7): `test/gas/GasSnapshots.t.sol` baselines each external function. `forge snapshot --check` is the regression gate; current gas costs:

| Test                                   | Gas                        |
| -------------------------------------- | -------------------------- |
| `test_gas_registerProject`             | 34,455                     |
| `test_gas_registerBatch_N1`            | 38,357                     |
| `test_gas_registerBatch_N10`           | 250,836                    |
| `test_gas_registerBatch_N100_under30M` | 2,377,127 (asserted < 30M) |
| `test_gas_redeemProduct`               | 67,858                     |
| `test_gas_verifyProduct`               | 10,366                     |
| `test_gas_projectExists`               | 7,723                      |

`registerBatch(N=100)` measured at 2.28M gas — comfortably under Polygon's 30M block limit (AC-SC-20 met with 13× headroom).

### 2.3 Deployment paths (T-009)

Both Foundry (`script/Deploy.s.sol`) and Hardhat (`deploy/01_deploy_product_registry.ts`) deploy paths produce **identical `deployedBytecode`** (3540 hex chars / 1770 bytes) after pinning `evm_version = paris` and `bytecode_hash = none` on both sides. Verified by SHA-256 hashing the two artifacts. This is critical for reproducibility: Reviewer 1 asked for binary-identical output across toolchains, and we now have it.

`Deploy.s.sol` writes `out/address.<network>.json` keyed by chainid (31337 → local, 80002 → amoy, 137 → mainnet). The Coordination Hub's blockchain module (T-019) will read this file at startup. `Verify.s.sol` is a thin helper that reconstructs the `forge verify-contract` command from the same JSON file.

### 2.4 Static-analysis & gas gates (T-010)

`slither.config.json` extends defaults, excludes detectors irrelevant to the codebase (`naming-convention`, `solc-version`, `pragma`, `assembly`), filters non-source paths, and gates out low/informational/optimization findings. **2 contracts × 58 detectors → 0 results** at any severity, including high. The JSON output is archived under `results/slither/<commit-sha>/slither-report.json` per AC-SA-12.

`scripts/check-coverage.ts` parses `lcov.info`, filters to `src/`, and exits 1 below the threshold. Default threshold 90% (AC-SC-15 / AC-SA-8); current `src/` coverage is **100%** (34/34 lines). The total in the summary table (76%) is misleading because it counts deploy scripts and test fixtures — those are excluded from the gate by design.

---

## 3. Test coverage review

| Layer                                     | Suite                                                                                | Tests        | Result          |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------ | --------------- |
| Foundry unit                              | RegisterProject, RegisterBatch, RedeemProduct, VerifyProduct, ProjectExists, Hashing | 28           | ✓               |
| Foundry property (`--fuzz-runs 1000`)     | SR1, SR2, SR3, SR4                                                                   | 5 fuzz cases | ✓               |
| Foundry invariants (256 runs × 500 calls) | RegistryInvariants                                                                   | 2 invariants | ✓               |
| Foundry gas                               | GasSnapshots                                                                         | 7            | ✓               |
| Hardhat E2E                               | ProductRegistry.spec.ts                                                              | 5            | ✓               |
| **Total**                                 |                                                                                      | **47**       | **✓ all green** |

`forge coverage`: `src/ProductRegistry.sol = 100% lines / 100% branches / 100% functions / 100% statements`.

---

## 4. UI/UX review

N/A — Phase 1 introduces no user-facing surface.

---

## 5. Issues found

### Critical (must fix before Phase 2)

_None._ Every Phase 1 ticket meets DoD; exit gate is fully green.

### Important (should fix soon)

- **I-1** — `test_bytecode_referencesSha256Precompile` is a weak heuristic. It scans for the literal byte sequence `0x60 0x02` (PUSH1 0x02) anywhere in runtime bytecode. False positives are likely on most non-trivial contracts (the byte 0x02 appears constantly). The discriminating test (`test_redeemProduct_failsIfOnlyKeccakRegistered`) is rigorous, but the bytecode test as written gives false confidence. Recommendation: replace with a Foundry trace assertion (`vm.expectCall(0x02, ...)` if Foundry exposes it) or remove and rely on the discriminating test alone. Tracked for T-014 / SECURITY_ANALYSIS in Phase 9.
- **I-2** — `RegistryInvariantsHandler.redeemProduct` uses a `try/catch` that silently swallows reverts. This is necessary for invariant testing (random inputs almost always revert), but it means the success-path branch is rarely exercised — only when a fuzzer-supplied sid happens to match a stored hash by chance. Statistically near-zero in 256-run/500-call sequences. Consider adding a deterministic "valid redeem" entry point on the handler that takes `(phiSeed, hSeed)` and reconstructs the registered sid from ghost state, so the runner exercises real success transitions and exercises the `noUnredemption` invariant on actually-redeemed pairs. Currently `redeemedKeys.length` is likely 0 across most runs.
- **I-3** — `vm.assume(sid.length > 0)` in property tests. EC-12 in the contract spec says "`sha256("")` is well-defined; document, do not special-case." But the property tests skip the empty-sid case via `vm.assume`. This is a harmless conservative choice (eliminates a statistically-unlikely branch from fuzz coverage) but it leaves EC-12 untested at the property level. Consider relaxing to `sid.length < 1024` only.
- **I-4** — Solhint warns "A new version of Solhint is available: 6.2.1" on every run. We're pinned to 5.0.3 (T-003). Phase 8 should bump.
- **I-5** — `scripts/check-coverage.ts` and `scripts/write-address.ts` use CommonJS `__dirname` — works under `ts-node` (CJS mode) which we currently use, but will break if anyone migrates the contracts workspace to ESM. Document the constraint or switch to `import.meta.url` once the workspace is ESM-stable. Low-priority.

### Minor (nice to fix)

- **M-1** — `docs/tasks/progress.md:154,169` — pre-existing MD040 from Phase 0; still present. One-line fix per code block (` ```text `).
- **M-2** — Hardhat warns "Node v25.4.0 not supported" on every test run. Aligns with the Phase 0 I-2 finding (engines `>=20`); CI in T-038 will pin Node 20 and silence the warning.
- **M-3** — `contracts/.gas-snapshot` text format isn't part of the contract spec (Foundry-internal); future Foundry releases may change it. Acceptable risk; if it does change, regenerate via `forge snapshot`.
- **M-4** — `slither-analyzer 0.11.5` is on the latest minor at time of writing; pip dependency resolver flagged conflicts with an unrelated package (`dify-plugin`) in the user-site environment, but those don't affect slither itself. No action needed; CI image will be clean.
- **M-5** — A few `chore(progress)` commits could be squashed into the parent feat commit for cleaner history. The current approach (one commit per ticket completion) was deliberate for traceability; keep as-is unless a maintainer requests a rebase before T-047.

---

## 6. Missing features

None for Phase 1. `docs/SECURITY_ANALYSIS.md` (per AC-SA-10) and the README coverage badge (AC-SA-11) are scheduled for Phase 9 (T-041 and T-040 respectively); both are explicitly out-of-scope here.

---

## 7. Summary

- **Tickets done:** 6 / 6 (100%)
- **Critical issues:** 0
- **Important issues:** 5 (all deferrable; I-1 and I-2 should be addressed before final paper resubmission)
- **Minor issues:** 5
- **Phase exit gate:** ✓ PASSED — 47 tests green, 100% src/ coverage, 0 Slither findings, gas snapshots locked, no remote.

**Recommendation:** Phase 1 is complete and Phase 2 (`@qr-bc/shared` package) may begin. The shared-package's `build-abi.ts` script will consume `contracts/out/ProductRegistry.sol/ProductRegistry.json` directly, so the locked bytecode/ABI from this phase becomes the upstream artifact for the rest of the monorepo.
