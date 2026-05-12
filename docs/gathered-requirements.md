# Gathered Requirements — qr-blockchain-anticounterfeiting

**Skill:** `/01-gather-requirements`
**Date:** 2026-05-05
**Next skill:** `/02-create-prd`
**Source spec:** `/Users/phamduchuy/Desktop/a-paper/journal_1/qr_code_new_2026_02/repo_requirements.md`
**Paper:** `/Users/phamduchuy/Desktop/a-paper/journal_1/qr_code_new_2026_02/frontiers.tex`

---

## 1. Product overview

A public, citable, reproducible source-code repository accompanying the paper _"A Dual-QR Blockchain-Based Authentication Mechanism for Agricultural Anti-Counterfeiting"_ (Frontiers in Blockchain). The system implements a dual-QR + blockchain anti-counterfeiting mechanism for agricultural products (specifically vegetables): a public QR for project-level traceability + a concealed private QR (revealed after package opening) for unit-level single-use authentication enforced by a smart contract on Polygon.

**Editor's hard requirement:** code must be open access with a DOI (Zenodo). **Defensive goal:** quality high enough to survive Reviewer 1 inspecting/running the code.

---

## 2. Users & roles

| Role                                                | Description                                                                                                                                      | Authentication                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Producer** ($\mathcal{P}$)                        | Vegetable cooperative that registers projects + product batches, holds Polygon wallet, signs `registerProject` and `registerBatch` transactions. | **Email + password + JWT** in Management Portal. Wallet keys stored encrypted server-side OR mapped to producer account (decision deferred to architecture phase). |
| **Consumer** ($\mathcal{C}$)                        | End user who scans public/private QR via smartphone. No account needed.                                                                          | **None** (anonymous, no wallet required — paper §5.3 trust model).                                                                                                 |
| **Intermediary** ($\mathcal{I}$) — Coordination Hub | Automated server that submits redemption transactions on behalf of consumers. Hot wallet via env var on testnet.                                 | Internal service; uses producer-shared wallet OR system wallet (decision deferred).                                                                                |
| **Reviewer / academic auditor**                     | Anyone who clones the repo to reproduce.                                                                                                         | **No special role** — just self-registers as a producer for testing purposes; can also browse public dApp + Polygonscan read-only.                                 |
| **Adversary** ($\mathcal{A}$) — out-of-band         | PPT attacker per paper §3.2.                                                                                                                     | N/A (modeled in tests, not a runtime role).                                                                                                                        |

**Multi-tenant:** YES. v1 supports multiple producers on a single deployment.

---

## 3. Feature list — by module

### 3.1 `contracts/ProductRegistry.sol` (Solidity smart contract)

- `registerProject(phi)` — bind `msg.sender` as producer; reject duplicate `phi`. Emit `ProjectCreated`.
- `registerBatch(phi, [h_1..h_n])` — only `addr_P`; reject duplicates; cap N ≤ 500 per call. Emit `ProductsRegistered(phi, count)`.
- `redeemProduct(phi, sid)` — internal `h = sha256(sid)`; atomic flip; revert on missing/redeemed. Emit `ProductRedeemed(phi, h, addr_P, timestamp)`.
- `verifyProduct(phi, h) view → (exists, redeemed, addr_P)`.
- `projectExists(phi) view → bool`.
- Hash function: **SHA-256** via Solidity `sha256()` precompile (matches paper §7.1).
- Upgradeability: **immutable** (no proxy pattern in v1).

### 3.2 `apps/coordination-hub/` (NestJS + MongoDB)

REST endpoints (illustrative — finalize in `/03-design-architecture`):

- **Auth:** `POST /auth/register` (producer), `POST /auth/login`, JWT middleware.
- **Project metadata (off-chain):** `POST /projects`, `GET /projects/:phi`, `PATCH /projects/:phi`, `DELETE /projects/:phi`.
- **Public scan:** `GET /scan/public/:phi` — read-only contract `projectExists` + return metadata.
- **Private scan (redemption):** `POST /scan/private` body `{phi, sid}` — submits `redeemProduct` tx via system hot wallet, returns `(outcome, txid, event)`.
- **Producer wallet management:** generate / import wallet, encrypted storage.
- **Health:** `GET /health`, `GET /metrics` (Prometheus-style).

### 3.3 `apps/management-portal/` (Next.js 14 + React 18 + static export)

Producer-facing UI:

