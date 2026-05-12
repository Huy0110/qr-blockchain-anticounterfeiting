# Implementation Progress

Live tracker. Tick checkboxes as tickets complete. Definition of Done in each phase file.

> **Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked.

---

## Workflow per phase (MANDATORY)

After completing each phase's tickets, **before moving to next phase**:

1. Verify all phase tickets `[x]` complete + Definition of Done met.
2. Run **`/06-review`** skill — produces `docs/review-report.md` with progress audit, code quality, test coverage, missing features.
3. Resolve all `Critical` issues from review report. Decide on `Important`. Optionally fix `Minor`.
4. Add a "Phase N reviewed on YYYY-MM-DD" entry below.
5. Commit: `chore(review): phase N exit gate passed` and proceed.

> **Git policy (T-001):** all commits stay LOCAL until T-047. No `git push` and no `gh repo create` before then. Verify with `git remote -v` (should be empty).

### Phase reviews log

- [x] Phase 0 reviewed on 2026-05-05 — see `docs/review-reports/phase-0.md`
- [x] Phase 1 reviewed on 2026-05-05 — see `docs/review-reports/phase-1.md`
- [x] Phase 2 reviewed on 2026-05-05 — see `docs/review-reports/phase-2.md`
- [x] Phase 3 reviewed on 2026-05-06 — see `docs/review-reports/phase-3.md`
- [x] Phase 4 reviewed on 2026-05-06 — see `docs/review-reports/phase-4.md`
- [x] Phase 5 reviewed on 2026-05-08 — see `docs/review-reports/phase-5.md`
- [x] Phase 6 reviewed on 2026-05-08 — see `docs/review-reports/phase-6.md`
- [x] Phase 7 reviewed on 2026-05-08 — see `docs/review-reports/phase-7.md`
- [x] Phase 8 reviewed on 2026-05-11 — see `docs/review-reports/phase-8.md`
- [x] Phase 9 reviewed on 2026-05-11 — see `docs/review-reports/phase-9.md`
- [x] Phase 10 reviewed on 2026-05-11 — see `docs/review-reports/phase-10.md`
- [x] Phase 11 reviewed on 2026-05-11 — see `docs/review-reports/phase-11.md`
- [ ] Phase 12 reviewed on \_\_\_\_-\_\_-\_\_ (final pre-release sweep)

---

## Phase 0 — Bootstrap (T-001 → T-004)

- [x] **T-001** — Initialize local git + skeleton files (NO push)
- [x] **T-002** — pnpm workspace + TypeScript base + lint/format/commit
- [x] **T-003** — Foundry + Hardhat init in `contracts/`
- [x] **T-004** — Bootstrap meta-files + Makefile (commit locally only)

## Phase 1 — Smart Contract + Tests (T-005 → T-010)

- [x] **T-005** — Contract skeleton: storage + errors + events
- [x] **T-006** — Implement `registerProject` + `registerBatch`
- [x] **T-007** — Implement `redeemProduct` + view functions
- [x] **T-008** — Foundry property tests for SR1–SR4
- [x] **T-009** — Hardhat E2E + deploy script
- [x] **T-010** — Slither + coverage + gas snapshot CI gates

## Phase 2 — Shared Package (T-011 → T-012)

- [x] **T-011** — Shared package skeleton + types + Zod schemas
- [x] **T-012** — ABI export + hashing helpers + cross-check tests

## Phase 3 — Coordination Hub (T-013 → T-022)

- [x] **T-013** — NestJS skeleton + ConfigModule + observability bootstrap
- [x] **T-014** — Auth module: register, login, refresh, JWT guard
- [x] **T-015** — Producers module + wallet service (encryption)
- [x] **T-016** — Projects module: CRUD + on-chain `registerProject`
- [x] **T-017** — Activities + Certifications nested CRUD
- [x] **T-018** — Uploads module: IPFS local + Pinata adapters
- [x] **T-019** — Blockchain module: provider, contract, nonce manager
- [x] **T-020** — Scan module: public + private with pre-check
- [x] **T-021** — Health, metrics, audit log
- [x] **T-022** — Seed script + batches endpoint + final integration

