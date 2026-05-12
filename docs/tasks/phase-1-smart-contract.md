# Phase 1 — Smart Contract `ProductRegistry.sol` + Tests

**Goal:** A production-ready Solidity contract with ≥ 90% coverage, zero high-severity Slither findings, property tests for SR1–SR4 with ≥ 1000 fuzz runs, and gas snapshots committed.
**Effort:** ~3 days total (6 tickets).
**Prerequisites:** Phase 0 complete.

---

### T-005 — Contract skeleton: storage + errors + events

**Phase:** 1 · **Feature:** F1 · **Effort:** M

**Description.** Lay down `ProductRegistry.sol` with storage layout, custom errors, events, and constants. No function bodies yet — just the surface.

**Files to create/modify:**

- `contracts/src/ProductRegistry.sol` — pragma 0.8.24, storage mappings, MAX_BATCH_SIZE = 500, NatSpec on every external function (referencing paper Algorithm + line)
- `contracts/src/errors/Errors.sol` — extracted custom errors: `ProjectAlreadyExists`, `ProjectDoesNotExist`, `UnauthorizedProducer`, `BatchTooLarge`, `EmptyBatch`, `DuplicateProductHash`, `ProductDoesNotExist`, `ProductAlreadyRedeemed`
- `contracts/src/interfaces/IProductRegistry.sol` — interface for external consumers
- `contracts/test/fixtures/ProductRegistryFixture.sol` — Foundry test fixture (deploy + helpers)

**Acceptance criteria refs:** AC-SC-13 (NatSpec)
**ADRs:** ADR-007 (SHA-256), ADR-008 (immutable contract)
**SR/R mapping:** SR1, SR2, SR3, SR4 (foundation)
**Depends on:** T-003.
**Definition of Done:**

