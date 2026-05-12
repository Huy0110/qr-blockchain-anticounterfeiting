# Product Requirements Document

**Project:** `qr-blockchain-anticounterfeiting`
**Version:** v1.0 (target tag for Zenodo DOI)
**Date:** 2026-05-05
**Source:** [gathered-requirements.md](gathered-requirements.md)
**Paper:** _A Dual-QR Blockchain-Based Authentication Mechanism for Agricultural Anti-Counterfeiting_, Frontiers in Blockchain (under revision).
**Companion docs:** [requirements/](requirements/)

---

## 1. Product Overview

### Product name

`qr-blockchain-anticounterfeiting` — a public, citable, reproducible reference implementation of the dual-QR + blockchain anti-counterfeiting system described in the paper. To be tagged `v1.0.0` and archived on Zenodo to obtain a DOI for citation.

### Problem statement

The Frontiers Associate Editor's blocking ask (2026-05-04) is open-access code with a DOI. Without it, the paper cannot proceed to publication. Reviewer 1 — already strict — may inspect or run the code as part of the next review round; the repo must therefore be functional, documented, and auditable end-to-end on a clean machine. Vegetable supply chains in Vietnam need a low-cost anti-counterfeit mechanism; the implementation must demonstrate that the paper's claims (latency ≈5–30 s, registration cost ≈$0.001, post-purchase verification, SR1–SR4) are reproducible.

### Target users

| User                                 | Need                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Reviewer / academic auditor**      | Clone, run, regenerate paper Tables 3–4, audit smart contract logic against §7.1, verify SR1–SR4 hold. |
| **Vegetable cooperative (producer)** | Register projects, log cultivation activities, batch-generate QR codes, deploy on testnet for pilot.   |
| **End consumer**                     | Scan public QR for traceability, scan private QR (post-purchase) for authenticity.                     |
| **Lab / future researchers**         | Fork as starting point for blockchain-based supply-chain extensions.                                   |

### Success metrics

| Metric                                   | Target                                                                | Maps to                    |
| ---------------------------------------- | --------------------------------------------------------------------- | -------------------------- |
| Public DOI minted on Zenodo              | DOI returned by Zenodo on tag push                                    | Editor's blocking ask      |
| Repo builds + tests pass on clean CI     | All 3 GitHub Actions workflows green on `main`                        | §3 defensive vs Reviewer 1 |
| Smart contract coverage                  | ≥ 90% lines                                                           | §3 defensive               |
| Slither static analysis                  | 0 high-severity findings (medium documented)                          | §3 defensive               |
| SR1–SR4 property tests                   | 100% pass                                                             | Paper §3.4                 |
| Registration latency reproduces          | Mean within ±20% of paper Table 3 (~5 s for 100 IDs)                  | Paper Table 3              |
| Verification latency reproduces          | Mean within ±20% of paper Table 3 (~30 s valid, ~4 s invalid)         | Paper Table 3              |
| Per-tx cost on Amoy                      | Within order-of-magnitude of paper Table 4 (~$0.001)                  | Paper Table 4              |
| `docker compose up` brings up full stack | Hub + Mongo + IPFS + Hardhat node reachable in < 60 s                 | Reproducibility            |
| README quickstart                        | A reviewer reaches first successful private-QR redemption in < 15 min | Reproducibility            |

---

## 2. User Roles & Permissions

### Role definitions

| Role                               | Authentication                                                                                | Scope of action                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Anonymous Consumer**             | None                                                                                          | Read-only `GET /scan/public/:phi`; trigger `POST /scan/private` with `(phi, sid)`.                                                |
| **Producer**                       | Email + password + JWT (Coordination Hub). System-managed Polygon wallet (encrypted at rest). | CRUD own project metadata; trigger batch QR generation + on-chain `registerProject` and `registerBatch` via hub.                  |
| **Reviewer / Admin (self-served)** | Same as Producer; just self-registers a test account                                          | Identical capabilities to a Producer. No god-mode admin in v1.                                                                    |
| **Coordination Hub `I`**           | Internal service. Holds system hot wallet (testnet) for `redeemProduct` submissions.          | Forward `redeemProduct` transactions on behalf of consumers; cannot fabricate `AUTHENTIC` outcomes (smart contract enforces SR4). |
| **CI / Automation**                | GitHub Actions OIDC                                                                           | Run tests, deploy to Amoy on merge, publish Zenodo on tag.                                                                        |

