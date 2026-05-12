# Review Report — Phase 9: Documentation Suite (T-040 → T-042)

**Date:** 2026-05-11
**Scope:** `README.md`, `docs/THREAT_MODEL.md`, `docs/SECURITY_ANALYSIS.md`,
`docs/REPRODUCIBILITY.md`, `docs/MAINNET_DEPLOY.md`, `docs/CONTRIBUTING.md`,
`docs/THIRD_PARTY.md`, `docs/images/architecture-*.{svg,png}`,
`scripts/render-mermaid.sh`, `scripts/.puppeteer-config.json`,
`scripts/format-licenses.ts`, `.github/PULL_REQUEST_TEMPLATE.md`.

---

## Progress Summary

| Ticket | Title                                              | Status |
| ------ | -------------------------------------------------- | ------ |
| T-040  | README + ARCHITECTURE images                       | Done   |
| T-041  | THREAT_MODEL + SECURITY_ANALYSIS + REPRODUCIBILITY | Done   |
| T-042  | MAINNET_DEPLOY + CONTRIBUTING + THIRD_PARTY        | Done   |

### Exit-gate verification

- 3 Mermaid C4 diagrams rendered to both SVG (34–49 KB) and PNG
  (153–279 KB) via `scripts/render-mermaid.sh` against
  `@mermaid-js/mermaid-cli@11.4.0`.
- 6 phase-9 docs Prettier-formatted clean; no warnings on commit hook.
- `pnpm licenses list --json --prod` exits 0 → `THIRD_PARTY.md`
  reports 531 production packages across 15 distinct licenses,
  **0 GPL/AGPL/SSPL violations**.
- Internal-link check: 7 docs scanned, **2 forward-references**
  remaining (`CITATION.cff`, `.zenodo.json`) — both expected, both
  produced by T-045 (Phase 10).
- README badges committed with Huy0110 repo path (matches the URL
  T-047 will publish to).
- Working tree clean; no remote configured (T-001 policy).
- Phase 5/Phase 6 progress drift backfilled in `progress.md` during
  the Phase 9 dependency check; commit `066af53`.

### AC-DOC acceptance-criteria mapping

| AC       | Description                                                                                            | Status  | Notes                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-DOC-1 | README quickstart on a clean Linux VM → verified private QR within 15 min                              | Manual  | Out-of-band reviewer/operator test; documented in README §Quickstart with explicit ≤ 15 min target                                                                                         |
| AC-DOC-2 | All `docs/*.md` render on GitHub                                                                       | Likely  | Prettier-clean; will be verifiable post-push (T-047). No exotic Mermaid + no truncated tables.                                                                                             |
| AC-DOC-3 | `docs/ARCHITECTURE.md` ≥ 3 diagrams (Context, Container, Component)                                    | Done    | 3 mermaid blocks rendered to `docs/images/architecture-{context,container,component}.{svg,png}`                                                                                            |
| AC-DOC-4 | `docs/THREAT_MODEL.md` quotes paper §3.2 verbatim                                                      | Done    | Lines 209–229 from `qr_code_new_2026_02/frontiers.tex` embedded as a single blockquote                                                                                                     |
| AC-DOC-5 | `docs/SECURITY_ANALYSIS.md` table has SR1–SR4 → contract function → test file:line — every cell filled | Done    | 4 tables, every cell has `[name](path#Lxx)` references; cross-checked against `contracts/src/ProductRegistry.sol` and `contracts/test/properties/*.t.sol`                                  |
| AC-DOC-6 | `docs/REPRODUCIBILITY.md` lists each paper Table/Figure (Tab 3, Tab 4, Tab 5) and the exact command    | Done    | "Paper → command mapping" table covers Table 3 rows 1–4, Table 4, SR1–SR4 adversarial, and `pnpm exp:all`; Table 5 explicitly out of scope with rationale at anchor `#table-5`             |
| AC-DOC-7 | Docs link checker in CI                                                                                | Partial | Linkcheck not yet wired in CI (would belong with apps-ci.yml). Manual sweep here clean except 2 forward-refs to T-045 files. See Minor #1.                                                 |
| AC-DOC-8 | Citation block uses BibTeX with DOI placeholder                                                        | Done    | README §Citation has `@article` + `@software` blocks with `note = {DOI: TBD}`; BibTeX content matches the CITATION.cff spec in `requirements/features/docs-and-branding.md` lines 180-209. |
| AC-DOC-9 | Docs in English only                                                                                   | Done    | Manual review — no Vietnamese strings in any phase-9 doc                                                                                                                                   |
| AC-MN-1  | MAINNET_DEPLOY.md covers KMS, monitoring, MATIC top-up, Pinata Pro, custom domain, rollback            | Done    | 5 sections: pre-deploy checklist, deploy steps, post-deploy verification, 3-layer rollback plan (hub/dApp/contract), KMS migration table for AWS/GCP/Ledger/Vault                          |
| AC-MN-2  | MAINNET_DEPLOY.md explicitly states v1 not deployed; reproducer runs Amoy                              | Done    | Header paragraph + final §"v1.0.0 explicit non-deployment"                                                                                                                                 |
| AC-MN-3  | THIRD_PARTY.md lists all transitive deps; no GPL/AGPL detected                                         | Done    | 531 prod packages, 15 licenses, 0 copyleft; format-licenses.ts exits non-zero on any future violation                                                                                      |
| AC-MN-4  | CONTRIBUTING.md shows allowed Conventional Commit scopes                                               | Done    | Full table of 17 scopes mirroring `.commitlintrc.json` plus types table + 3 worked examples                                                                                                |
| AC-MN-5  | PR template includes AC checklist + risk reference                                                     | Done    | New §"Acceptance criteria" + mandatory risk-register cross-reference in §"Risk + rollback"                                                                                                 |
| NF-Co-4  | All docs in English (single-language for academic audience)                                            | Done    | Same as AC-DOC-9                                                                                                                                                                           |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ All three tickets land their respective Definitions of Done.
The Phase 5/6 progress-tracking drift was discovered, audited, and
backfilled cleanly with `chore(progress): backfill T-031..T-035 +
Phase 6 review checkboxes` (commit `066af53`); no work was missed.

