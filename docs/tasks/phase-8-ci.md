# Phase 8 — CI Workflows

**Goal:** GitHub Actions workflows enforcing quality gates on every push/PR + automating Zenodo deposit on tag.
**Effort:** ~1.5 days total (2 tickets).
**Prerequisites:** Phases 1–7.

---

### T-038 — `contracts-ci` + `apps-ci` workflows

**Phase:** 8 · **Feature:** F9 · **Effort:** M

**Description.** Two main CI workflows with all quality gates.

**Files to create/modify:**

- `.github/workflows/contracts-ci.yml` — lint (Solhint) + build (forge) + test (forge + hardhat) + coverage (≥ 90%) + Slither (--fail-on high) + gas-snapshot (--check)
- `.github/workflows/apps-ci.yml` — matrix per app (hub, dapp-portal, management-portal, shared, experiments): typecheck + lint + test + build + Lighthouse CI for frontends
- `.github/workflows/lighthouse.yml` (optional) — separate for portals if needed
- `.lighthouserc.json` — thresholds per [features/dapp-portal.md](../requirements/features/dapp-portal.md) AC-DA-10, AC-DA-11; mgmt-portal AC-MP-12, AC-MP-13
- `.github/workflows/ci-placeholder.yml` — DELETE (replaced by these)

**Acceptance criteria refs:** AC-CI-1, AC-CI-2, AC-CI-3, AC-CI-7, AC-CI-8, AC-CI-9, AC-DA-10, AC-DA-11, AC-MP-12, AC-MP-13, AC-SA-1, AC-SA-7, AC-SA-8, AC-SA-9
**ADRs:** ADR-001
**SR/R mapping:** §3 defensive (forces SR1–SR4 property tests + Slither to pass)
**Depends on:** T-010, T-022, T-027, T-032, T-035.
**Definition of Done:**

- [ ] On push to `main` or PR: both workflows run and pass on a clean commit.
- [ ] Coverage badges in README link to live Codecov reports.
- [ ] Slither finding (high) fails PR check.
- [ ] Coverage drop below threshold fails PR check.
- [ ] Gas snapshot drift > 5% fails PR check.
- [ ] Lighthouse perf < 80 (mgmt) / 85 (dapp) fails PR check.
- [ ] Average workflow runtime ≤ 10 min (verify via 3 dry runs).
- [ ] Caching (`~/.pnpm-store`, `~/.foundry/cache`) configured.

---

### T-039 — Release workflow + secret scanners + commitlint

**Phase:** 8 · **Feature:** F9 · **Effort:** M

**Description.** Release.yml (tag → build artifacts → Pinata pin → Zenodo trigger), gitleaks, commitlint.

**Files to create/modify:**

- `.github/workflows/release.yml` — triggered on `v*.*.*` tag; builds dApp static export, pins to Pinata, attaches CID to GitHub release notes; Zenodo auto-fires
- `.github/workflows/gitleaks.yml` — every push
- `.github/workflows/commitlint.yml` — pull_request
- `.github/dependabot.yml` (optional v2) — weekly bumps

**Acceptance criteria refs:** AC-CI-4, AC-CI-5, AC-CI-6, AC-CI-10
**ADRs:** ADR-005 (Pinata pinning), ADR-012 (Conventional Commits)
**SR/R mapping:** R-005 (secret leak) — gitleaks mitigation
**Depends on:** T-038.
**Definition of Done:**

- [ ] Push test tag `v0.0.1-test` → release.yml builds, pins dApp to Pinata sandbox, creates GitHub release with CID in notes.
- [ ] Gitleaks rejects a PR introducing a fake `aws_secret_access_key=AKIA...`.
- [ ] Commitlint rejects a PR with a non-Conventional commit message.
- [ ] Zenodo sandbox deposit succeeds for `v0.0.1-test` (real Zenodo for `v1.0.0` happens in Phase 12).
- [ ] CHANGELOG.md snippet appended to GitHub release notes automatically.
