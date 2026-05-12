# Implementation Sequencing

Top-down dependency-respecting order for `/04-create-tasks` and `/05-implement`. Each phase has scope, deliverables, exit criteria, and rough effort.

> **Note on effort:** estimates assume single full-time AI-assisted developer. Used to inform prioritization, NOT a deadline. User dropped the 3-day deadline in `/01-gather-requirements`.

---

## Phase 0 — Bootstrap

**Scope:**

- Initialize repo at `/Users/phamduchuy/Desktop/a-paper/journal_1/qr-blockchain-anticounterfeiting/`.
- `git init`; first commit empty + `.gitignore`.
- pnpm workspace setup: `pnpm-workspace.yaml`, root `package.json`.
- Foundry init in `contracts/`: `forge init --no-git`.
- Hardhat init in `contracts/`: `pnpm add hardhat @nomicfoundation/hardhat-toolbox`.
- Lint/format/commit infrastructure: `eslint`, `prettier`, `solhint`, `commitlint`, `husky`, `gitleaks` config.
- Root `.editorconfig`, `.nvmrc` (Node 20).
- Push initial commit to GitHub `Huy0110/qr-blockchain-anticounterfeiting`.

**Deliverables:**

- Empty workspaces with all configs.
- `pnpm install` succeeds.
- Husky pre-commit hooks installed.

**Exit criteria:**

- `pnpm install` clean.
- `pnpm format` and `pnpm lint` pass on empty repo.
- First commit pushed; GitHub repo public, MIT license, README placeholder.

**Effort:** ~0.5 day.

---

## Phase 1 — Smart Contract (F1) + Tests (F7)

**Scope:**

- Implement `contracts/src/ProductRegistry.sol` per [smart-contract.md](features/smart-contract.md).
- Storage, 5 functions, 3 events, custom errors, NatSpec.
- Foundry unit tests: `RegisterProject.t.sol`, `RegisterBatch.t.sol`, `RedeemProduct.t.sol`, `VerifyProduct.t.sol`, `ProjectExists.t.sol`, `Hashing.t.sol`.
- Foundry property tests: `SR1_Unforgeability.t.sol`, `SR2_NonReplayability.t.sol`, `SR3_NonRepudiation.t.sol`, `SR4_TrustIndependence.t.sol`.
- Foundry invariant test harness.
- Hardhat E2E deploy test.
- Slither config + run locally; fix any high-severity findings.
- `forge coverage` to verify ≥ 90%.
- `forge snapshot` baseline.

**Deliverables:**

- `contracts/` fully working.
- All Phase 1 acceptance criteria from F1 + F7 met locally.

**Exit criteria:**

- `forge test` green.
- `forge coverage` ≥ 90%.
- `slither contracts/` 0 high-severity.
- `forge snapshot` committed.

**Effort:** ~3 days.

---

## Phase 2 — Shared Package (F2)

**Scope:**

- `packages/shared/`: types, hashing helper, ABI export script, paper notation aliases.
- `tsup` build config; ESM + CJS + d.ts outputs.
- Unit tests (Vitest) including cross-check that `hashSid()` matches Solidity `sha256()` output.

**Deliverables:**

- `@qr-bc/shared` consumable by other workspaces.

**Exit criteria:**

- `pnpm --filter @qr-bc/shared build` succeeds.
- `pnpm --filter @qr-bc/shared test` green.
- Hash cross-check test passes.

**Effort:** ~0.5 day.

---

## Phase 3 — Coordination Hub (F3)

**Scope:**

- NestJS scaffolding under `apps/coordination-hub/`.
- ConfigModule (env validation).
- Auth module: register, login, JWT guard.
- Producers module: profile, wallet creation + encryption.
- Projects module: CRUD with ownership check.
- Cultivation activities sub-resource.
- Certifications + image upload to IPFS (multer + ipfs-http-client / Pinata SDK).
- Blockchain module: ethers provider, contract service, wallet service (decrypt + sign).
- Scan module: public + private endpoints with on-chain pre-check.
- Observability: `/health`, `/metrics`, structured Pino logging.
- Swagger setup at `/api/docs`.
- Mongoose schemas + indexes.
- Seed script for 3 demo HTX rau projects.
- Integration tests (Vitest + supertest, against in-memory Mongo + Hardhat node).

