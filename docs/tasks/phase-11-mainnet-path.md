# Phase 11 — Mainnet Path (code only, NOT executed)

**Goal:** Mainnet deploy code path exists, dry-runnable against Hardhat. Documented in MAINNET_DEPLOY.md. Author does NOT execute mainnet deploy in v1.
**Effort:** ~0.5 day (1 ticket).
**Prerequisites:** Phase 1 + Phase 9.

---

### T-046 — Deploy.s.sol + Verify.s.sol + production env templates

**Phase:** 11 · **Feature:** F14 · **Effort:** S

**Description.** Foundry deploy + verify scripts for mainnet, parameterized by env. Production env templates for hub. NOT executed in v1.

**Files to create/modify:**

- `contracts/script/Deploy.s.sol` — finalize with mainnet branch (already drafted in T-009; complete here)
- `contracts/script/Verify.s.sol` — Polygonscan verification helper using `forge verify-contract`
- `apps/coordination-hub/.env.production.example` — production env template (mongo Atlas, Pinata production, mainnet RPC, KMS-prep notes)
- `apps/coordination-hub/.env.testnet.example` — Amoy-specific template
- `docs/MAINNET_DEPLOY.md` — finalize with concrete commands + balance checks

**Acceptance criteria refs:** AC-MN-1, AC-MN-2, AC-MN-3, AC-MN-4, AC-MN-5
**ADRs:** ADR-004 (KMS for production), ADR-008 (immutable contract; rollback = redeploy)
**Depends on:** T-042.
**Definition of Done:**

- [ ] `forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key $TEST_PK` deploys to local Hardhat (proves code works).
- [ ] `forge script Deploy.s.sol --rpc-url $RPC_URL_MAINNET --simulate` simulates without broadcasting (dry-run).
- [ ] `MAINNET_DEPLOY.md` has step-by-step + commands + balance checks (≥ 5 MATIC required) + Polygonscan verification.
- [ ] `MAINNET_DEPLOY.md` lists production env vars: every var in `.env.production.example`.
- [ ] `.env.production.example` calls out KMS migration (path documented, not implemented).
- [ ] No real mainnet private key in repo; gitleaks confirms.
- [ ] Final reminder in README: "v1 has not been deployed to Polygon mainnet by the authors".