- Login / register (email + password).
- Project CRUD (with metadata schema in §5.1).
- Cultivation activity log (CRUD on `cultivationActivities`).
- Certifications upload (PDF, jpg).
- Image upload to IPFS (via hub).
- Batch generation: input `N`, hub generates `sid_i`, signs `registerBatch`, returns N private QR PNGs + 1 public QR PNG.
- QR download as ZIP.
- Project status lifecycle (`in_progress` → `harvesting` → `finished`).

### 3.4 `apps/dapp-portal/` (Next.js 14 + React 18 + static export, mobile-first)

Consumer-facing dApp deployed to IPFS. Routes match paper §5.2:

- `/projects/[projectId]` — public QR landing. Calls hub `GET /scan/public/:phi`. Renders project metadata + image gallery + cultivation activity timeline + certifications + map.
- `/scan/[projectId]/[secretId]` — private QR landing. Calls hub `POST /scan/private`. Shows `AUTHENTIC` (with txid + event details + verification timestamp), `ALREADY_VERIFIED` (with prior txid), or `COUNTERFEIT`.
- Built-in QR scanner using device camera (consumer also browses by direct URL from QR redirect).
- i18n: VI + EN, language toggle.

### 3.5 `experiments/` (TypeScript scripts)

| Folder               | Reproduces                                                                     | Repetitions                                             |
| -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `perf-registration/` | Paper Table 3 row 1 — batch ID gen + on-chain registration                     | N=30                                                    |
| `perf-verification/` | Paper Table 3 rows 2–4 — public scan, private scan valid, private scan invalid | N=30 each                                               |
| `cost-analysis/`     | Paper Table 4 — per-tx cost from real Amoy receipts                            | 1 representative run (cost is deterministic per opcode) |
| `adversarial/`       | 1 basic script: forge unknown sid + replay redeemed sid + unauthorized batch   | N/A — pass/fail                                         |

Each script logs `RUN_ID`, writes CSV + matplotlib (or similar) plot under `results/<RUN_ID>/`, and prints the paper Table/Figure it reproduces.

**Cut from §3 defensive list (deferred to v2):** Mythril, fuzz tests, baseline comparison (centralized SQL — user explicitly cut), comparative blockchain baseline, k6 stress test.

### 3.6 `packages/shared/` (TypeScript)

ABI exports, hashing helper (`sha256`), shared types (`ProjectMetadata`, `CultivationActivity`, `Certification`, `VerificationOutcome`).

### 3.7 Static analysis & tests

- **Slither** (Solidity static analysis) in CI. Mythril deferred.
- **Property tests** (Foundry) — 5–10 tests asserting SR1–SR4 invariants per §3 mapping.
- **Unit tests** (Hardhat + Foundry for contract; Vitest for TS apps).
- Coverage target ≥90% for contract, ≥70% for apps.

### 3.8 CI/CD (`.github/workflows/`)

- `contracts-ci.yml` — build + test + coverage + Slither.
- `apps-ci.yml` — lint + typecheck + Vitest unit tests for hub/portals.
- `release.yml` — git tag → Zenodo deposit.
- All run on push + PR.

### 3.9 Docs (`docs/`)

- `README.md` (root) — quickstart, project overview, citation block.
- `docs/ARCHITECTURE.md` — diagram + component description (mirror paper §7).
- `docs/THREAT_MODEL.md` — verbatim §3.2 (entities, capabilities, SR1–SR4).
- `docs/SECURITY_ANALYSIS.md` — table SR# → contract function → test file:line.
- `docs/REPRODUCIBILITY.md` — step-by-step to regenerate every paper table/figure.
- `docs/MAINNET_DEPLOY.md` — optional path for production (not run by default).
- `CITATION.cff`, `LICENSE` (MIT), `CHANGELOG.md`, `.zenodo.json`.

### 3.10 Branding

- Logo: simple SVG (icon QR + lá rau, generated programmatically). Color scheme: green + white.
- Generated, not user-supplied.

---

## 4. Key business rules

1. **Identifier confidentiality.** `sid_i` is generated by CSPRNG inside the producer's dApp session (or hub on producer's behalf if managed-wallet); never logged, never stored plaintext on-chain. Only `h_i = sha256(sid_i)` goes on-chain.
2. **Single-use enforcement.** Smart contract atomically flips `redeemed` flag; second `redeemProduct` for same `(phi, h)` reverts with `ALREADY_VERIFIED`.
3. **Producer authorization.** `registerBatch` MUST `require(msg.sender == project.producerAddress)`.
4. **Project uniqueness.** `registerProject` reverts if `phi` already exists.
5. **Internal hashing.** `redeemProduct` computes `sha256(sid)` on-chain (NOT trust client-supplied hash) — enforces SR4.
6. **Off-chain integrity.** Project metadata in MongoDB is editable by the owning producer only; reviewers can verify project metadata wasn't substituted by checking that the metadata is rendered by the IPFS-pinned dApp (which is content-addressed).
7. **Multi-tenant isolation.** A producer can only mutate their own projects; project ownership recorded both on-chain (`addr_P`) and off-chain (producer account in MongoDB).
8. **Consumer privacy.** No consumer accounts; no PII stored; private QR scans logged only as on-chain events (which contain only hashed product IDs).
9. **Batch size cap.** `registerBatch` rejects N > 500 to stay under Polygon block gas limit.
10. **Reproducibility default.** All experiments run on Polygon Amoy testnet by default; mainnet gated behind `NETWORK=mainnet` env flag.