**Deliverables:**

- Hub fully functional.

**Exit criteria:**

- All ~20 endpoints documented in Swagger.
- Integration test coverage ≥ 70%.
- AC-CH-1..AC-CH-20 met locally.
- `pnpm seed` populates demo data idempotently.

**Effort:** ~5 days.

---

## Phase 4 — Consumer dApp (F4)

**Scope:**

- Next.js 14 LTS scaffolding under `apps/dapp-portal/` with `output: 'export'`.
- App router with `[locale]` segment.
- Public scan page (`/projects/[projectId]`).
- Private scan page (`/scan/[projectId]/[secretId]`).
- Optional camera scanner (`/scanner`).
- About page with CID + repo + DOI.
- i18n (next-intl with locale folders, NOT middleware — incompatible with static export).
- Tailwind + shadcn/ui setup.
- Mobile-first responsive design.
- TanStack Query for hub calls.
- Playwright E2E covering 3 main flows.
- Lighthouse CI config.
- Build + static export tested via `npx http-server out`.

**Deliverables:**

- dApp ready to pin to IPFS.

**Exit criteria:**

- AC-DA-1..AC-DA-17 met.
- Static export builds without errors.
- Lighthouse mobile perf ≥ 85, a11y ≥ 90.

**Effort:** ~3.5 days.

---

## Phase 5 — Management Portal (F5)

**Scope:**

- Next.js 14 LTS scaffolding under `apps/management-portal/` (regular SSR/SSG, NOT static export).
- NextAuth credentials provider talking to hub.
- App router routes per [management-portal.md](features/management-portal.md).
- shadcn/ui forms, tables, dialogs, wizard.
- Batch generation wizard (4 steps + progress).
- Verification log analytics (chart + table).
- i18n (default vi).
- Playwright E2E.

**Deliverables:**

- Portal fully functional.

**Exit criteria:**

- AC-MP-1..AC-MP-17 met.
- Lighthouse perf ≥ 80, a11y ≥ 90 on dashboard.

**Effort:** ~3.5 days.

---

## Phase 6 — Experiments (F6)

**Scope:**

- `experiments/lib/runner.ts` shared utilities.
- `experiments/perf-registration/`, `experiments/perf-verification/`, `experiments/cost-analysis/`, `experiments/adversarial/`.
- `pnpm exp:all` umbrella + SUMMARY.md generator.
- Pre-computed sample results committed under `results/example-RUN_ID/`.

**Deliverables:**

- All scripts runnable; sample results in repo.

**Exit criteria:**

- AC-EX-1..AC-EX-14 met.
- `pnpm exp:all --network=hardhat` completes < 10 min in CI.

**Effort:** ~1.5 days.

---

## Phase 7 — Docker Compose (F8)

**Scope:**

- Top-level `docker-compose.yml` with services: mongo, ipfs, hardhat, contracts-deployer, coordination-hub, management-portal, dapp-portal.
- Profiles: default, testnet, prod.
- Per-service Dockerfiles (node:20-bookworm-slim).
- Healthchecks + dependencies.

**Deliverables:**

- `docker compose up` brings full stack up.

**Exit criteria:**

- AC-DO-1..AC-DO-7 met.

**Effort:** ~1 day.

---

## Phase 8 — CI Workflows (F9)

**Scope:**

- `.github/workflows/contracts-ci.yml`
- `.github/workflows/apps-ci.yml`
- `.github/workflows/release.yml`
- `.github/workflows/gitleaks.yml`
- `.github/workflows/commitlint.yml`
- Codecov integration; badges in README.
- Pinata + Zenodo secrets configured in GitHub repo settings (secrets only, not in code).

**Deliverables:**

- All workflows green on a no-op PR.

**Exit criteria:**

- AC-CI-1..AC-CI-10 met (most via dry run; AC-CI-6 deferred to Phase 10 release).

**Effort:** ~1.5 days.

---

## Phase 9 — Documentation Suite (F10)

**Scope:**

- Root `README.md` with quickstart, badges, architecture diagram, citation block.
- `docs/ARCHITECTURE.md` with C4 diagrams.
- `docs/THREAT_MODEL.md` (verbatim paper §3.2).
- `docs/SECURITY_ANALYSIS.md` (SR → function → test:line table).
- `docs/REPRODUCIBILITY.md` (paper Tables → commands).
- `docs/MAINNET_DEPLOY.md` (optional path).
- `docs/CONTRIBUTING.md`.
- `docs/THIRD_PARTY.md` (auto-generated license inventory).

