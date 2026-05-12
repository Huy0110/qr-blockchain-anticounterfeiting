# Review Report — Phase 8: CI Workflows (T-038 → T-039)

**Date:** 2026-05-11
**Scope:** `.github/workflows/`, `.github/dependabot.yml`,
`.lighthouserc.json`, `scripts/check-coverage.cjs`.

---

## Progress Summary

| Ticket | Title                                           | Status |
| ------ | ----------------------------------------------- | ------ |
| T-038  | `contracts-ci` + `apps-ci` workflows            | Done   |
| T-039  | Release workflow + secret scanners + commitlint | Done   |

### Exit-gate verification

- All 5 workflow YAMLs (`contracts-ci`, `apps-ci`, `release`,
  `gitleaks`, `commitlint`) parse cleanly via `yaml.safe_load`
- `dependabot.yml` parses cleanly
- `pnpm -r typecheck` clean across all 6 packages
- `pnpm -r lint` clean
- `scripts/check-coverage.cjs` self-tests (pass @ 90% gate vs.
  96.67% sample; fail @ 100% gate)
- Local commitlint smoke: bad message rejects, conventional passes
- Local gitleaks smoke: synthetic `ghp_…` GitHub PAT detected
- `git status` clean; `git remote -v` empty (T-001 policy)

### AC-CI acceptance-criteria mapping

| AC       | Description                                                                | Status       | Notes                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-CI-1  | All 3 main workflows defined and runnable                                  | Done         | contracts-ci.yml + apps-ci.yml + release.yml present                                                                                                                 |
| AC-CI-2  | `contracts-ci` passes on a clean PR                                        | Pending PR   | Needs first push to GitHub to verify (T-047)                                                                                                                         |
| AC-CI-3  | `apps-ci` passes on a clean PR                                             | Pending PR   | Same                                                                                                                                                                 |
| AC-CI-4  | `gitleaks.yml` rejects a PR introducing a fake secret                      | Likely       | Local gitleaks detects synthetic `ghp_…`; CI uses the same engine                                                                                                    |
| AC-CI-5  | `commitlint.yml` rejects a PR with non-Conventional commit                 | Likely       | Local commitlint rejects "feat: bad" without a `:` body                                                                                                              |
| AC-CI-6  | Tag push of `v0.0.1-test` triggers `release.yml` and produces a Pinata CID | Pending tag  | release.yml wired; needs GH + Pinata sandbox JWT                                                                                                                     |
| AC-CI-7  | Coverage threshold gate (90% Solidity, 70% TS) blocks PR                   | Partial      | `check-coverage.cjs` enforces 90% on Solidity (contracts-ci); the TS 70% gate isn't enforced (no per-workspace coverage upload + threshold logic) — see Important #1 |
| AC-CI-8  | All workflows complete in ≤ 10 min on average                              | Pending data | Per-workflow timeout-minutes set ≤ 12-20; matrix parallelism helps. Verifiable only after the first 3 dry runs (DoD)                                                 |
| AC-CI-9  | CI badges in README: build, coverage, Slither, license                     | Missing      | See Important #2                                                                                                                                                     |
| AC-CI-10 | release.yml appends CHANGELOG snippet to GitHub release notes              | Done         | awk script extracts the matching `## [tag]` block from CHANGELOG.md                                                                                                  |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ All workflows + dependabot + coverage script syntactically
valid; local smoke runs for commitlint and gitleaks pass. The
remaining "Pending PR" items are inherent to never-pushed-to-GitHub
repos and will resolve when T-047 fires the first push.

### Important (should fix)

1. **TypeScript coverage gate (AC-CI-7, 70%) not enforced** —
   `contracts-ci.yml` gates Solidity at 90 % via
   [scripts/check-coverage.cjs](../../scripts/check-coverage.cjs), but
   `apps-ci.yml`'s matrix runs `vitest run` without `--coverage` and
   doesn't enforce a threshold. AC-MP-15 + AC-CI-7 expect 70 % combined
   Vitest + Playwright on the hub + management-portal. Wire
   `vitest run --coverage` into the matrix steps that have
   `@vitest/coverage-v8` (hub, mgmt-portal), upload to Codecov, and
   add a threshold check (Codecov status check or a second
   `check-coverage.cjs` invocation on the per-workspace lcov).

2. **No README badges (AC-CI-9)** — README.md has no build / coverage /
   Slither / license badges. Easy fix: add a 4-badge banner under the
   title once T-047 establishes the GitHub repo URL. Defer to Phase 9
   docs sweep but flagged here for visibility.