---

## 5. Technical constraints

### 5.1 Vegetable project metadata schema (off-chain MongoDB)

```typescript
{
  projectId: string,                          // = phi from contract
  cooperativeName: string,                    // "HTX Rau An Toàn Vân Nội"
  vegetableType: string,                      // "Rau muống", "Cải xanh", "Xà lách"
  cultivationLocation: {
    address: string,
    province: string,
    coordinates?: { lat: number, lng: number }
  },
  startDate: Date,
  harvestDate: Date,
  cultivationArea: number,                    // m²
  expectedOutput: number,                     // kg
  description: string,                        // markdown

  cultivationActivities: [{
    type: 'land_preparation' | 'planting' | 'fertilizing' | 'pest_control' | 'harvesting' | 'other',
    activityDate: Date,
    name: string,
    description: string,
    materials?: string[],
    note?: string
  }],

  certifications: [{
    name: string,                             // "VietGAP", "Organic", "GlobalGAP"
    issuer: string,
    issueDate: Date,
    expiryDate?: Date,
    documentUrl?: string                      // PDF on IPFS
  }],

  imageUrls: string[],                        // IPFS-pinned
  status: 'in_progress' | 'harvesting' | 'finished',
  ownerProducerId: string,                    // FK to producer account
  createdAt: Date,
  updatedAt: Date
}
```

Schema derived from `Agritech-treexuat/BE` (`project.model.js` + `plantFarming.model.js`), simplified to drop IoT/camera/distributer/weather/seed entities (irrelevant to anti-counterfeiting).

### 5.2 Stack (locked)

| Layer            | Choice                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Smart contract   | Solidity, **Hardhat + Foundry**                                             |
| Contract upgrade | Immutable                                                                   |
| Hash             | SHA-256 (`sha256()` precompile)                                             |
| Backend          | **NestJS** + MongoDB (local & Atlas)                                        |
| Frontend         | **Next.js 14 LTS** + React 18, `output: 'export'`, **Tailwind + shadcn/ui** |
| Mobile-first     | Yes (consumer dApp)                                                         |
| i18n             | VI + EN                                                                     |
| Workspace        | **pnpm** workspaces                                                         |
| TS test          | **Vitest**                                                                  |
| Lint             | ESLint + Prettier + Solhint                                                 |
| Commits          | Conventional Commits + commitlint + husky                                   |
| CI               | GitHub Actions                                                              |
| Event indexing   | RPC direct (no The Graph in v1)                                             |
| IPFS             | Local node (docker) + Pinata, switch via `IPFS_PROVIDER`                    |
| Polygon          | Amoy testnet default; mainnet gated by `NETWORK=mainnet`                    |
| Wallet (hub)     | Env-var hot wallet (testnet); KMS path documented for prod                  |
| Docker base      | `node:20-bookworm-slim`                                                     |
| License          | MIT                                                                         |

### 5.3 Reproducibility model

- Reviewer creates own MetaMask, gets free MATIC from Amoy faucet, deploys own contract, pins own dApp to IPFS local/Pinata-free, registers products, scans QR.
- User (paper author) does NOT need to deploy mainnet for the repo to be valid; mainnet is documented as optional.

### 5.4 Repo / git / GitHub setup

- **Code folder:** `/Users/phamduchuy/Desktop/a-paper/journal_1/qr-blockchain-anticounterfeiting/`
- **Separate `.git/`** from the paper repo.
- **GitHub repo name:** `qr-blockchain-anticounterfeiting`
- **GitHub account:** `Huy0110` (personal)
- **Token:** `/Users/phamduchuy/Desktop/a-paper/journal_1/github_token.txt` (line 1 = name, line 2 = value). Already in `.gitignore`. Never echo / commit.

---

## 6. Scope — v1 (Option C, with adjustments) vs deferred

### v1 — IN SCOPE