## Phase 4 — Consumer dApp (T-023 → T-027)  *parallelizable with Phase 5*

- [x] **T-023** — dApp scaffolding + Tailwind + shadcn/ui + i18n
- [x] **T-024** — Public scan page (`/projects/[projectId]`)
- [x] **T-025** — Private scan page (`/scan/[projectId]/[secretId]`)
- [x] **T-026** — Scanner page + URL paste fallback + about
- [x] **T-027** — Static export build + IPFS deploy script + final E2E

## Phase 5 — Management Portal (T-028 → T-032)  *parallelizable with Phase 4*

- [x] **T-028** — Mgmt Portal scaffolding + NextAuth + i18n
- [x] **T-029** — Dashboard + Project list + Create/Edit forms
- [x] **T-030** — Activities + Certifications + Images pages
- [x] **T-031** — Batch generation wizard
- [x] **T-032** — Verification analytics + final E2E

## Phase 6 — Experiments (T-033 → T-035)

- [x] **T-033** — Experiments runner library
- [x] **T-034** — Performance + cost experiments
- [x] **T-035** — Adversarial scripts + `exp:all` umbrella

## Phase 7 — Docker Compose (T-036 → T-037)

- [x] **T-036** — Docker Compose stack + service Dockerfiles
- [x] **T-037** — Compose profiles + healthchecks + smoke test

## Phase 8 — CI Workflows (T-038 → T-039)

- [x] **T-038** — `contracts-ci` + `apps-ci` workflows
- [x] **T-039** — Release workflow + secret scanners + commitlint

## Phase 9 — Documentation (T-040 → T-042)

- [x] **T-040** — README + ARCHITECTURE images
- [x] **T-041** — THREAT_MODEL + SECURITY_ANALYSIS + REPRODUCIBILITY
- [x] **T-042** — MAINNET_DEPLOY + CONTRIBUTING + THIRD_PARTY

## Phase 10 — Branding + Seed + Citation (T-043 → T-045)

- [x] **T-043** — Logo + complete i18n strings
- [x] **T-044** — Demo seed data (3 HTX rau)
- [x] **T-045** — Citation files + License + Zenodo metadata + CHANGELOG

## Phase 11 — Mainnet Path (T-046)

- [x] **T-046** — Deploy.s.sol + Verify.s.sol + production env templates

## Phase 12 — Release v1.0.0 (T-047 → T-048)

- [ ] **T-047** — Test tag `v0.0.1-test` + Zenodo sandbox
- [ ] **T-048** — Tag `v1.0.0` + DOI mint + paper footnote update

---

## Per-phase exit gates

A phase is "complete" when:

| Phase | Exit gate |
| --- | --- |
| 0 | Repo on GitHub, CI placeholder green, husky hooks block bad commits |
| 1 | `forge test` ≥ 90% coverage, Slither 0 high, gas snapshot committed |
| 2 | `@qr-bc/shared` build OK, `hashSid()` cross-check passes |
| 3 | All hub endpoints documented in Swagger, integration tests ≥ 70% |
| 4 | Static export works on local IPFS gateway; Lighthouse perf ≥ 85 |
| 5 | Producer can register → create project → batch → see analytics |
| 6 | `pnpm exp:all` produces SUMMARY.md within ±50% of paper claims |
| 7 | `make demo` brings up full stack in ≤ 60 s |
| 8 | All workflows green; gitleaks rejects fake secrets |
| 9 | Reviewer-grade docs render; quickstart leads to verified product in ≤ 15 min |
| 10 | i18n parity green; `pnpm seed` populates 3 HTX; CITATION.cff validates |
| 11 | `forge script Deploy.s.sol --simulate` dry-runs successfully |
| 12 | DOI minted; paper footnotes updated; resubmission ready |

---

## Burndown placeholder

Update weekly:

```text
Week 1: T-001..T-005   ( 5/48,  10%)
Week 2: T-006..T-013   (13/48,  27%)
Week 3: T-014..T-022   (22/48,  46%)
...
```

---

## Active blockers

(None at start.)

When a ticket marks `[!]`, add an entry here:

```text
- T-XXX blocked by: <reason>. ETA: <date>. Owner: <handle>.
```