### Permission matrix

| Action                          | Anonymous      | Producer (own project)                     | Producer (other's project) | Hub `I`         |
| ------------------------------- | -------------- | ------------------------------------------ | -------------------------- | --------------- |
| Browse public project metadata  | ✓              | ✓                                          | ✓                          | n/a             |
| Submit private QR scan          | ✓              | ✓                                          | ✓                          | proxies anyone  |
| Create project (off-chain)      | ✗              | ✓                                          | ✗                          | ✗               |
| Edit project metadata           | ✗              | ✓                                          | ✗                          | ✗               |
| Delete project metadata         | ✗              | ✓ (soft delete)                            | ✗                          | ✗               |
| Call `registerProject` on-chain | ✗              | ✓ (own wallet)                             | ✗                          | ✗               |
| Call `registerBatch` on-chain   | ✗              | ✓ (own wallet, contract enforces `addr_P`) | ✗ (contract reverts)       | ✗               |
| Call `redeemProduct` on-chain   | via hub        | via hub                                    | via hub                    | ✓ (any phi/sid) |
| Read on-chain state             | ✓ (RPC public) | ✓                                          | ✓                          | ✓               |

---

## 3. Feature Summary

| ID  | Feature                                                                                                      | Module                                        | Priority | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------- | ---------- |
| F1  | `ProductRegistry.sol` smart contract (5 functions, SHA-256, immutable)                                       | `contracts/`                                  | **P0**   | —          |
| F2  | Shared TypeScript package (ABI, types, hashing)                                                              | `packages/shared/`                            | **P0**   | F1         |
| F3  | Coordination Hub: auth, project CRUD, scan endpoints, hot wallet                                             | `apps/coordination-hub/`                      | **P0**   | F1, F2     |
| F4  | Consumer dApp (public + private scan, mobile-first, i18n VI/EN)                                              | `apps/dapp-portal/`                           | **P0**   | F2, F3     |
| F5  | Management Portal (producer login, project CRUD, batch QR gen)                                               | `apps/management-portal/`                     | **P0**   | F2, F3     |
| F6  | Reproducibility experiments (registration, verification, cost, adversarial)                                  | `experiments/`                                | **P0**   | F1, F3     |
| F7  | Smart contract static analysis + property tests (Slither, Foundry SR tests)                                  | `contracts/test/` + CI                        | **P0**   | F1         |
| F8  | Docker Compose stack (hub, Mongo, IPFS local, Hardhat node)                                                  | `docker-compose.yml`                          | **P0**   | F3         |
| F9  | GitHub Actions CI (contracts, apps, release-to-Zenodo)                                                       | `.github/workflows/`                          | **P0**   | F1–F8      |
| F10 | Documentation suite (README, ARCHITECTURE, THREAT_MODEL, SECURITY_ANALYSIS, REPRODUCIBILITY, MAINNET_DEPLOY) | `docs/`                                       | **P0**   | F1–F9      |
| F11 | Branding & i18n (logo SVG icon QR + lá rau, VI/EN locale files)                                              | `apps/*/locales/`, `apps/*/public/logo.svg`   | **P1**   | F4, F5     |
| F12 | Demo seed data (3 vegetable cooperatives)                                                                    | `apps/coordination-hub/seed/`                 | **P1**   | F3         |
| F13 | `CITATION.cff`, `LICENSE`, `.zenodo.json`, `CHANGELOG.md`                                                    | repo root                                     | **P0**   | —          |
| F14 | Mainnet deploy code path + docs (NOT executed)                                                               | `contracts/script/`, `docs/MAINNET_DEPLOY.md` | **P2**   | F1         |

### Dependency map

```
F1 ──────────────► F2 ──────────► F3 ──┬──► F4
                                       └──► F5
F1 ──────────────► F7
F3 ──────────────► F6
F1, F3, F4, F5 ──► F8 ──► F9 ──► F10 ──► F13
F4, F5 ──────────► F11
F3 ──────────────► F12
F1 ──────────────► F14
```

---

## 4. MVP Scope

### Included (v1.0)

- **Full functional system**: smart contract + 3 apps + experiments + docs.
- **Multi-tenant**: multiple producers can share one deployment.
- **i18n**: Vietnamese + English on both portals.
- **Static analysis**: Slither in CI.
- **Property tests**: 5–10 Foundry tests covering SR1–SR4 invariants.
- **Statistical performance**: N=30 trials for registration + verification metrics.
- **One adversarial script**: forge unknown sid + replay redeemed sid + unauthorized batch.
- **Docker Compose**: full local stack in one command.
- **Demo seed**: 3 HTX rau (Vân Nội, Tân Đức, Củ Chi).
- **Logo**: simple SVG (icon QR + lá rau).
- **Mainnet code path**: code exists, gated behind `NETWORK=mainnet`, but NOT executed by author.

### Explicitly excluded (deferred to v2 / future)

| Excluded                                               | Why                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Mythril deep symbolic execution                        | Slither covers most reachable findings; Mythril adds days of CI tuning for marginal benefit.          |
| Foundry fuzz tests (`forge fuzz`)                      | Property tests already encode the same invariants; fuzz adds CI flakiness without new coverage in v1. |
| Centralized SQL-only baseline                          | User explicitly cut (gathered-req §6).                                                                |
| Comparative blockchain baseline (single-QR vs dual-QR) | Out of scope per user; v2 if Reviewer 1 still demands.                                                |
| k6 / Locust stress test (1k req/s)                     | Workload curve for §3 defensive but not on critical path; v2.                                         |
| The Graph subgraph                                     | Direct RPC sufficient for paper-scale data; v2 when > 100k events.                                    |
| AWS KMS wallet for hub                                 | Documented in MAINNET_DEPLOY.md; not implemented.                                                     |
| Mobile native apps                                     | dApp is mobile-first responsive; native is overkill.                                                  |
| Custom domain                                          | `ipfs.io/ipfs/<CID>` is enough for paper citation.                                                    |
| Actual mainnet deployment by author                    | User has no MATIC; reviewer reproducibility uses Amoy testnet.                                        |
| ORCID in CITATION.cff                                  | User has none; left blank, fillable later.                                                            |

---

## 5. Non-Functional Requirements

Detailed in [requirements/non-functional.md](requirements/non-functional.md). Summary:

### Performance targets (matched to paper Table 3)

- Batch registration of 100 IDs: ≤ 6 s (paper: ~5 s).
- Public QR scan end-to-end: ≤ 6 s (paper: ~5 s).
- Private QR scan, valid product: ≤ 35 s on Amoy (paper: ~30 s on Polygon mainnet — may differ).
- Private QR scan, invalid/redeemed: ≤ 5 s (paper: ~4 s).
- Coordination Hub p95 latency for read-only endpoints: ≤ 200 ms.

### Security

- All smart contract state-changing functions have access control modifiers.
- `redeemProduct` computes hash on-chain (never trusts client).
- No secrets in repo; `.env.example` only.
- `gitleaks` scan in CI.
- HTTPS-only for any deployed hub.
- JWT secrets must be rotated on each deployment (env var).

### Scalability

- `registerBatch` cap N ≤ 500 to stay under Polygon block gas limit.
- MongoDB indexed on `projectId`, `ownerProducerId`.
- Contract reads served via RPC; rate-limited by RPC provider (out of scope to optimize).

### Accessibility

- Consumer dApp: WCAG 2.1 AA on color contrast, font scaling, alt text on QR images.
- Mobile-first responsive; tested on iOS Safari + Android Chrome.
- Keyboard navigable on management portal.

### Reproducibility (Q1-grade requirement)

- One-command bring-up via `docker compose up`.
- Each experiment script logs deterministic `RUN_ID` and outputs CSV + plot under `results/<RUN_ID>/`.
- Pinned dependencies (`pnpm-lock.yaml`, `foundry.toml`, `Cargo.lock` if any).
- Reproducer reaches first successful private QR redemption in ≤ 15 min following README.

### Quality bars

- Solidity: ≥ 90% line coverage; 0 Slither high-severity findings.
- TS apps: ≥ 70% line coverage; 0 ESLint errors.
- Conventional Commits enforced via commitlint + husky pre-commit.

---

## 6. Risk register (summary — full at [requirements/risk-register.md](requirements/risk-register.md))

Top risks:

1. **R-001 — Reviewer 1 inspects code, finds smart contract gap.** Mitigation: ≥ 90% coverage, Slither, NatSpec mapping every function to paper Algorithm + line, property tests for SR1–SR4.
2. **R-002 — Reproducer cannot run on first try.** Mitigation: Docker Compose, README quickstart tested on clean machine, CI runs the same quickstart in matrix.
3. **R-003 — Performance numbers diverge from paper Table 3.** Mitigation: experiments script measures + reports; Discussion in `docs/REPRODUCIBILITY.md` explains testnet-vs-mainnet variance.
4. **R-004 — Polygon Amoy testnet downtime.** Mitigation: Hardhat in-process node fallback (`NETWORK=hardhat`).
5. **R-005 — Secret leaked to public repo.** Mitigation: `gitleaks` CI scan + pre-commit hook + `.gitignore`.

---

## 7. Sequencing (full plan at [requirements/sequencing.md](requirements/sequencing.md))

Top-down dependency-respecting order:

1. **Bootstrap** — repo init, pnpm workspace, Hardhat + Foundry init, lint/format/commit hooks.
2. **F1 — Smart contract** (`ProductRegistry.sol` + unit tests + property tests for SR1–SR4 + Slither).
3. **F2 — Shared package** (ABI export, types, SHA-256 helper).
4. **F3 — Coordination Hub** (NestJS skeleton → auth → project CRUD → wallet management → scan endpoints).
5. **F4 — Consumer dApp** (Next.js scaffolding → public scan page → private scan page → i18n → IPFS export).
6. **F5 — Management Portal** (login → project CRUD → cultivation log → batch generator → QR download).
7. **F6 — Experiments** (registration perf, verification perf, cost, adversarial).
8. **F8 — Docker Compose** (hub + Mongo + IPFS local + Hardhat node).
9. **F9 — CI workflows** (contracts-ci, apps-ci, release).
10. **F10 — Docs** (README + ARCHITECTURE + THREAT_MODEL + SECURITY_ANALYSIS + REPRODUCIBILITY + MAINNET_DEPLOY).
11. **F11 + F12 — Branding + Seed data**.
12. **F13 — Citation + License + Zenodo metadata**.
13. **F14 — Mainnet path** (code only, not executed).
14. **Release** — tag `v1.0.0`, push GitHub, trigger Zenodo, mint DOI, update paper footnotes.

---

## 8. Detailed feature specs

Each feature has a dedicated spec under `docs/requirements/features/`:

- [smart-contract.md](requirements/features/smart-contract.md) — F1 + F7
- [shared-package.md](requirements/features/shared-package.md) — F2
- [coordination-hub.md](requirements/features/coordination-hub.md) — F3
- [dapp-portal.md](requirements/features/dapp-portal.md) — F4
- [management-portal.md](requirements/features/management-portal.md) — F5
- [experiments.md](requirements/features/experiments.md) — F6
- [static-analysis-and-tests.md](requirements/features/static-analysis-and-tests.md) — F7 (cross-cutting)
- [devops.md](requirements/features/devops.md) — F8 + F9
- [docs-and-branding.md](requirements/features/docs-and-branding.md) — F10 + F11 + F12 + F13 + F14

Cross-cutting docs:

- [user-stories.md](requirements/user-stories.md) — all stories consolidated.
- [non-functional.md](requirements/non-functional.md) — perf, security, scalability detail.
- [glossary.md](requirements/glossary.md) — paper notation, blockchain & agriculture terms.
- [risk-register.md](requirements/risk-register.md) — defensive risks vs Reviewer 1.
- [sequencing.md](requirements/sequencing.md) — implementation order with effort estimates.
- [sr-mapping.md](requirements/sr-mapping.md) — SR1–SR4 + R1–R3 → acceptance criteria traceability matrix.

Index at [requirements/README.md](requirements/README.md).

---

## 9. Hand-off to `/03-design-architecture`

This PRD captures the WHAT. Next skill produces the HOW: directory layout, module boundaries, REST contract for hub, ABI exposed by shared package, deployment topology, sequence diagrams for the 3 algorithms, decision log (Hardhat-vs-Foundry split, NestJS module structure, Next.js routing).