- [ ] `forge build` compiles without warnings.
- [ ] All 5 external functions declared with full NatSpec (`@notice`, `@dev`, `@param`, `@return`, `@custom:security`, paper Algorithm + line ref).
- [ ] Storage layout documented in NatSpec at contract top.
- [ ] Constants (`MAX_BATCH_SIZE = 500`) declared.
- [ ] All custom errors defined.
- [ ] All 3 events declared with `indexed` topics per [features/smart-contract.md](../requirements/features/smart-contract.md#events).
- [ ] Solhint passes (`pnpm --filter @qr-bc/contracts lint`).

---

### T-006 — Implement `registerProject` + `registerBatch`

**Phase:** 1 · **Feature:** F1 · **Effort:** M

**Description.** Producer-side functions. `registerProject` binds `msg.sender` as producer; `registerBatch` enforces ownership + uniqueness + batch cap.

**Files to create/modify:**

- `contracts/src/ProductRegistry.sol` — implement `registerProject` and `registerBatch` bodies
- `contracts/test/unit/RegisterProject.t.sol` — Hardhat-style tests for happy + revert paths
- `contracts/test/unit/RegisterBatch.t.sol` — happy, unauthorized, N=0, N=501, duplicate hash

**Acceptance criteria refs:** AC-SC-1, AC-SC-2, AC-SC-3, AC-SC-4, AC-SC-5
**ADRs:** ADR-008
**SR/R mapping:** SR1 (uniqueness, authorization), SR3 (events emitted)
**Depends on:** T-005.
**Definition of Done:**

- [ ] `forge test --match-contract RegisterProject` passes (≥ 5 tests).
- [ ] `forge test --match-contract RegisterBatch` passes (≥ 7 tests).
- [ ] `registerBatch(N=501)` reverts with `BatchTooLarge(501)`.
- [ ] `registerBatch` from non-producer reverts with `UnauthorizedProducer(phi, caller)`.
- [ ] Each function emits its event (verified via `vm.expectEmit`).
- [ ] No custom error fires from happy path.

---

### T-007 — Implement `redeemProduct` + view functions

**Phase:** 1 · **Feature:** F1 · **Effort:** M

**Description.** Consumer-side function (called via hub) plus the two read-only view functions. `redeemProduct` MUST compute `sha256(sid)` internally — never trust client.

**Files to create/modify:**

- `contracts/src/ProductRegistry.sol` — implement `redeemProduct`, `verifyProduct`, `projectExists`
- `contracts/test/unit/RedeemProduct.t.sol` — happy + 3 revert paths (no project, no product, already redeemed)
- `contracts/test/unit/VerifyProduct.t.sol` — view tests
- `contracts/test/unit/ProjectExists.t.sol` — view tests
- `contracts/test/unit/Hashing.t.sol` — proves `sha256()` precompile is used (selector 0x02), NOT `keccak256`

**Acceptance criteria refs:** AC-SC-6, AC-SC-7, AC-SC-8, AC-SC-9, AC-SC-10, AC-SC-11, AC-SC-12
**ADRs:** ADR-007 (SHA-256), ADR-014 (any caller can redeem; system wallet pays gas)
**SR/R mapping:** SR1 (no forge), SR2 (atomic redeem-once), SR3 (event emitted with timestamp), SR4 (hash computed internally — hub can't lie)
**Depends on:** T-006.
**Definition of Done:**

- [ ] `forge test --match-contract RedeemProduct` passes (≥ 5 tests).
- [ ] `forge test --match-contract VerifyProduct` passes.
- [ ] `forge test --match-contract ProjectExists` passes.
- [ ] `forge test --match-contract Hashing` passes — bytecode disassembly confirms `sha256` precompile call (opcode `0x02`).
- [ ] `redeemProduct` recomputes `sha256(sid)` internally; cannot be bypassed by client.
- [ ] `ProductRedeemed` event emitted with `block.timestamp`.

---

### T-008 — Foundry property tests for SR1–SR4

**Phase:** 1 · **Feature:** F7 · **Effort:** M

**Description.** Encode the four paper security requirements as Foundry property tests with high fuzz-runs. Reviewer-grade.

**Files to create/modify:**

- `contracts/test/properties/SR1_Unforgeability.t.sol` — fuzz: ∀ unregistered sid → revert
- `contracts/test/properties/SR2_NonReplayability.t.sol` — fuzz: second redeem always reverts
- `contracts/test/properties/SR3_NonRepudiation.t.sol` — fuzz: every successful redeem emits `ProductRedeemed(phi, h, producer, block.timestamp)`
- `contracts/test/properties/SR4_TrustIndependence.t.sol` — fuzz: hub-impersonator with mismatched `(phi, sid)` always reverts
- `contracts/test/invariants/RegistryInvariants.t.sol` — stateful: total redeemed count monotonic; redeemed product never un-redeems

**Acceptance criteria refs:** AC-SA-2, AC-SA-3, AC-SA-4, AC-SA-5, AC-SA-6, AC-SC-16, AC-SC-17, AC-SC-18, AC-SC-19
**ADRs:** ADR-007, ADR-008
**SR/R mapping:** SR1, SR2, SR3, SR4 (the four pillars)
**Depends on:** T-007.
**Definition of Done:**

- [ ] All 4 property test files pass with `--fuzz-runs 1000`.
- [ ] `forge test --match-contract Invariants` runs ≥ 256 sequences without violation.
- [ ] Each property test has a NatSpec comment quoting the paper SR statement (verbatim).
- [ ] CI configured to run with `--fuzz-runs 1000` (slower; full reviewer rigor).

---

### T-009 — Hardhat E2E + deploy script

**Phase:** 1 · **Feature:** F1 · **Effort:** S

**Description.** JS-side integration test exercising the full ABI surface from ethers.js. Plus deploy script for both Hardhat and Foundry paths.

**Files to create/modify:**

- `contracts/test/hardhat/ProductRegistry.spec.ts` — deploy + register + batch + redeem flow via ethers.js
- `contracts/script/Deploy.s.sol` — Foundry deploy script with network detection
- `contracts/deploy/01_deploy_product_registry.ts` — Hardhat deploy script (alt path)
- `contracts/scripts/write-address.ts` — writes deployed address to `out/address.<network>.json` (consumed by hub)

**Acceptance criteria refs:** AC-CT-3 (mainnet path code exists, dry-runnable)
**ADRs:** ADR-001
**Depends on:** T-007.
**Definition of Done:**

- [ ] `npx hardhat test` passes (≥ 3 E2E specs).
- [ ] `forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key <test>` deploys successfully on local Hardhat node.
- [ ] `out/address.local.json` written after deploy.
- [ ] Both deploy paths produce identical bytecode (verified via build artifact diff).

---

### T-010 — Slither + coverage + gas snapshot CI gates

**Phase:** 1 · **Feature:** F7 · **Effort:** M

**Description.** Lock in the static analysis + coverage + gas regression gates that must hold for every PR.

**Files to create/modify:**

- `contracts/slither.config.json` — exclude rules per [features/static-analysis-and-tests.md §Slither config](../requirements/features/static-analysis-and-tests.md#slither-config-contractsslitherconfigjson)
- `contracts/.gas-snapshot` — initial gas baselines committed
- `contracts/scripts/check-coverage.ts` — fails build if line coverage < 90%
- `contracts/test/gas/GasSnapshots.t.sol` — gas snapshots for each external function

**Acceptance criteria refs:** AC-SC-14, AC-SC-15, AC-SC-20, AC-SA-7, AC-SA-8, AC-SA-9, AC-SA-12
**ADRs:** ADR-001
**SR/R mapping:** §3 defensive (Reviewer 1 mitigation)
**Depends on:** T-008.
**Definition of Done:**

- [ ] `slither contracts/` outputs 0 high-severity findings (medium documented in `slither.config.json` allowlist if accepted).
- [ ] `forge coverage --report lcov` ≥ 90% lines on `src/`.
- [ ] `forge snapshot --check` passes against committed `.gas-snapshot`.
- [ ] `registerBatch(N=100)` gas use < 30M (well under Polygon block limit).
- [ ] Script output (Slither + coverage) archived to `results/slither/<commit>/` for reproducibility.