- Full smart contract `ProductRegistry.sol` (5 functions).
- Slither static analysis report.
- Property tests (Foundry) for SR1–SR4.
- Unit tests for contract + apps.
- 3 apps full-feature: Coordination Hub (NestJS), Management Portal (Next.js), Consumer dApp (Next.js).
- Multi-tenant.
- i18n VI + EN.
- Logo (generated SVG).
- N≥30 statistics for **registration** + **verification** experiments only.
- 1 basic adversarial script (forge unknown sid + replay redeemed sid + unauthorized batch).
- Docker compose (hub + Mongo + IPFS local + Hardhat node).
- GitHub Actions CI (3 workflows).
- Full docs (README, ARCHITECTURE, THREAT_MODEL, SECURITY_ANALYSIS, REPRODUCIBILITY, MAINNET_DEPLOY).
- CITATION.cff, LICENSE (MIT), CHANGELOG, .zenodo.json.
- Demo seed data: 3 vegetable cooperatives.
- Deployable to Polygon mainnet (code path + docs) but NOT actually deployed by author.

### v2 / future — DEFERRED

- Mythril deep symbolic execution.
- Fuzz tests (Foundry `forge fuzz`).
- N≥30 statistics for cost (paper §8.3 numbers are deterministic per opcode anyway).
- Centralized SQL-only baseline comparison (user explicitly cut).
- Comparative blockchain baseline (single-QR vs dual-QR).
- k6 / Locust stress test (1k req/s).
- The Graph subgraph for event indexing.
- AWS KMS wallet management for hub.
- Custom domain.
- Mobile native apps.

---

## 7. Demo seed data

3 vegetable cooperative projects (created by `pnpm db:seed`):

| #   | Cooperative             | Vegetable | Province         | Certification | Notes                       |
| --- | ----------------------- | --------- | ---------------- | ------------- | --------------------------- |
| 1   | HTX Rau An Toàn Vân Nội | Rau muống | Đông Anh, Hà Nội | VietGAP       | Realistic Hanoi cooperative |
| 2   | HTX Tân Đức             | Xà lách   | Đà Lạt, Lâm Đồng | Organic       | Đà Lạt highland vegetables  |
| 3   | HTX Rau Sạch Củ Chi     | Cải xanh  | Củ Chi, TP.HCM   | GlobalGAP     | Southern smallholder model  |

Each seed project includes 5–8 cultivation activities, 1 certification record, 3–5 placeholder images.

---

## 8. Citation & deployment

- **CITATION.cff** authors: Duc Huy Pham, Tuan-Dat Trinh. ORCID: blank for v1 (user OK'd).
- **License:** MIT.
- **DOI flow:** GitHub repo → tag `v1.0.0` → Zenodo auto-deposit → DOI back into `CITATION.cff` + paper footnotes (`frontiers.tex` lines 767, 849 currently say "to be provided upon acceptance").
- **Production deploy:** NOT executed by author. Documented in `docs/MAINNET_DEPLOY.md`. Repo functional 100% on Amoy testnet.
- **Demo URL convention:** `https://ipfs.io/ipfs/<CID>/projects/<projectId>` (no custom domain in v1).

---

## 9. Reference files

- `frontiers.tex` lines 244–283 — formal SR1–SR4 + R1–R3 (drives all tests).
- `frontiers.tex` lines 509–553 — Algorithm 1 (RegisterProducts).
- `frontiers.tex` lines 598–623 — Algorithm 2 (VerifyPublicQR).
- `frontiers.tex` lines 634–689 — Algorithm 3 (VerifyPrivateQR).
- `frontiers.tex` lines 846–872 — Smart contract specification.
- `frontiers.tex` lines 1346–1409 — Notation table (lock variable names).
- `frontiers.tex` lines 875–957 — Experiment §8 (drives `experiments/`).
- `qr_code_new_2026_02/repo_requirements.md` — full source spec.
- `qr_code_new_2026_02/comment_review.txt` — Reviewer 1 strict context.
- Reference DB schema: https://github.com/Agritech-treexuat/BE (cultivation activity model).

---

## 10. Hand-off to `/02-create-prd`

This document captures the WHAT. Next step: `/02-create-prd` should produce a PRD that:

- Translates each feature in §3 into user stories with acceptance criteria.
- Maps each acceptance criterion back to SR1–SR4 + R1–R3 from paper §3.
- Defines success metrics tied to paper Tables 3 + 4.
- Sequences delivery: contracts → shared package → hub → dApp → management portal → experiments → docs → release.
- Identifies risks (especially Reviewer-1-might-inspect-code defensive risks).
- Estimates effort per module (no fixed deadline — user dropped the 3-day deadline question).