**Deliverables:**

- Docs render correctly on GitHub.

**Exit criteria:**

- AC-DOC-1..AC-DOC-9 met.
- Link checker passes.

**Effort:** ~1.5 days.

---

## Phase 10 — Branding + Seed Data + Citation (F11 + F12 + F13)

**Scope:**

- Generate logo SVG (programmatic / hand-tweaked via Inkscape).
- Place in both apps' `public/`.
- Translation files VI + EN, key parity verified.
- Demo seed data committed; `pnpm seed` works.
- `LICENSE`, `CITATION.cff`, `.zenodo.json`, `CHANGELOG.md` v1.0.0 entry.

**Deliverables:**

- Branding consistent; seed data demos work; citation files validate.

**Exit criteria:**

- AC-BR-1..AC-BR-7, AC-SD-1..AC-SD-5, AC-CT-1..AC-CT-6 met.

**Effort:** ~1 day.

---

## Phase 11 — Mainnet Path (F14, code only)

**Scope:**

- `contracts/script/Deploy.s.sol` parameterized by env.
- `contracts/script/Verify.s.sol` for Polygonscan verification.
- `apps/coordination-hub/.env.production.example`.
- `docs/MAINNET_DEPLOY.md` complete.

**Deliverables:**

- Code path exists; runnable against Hardhat as dry-run; mainnet deploy NOT executed.

**Exit criteria:**

- AC-MN-1..AC-MN-5 met.

**Effort:** ~0.5 day.

---

## Phase 12 — Release v1.0.0

**Scope:**

- Test tag `v0.0.1-test`: validate `release.yml` end-to-end on a sandbox Zenodo deposit.
- Resolve any issues.
- Tag `v1.0.0`.
- Verify Pinata pin succeeds, CID recorded.
- Verify Zenodo DOI minted.
- Post-release PR: update `CITATION.cff` with DOI, update README badge, update `apps/dapp-portal/.env` with `NEXT_PUBLIC_PAPER_DOI` + `NEXT_PUBLIC_BUILD_CID`.
- Update paper `frontiers.tex` (lines 767, 849) with real GitHub URL + DOI.
- Open PR on paper repo for advisor review.

**Deliverables:**

- Public DOI available; paper footnotes ready for resubmission.

**Exit criteria:**

- DOI resolvable.
- Paper PDF rebuilt with DOI text.

**Effort:** ~0.5 day.

---

## Total estimated effort

| Phase                          | Effort       |
| ------------------------------ | ------------ |
| 0. Bootstrap                   | 0.5          |
| 1. Smart Contract + Tests      | 3            |
| 2. Shared Package              | 0.5          |
| 3. Coordination Hub            | 5            |
| 4. Consumer dApp               | 3.5          |
| 5. Management Portal           | 3.5          |
| 6. Experiments                 | 1.5          |
| 7. Docker Compose              | 1            |
| 8. CI Workflows                | 1.5          |
| 9. Docs                        | 1.5          |
| 10. Branding + Seed + Citation | 1            |
| 11. Mainnet Path               | 0.5          |
| 12. Release                    | 0.5          |
| **Total**                      | **~23 days** |

> Realistic Option-C scope per gathered requirements §6: 3–4 weeks elapsed, full-time AI-assisted. Matches estimate above.

---

## Critical path

`Phase 0 → Phase 1 → Phase 2 → Phase 3 → (Phase 4 || Phase 5) → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12`

Phases 4 and 5 can be parallelized (share dependency on Phases 2 + 3); reduces wall-clock by ~3 days if two developers, or by ~1 day with AI-assisted parallelism.

---

## Key dependencies graph

```
Bootstrap ──► Smart Contract ──► Shared Package ──┬──► Coordination Hub ──┬──► Consumer dApp
                    │                              │                       └──► Management Portal
                    │                              └──► Experiments
                    │
                    └──► Tests/Slither (continuous, runs alongside)

All P0 features ──► Docker Compose ──► CI ──► Docs ──► Branding ──► Mainnet path ──► Release
```