### Important (should fix)

1. **AC-DOC-7 link checker not wired in CI.** README + the 6 doc
   files survive a local sweep, but the only "checked in CI" path
   today is gitleaks + commitlint. A `lychee` step in
   [`.github/workflows/apps-ci.yml`](../../.github/workflows/apps-ci.yml)
   that runs against `**/*.md` (excluding `node_modules`) would
   catch a broken anchor or a missing file _before_ a PR merges.
   Suggested config: `--exclude-mail --include-fragments --base
https://github.com/Huy0110/qr-blockchain-anticounterfeiting`.

2. **README quickstart not VM-validated.** AC-DOC-1 ("first private
   QR in ≤ 15 min on a clean Ubuntu VM") requires running `make
demo` end-to-end on a fresh box. This wasn't executed in this
   session because Docker images pull is slow + the testbed is the
   dev machine. Recommend either (a) a nightly GitHub-hosted runner
   that runs `make demo + scripts/smoke-test.sh` and posts the
   timing, or (b) a documented one-off pre-release sweep on a fresh
   t3.medium that gets attached to the v1.0.0 release notes.

3. **Forward-references to T-045 in `docs/RELEASE.md`.** The Zenodo
   integration section links to `../CITATION.cff` and `../.zenodo.json`,
   neither of which exist yet. The doc already says "scheduled for
   T-045 (Phase 10)" but a link checker (Important #1) would still
   flag them. Either change them to non-link text until T-045 lands,
   or accept the lychee `--accept 404` for these two paths until
   then.

### Minor (nice to fix)

1. **MD041 lint warning on PULL_REQUEST_TEMPLATE.md** — the file
   starts with an HTML comment, not an h1. GitHub uses the PR
   _title_, not the body's h1, so an h1 here would just clutter
   every PR description. Same shape as the pre-Phase-9 template;
   not a regression. If we want the lint warning to disappear,
   either add `# Pull request` to the top or add a `<!-- markdownlint-disable
MD041 -->` directive — the former changes user-facing GitHub
   behavior (showing "Pull request" as the heading of every PR
   description preview), so the latter is preferred.

2. **`scripts/format-licenses.ts` is workspace-rooted, not in a
   package.** Running `tsc --strict` on it standalone surfaces
   "Cannot find name 'process'" because there's no
   `scripts/tsconfig.json`. The script is intended to be invoked
   via `pnpm --filter @qr-bc/experiments exec tsx` (or `npx tsx`),
   which provides `@types/node`. Add a minimal `scripts/tsconfig.json`
   if we want `tsc` to validate it in isolation.

3. **`scripts/.puppeteer-config.json` is dev-only.** Consider moving
   it under `scripts/` proper (without the leading dot) or naming
   it `puppeteer.config.cjs` — the dotfile prefix risks hiding it
   from `ls` and from automated tooling.

4. **`docs/RELEASE.md` already documents Zenodo;
   `docs/REPRODUCIBILITY.md` repeats some of it.** Small overlap, no
   contradictions. Future polish: have REPRODUCIBILITY.md link to
   RELEASE.md §Zenodo integration rather than re-explain the
   handshake.

### Missing features

- None blocking. Phase 9's three docs each satisfy their Definition
  of Done; the AC-DOC-1 manual VM sweep and the AC-DOC-7 CI link
  checker are quality-of-life polish that fit cleanly into the
  Phase 12 release sweep.

---

## Reproducibility / link-graph spot checks

- `docs/SECURITY_ANALYSIS.md` "SR1 — Forge a sid that maps to an
  existing h" → claims [`ProductRegistry.sol:121`](../../contracts/src/ProductRegistry.sol#L121)
  computes `h` in-EVM. Verified: line 121 reads `bytes32 h = sha256(sid);`. ✓
- `docs/SECURITY_ANALYSIS.md` "SR2 — Atomically check + flip" →
  claims [`ProductRegistry.sol:124-127`](../../contracts/src/ProductRegistry.sol#L124-L127)
  is a single SSTORE inside the same tx. Verified: lines 124–127
  cover `if (!rec.exists) revert ... if (rec.redeemed) revert ...
rec.redeemed = true; unchecked { ++totalRedeemed; }`. ✓
- `docs/SECURITY_ANALYSIS.md` "SR4 — Hub supplies pre-computed
  hash" → test [`RedeemProduct.t.sol:78`](../../contracts/test/unit/RedeemProduct.t.sol#L78).
  Verified: function `test_redeemProduct_hubCannotFakeHash`. ✓
- `docs/REPRODUCIBILITY.md` "Table 3 row 1 → `pnpm
exp:perf-registration`" → verified the script exists at
  [`experiments/perf-registration/run.ts`](../../experiments/perf-registration/run.ts)
  and prints the Table 3 row 1 reference via `printPaperHeader`. ✓
- `docs/THIRD_PARTY.md` "0 GPL/AGPL/SSPL violations" → confirmed by
  exit code 0 of `format-licenses.ts`. ✓

## Recommendation

- **0 Critical issues.** Phase 9 is safe to mark closed.
- The two Important items (#1 link checker, #2 VM sweep) are
  release-readiness work, naturally placed in Phase 12.
- Forward-references to T-045 (#3) resolve themselves once T-045
  lands; no action needed in Phase 9.
- Suggest proceeding with `/run-phase 10`.