3. **`release.yml` Pinata pin extraction is fragile** —
   [release.yml:57-61](../../.github/workflows/release.yml#L57-L61)
   greps `apps/dapp-portal/ipfs-deploy.sh` stdout for `CID:[[:space:]]+[A-Za-z0-9]+`.
   If the script's "==> Pinned!" wrapper format ever changes, the regex
   silently extracts the wrong line (e.g., the second CID printed in
   the gateway URL). Safer: have `ipfs-deploy.sh` emit a single line
   like `RELEASE_CID=<cid>` on success and grep that anchored.

4. **`apps-ci` Playwright jobs assume a running hub for mgmt-portal
   tests** — actually NO, the E2E bypass + mocked `page.route` covers
   everything _except_ NextAuth's authorize step which is bypassed
   via `MGMT_PORTAL_E2E_BYPASS=1`. Documented in the workflow env.
   Just flag: any test that uses real backend calls would break in CI.
   Status: working as designed.

5. **No Zenodo deposit trigger in release.yml** — DoD line says
   "Zenodo sandbox deposit succeeds for v0.0.1-test". Zenodo's GitHub
   integration is enabled via the Zenodo dashboard (linking the repo
   triggers a deposit on every release automatically), but a
   `CITATION.cff` is needed in the repo first. That's Phase 10 / T-045;
   document in `docs/MAINNET_DEPLOY.md` (Phase 9) how to enable Zenodo
   in the dashboard so the deposit actually fires.

6. **Dependabot may flood weekly with patch bumps** —
   [dependabot.yml](../../.github/dependabot.yml) groups `@nestjs`,
   `next*`, `ethers`, and tooling but leaves the rest ungrouped.
   `open-pull-requests-limit: 10` caps the chaos but a `groups` entry
   for `radix-ui` + `tanstack` + `mongoose` would tighten this.

### Minor (nice to fix)

1. **`contracts-ci.yml` runs `forge coverage --report lcov` twice
   implicitly** — `forge coverage --report summary --report lcov`
   produces both. Fine, but the `node ../scripts/check-coverage.cjs`
   step is run from `working-directory: contracts` so the relative
   path `../scripts/...` works; documenting that contract in a comment
   would help future contributors.

2. **`apps-ci.yml`'s `MONGOMS_DISABLE_POSTINSTALL` env var is set on
   the test step but mongodb-memory-server downloads at runtime, not
   postinstall** — the var is benign no-op for v8+. Drop it.

3. **`gitleaks-action@v2` doesn't pin to a SHA** — supply-chain
   risk if the action ever gets compromised. Pin to the v2 release's
   commit SHA. Same for `pnpm/action-setup`, `actions/setup-node`,
   etc. — but consistency matters; either pin all or none.

4. **`release.yml`'s `softprops/action-gh-release@v2` is the de
   facto choice but unpinned** — same SHA-pinning concern.

5. **`commitlint.yml`'s install step uses `--filter=.`** — works
   but reads oddly. `pnpm install --frozen-lockfile --filter=.` is
   pnpm's shorthand for "only the root workspace deps." A comment
   explaining "we only need commitlint at the root" would help.

6. **`apps-ci.yml` doesn't run `pnpm format:check`** — the repo
   has a `format:check` script in `package.json` but no CI step
   exercises it. Drift between editor formatting and committed style
   will sneak in.

### Missing features

- AC-CI-7 TS 70% gate not wired (Important #1).
- AC-CI-9 README badges not present (Important #2).
- AC-CI-6 / AC-CI-8 can only be verified after T-047 + first
  3 CI runs.

---

## Test Coverage

- **Workflow YAML lint:** 5/5 + dependabot.yml parse cleanly.
- **Local smoke (negative tests for AC-CI-4 / AC-CI-5):**
  - commitlint rejects `feat: bad msg no scope dash`
  - commitlint accepts `feat(ci): add release workflow`
  - gitleaks detects a synthetic GitHub PAT (`ghp_…40 chars`) in a
    test fixture
- **Coverage script self-test:** `check-coverage.cjs` PASS @ 90% on
  96.67% data; FAIL @ 100%.
- **No end-to-end CI run** — repo isn't on GitHub yet (per T-001:
  "first push happens at T-047"). All workflow assertions are static
  - syntax-level + local-smoke.

## Recommendations

- **Zero Critical issues** → Phase 8 can proceed to Phase 9.
- The strongest fix-now candidates: **#1 (TS coverage gate)** to close
  AC-CI-7 fully, and **#3 (Pinata CID extraction)** to harden
  release.yml before T-047 lights it up for real.
- Important #2 (README badges) belongs in Phase 9 (docs sweep) —
  the badge URLs depend on the GitHub org/repo path that T-001
  hasn't decided yet.
- #5 (Zenodo dashboard wiring) is documentation, also Phase 9.
- Minor items can be deferred to Phase 12 (final pre-release sweep).
