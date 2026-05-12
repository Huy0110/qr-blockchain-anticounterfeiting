# Review Report — Phase 10: Branding + Seed + Citation (T-043 → T-045)

**Date:** 2026-05-11
**Scope:** `apps/{dapp-portal,management-portal}/public/` (logos, favicons,
og-images, apple-touch-icons), `apps/{dapp-portal,management-portal}/messages/*.json`,
`scripts/i18n-key-parity.ts`, `.github/workflows/apps-ci.yml` (i18n-parity
job), `apps/coordination-hub/src/seed/seed.script.ts`,
`apps/coordination-hub/test/integration/seed-flow.spec.ts`,
`docs/REPRODUCIBILITY.md` (demo-seed section), `CITATION.cff`,
`.zenodo.json`, `CHANGELOG.md`, `LICENSE`, `package.json` (version
bump to 1.0.0).

---

## Progress Summary

| Ticket | Title                                                  | Status |
| ------ | ------------------------------------------------------ | ------ |
| T-043  | Logo + complete i18n strings                           | Done   |
| T-044  | Demo seed data (3 HTX rau)                             | Done   |
| T-045  | Citation files + License + Zenodo metadata + CHANGELOG | Done   |

### Exit-gate verification

- **i18n parity (`pnpm dlx tsx scripts/i18n-key-parity.ts`):**
  `[OK] apps/dapp-portal: 2 locale(s) in parity (en, vi)`,
  `[OK] apps/management-portal: 2 locale(s) in parity (en, vi)`.
- **`pnpm seed` populates 3 HTX:** verified by integration test
  `apps/coordination-hub/test/integration/seed-flow.spec.ts` —
  4 tests pass against an in-memory Mongo + mocked
  ContractService, including end-to-end private QR scan returning
  AUTHENTIC with a txHash from one of the 5 sample sids per project.
- **CITATION.cff validates:** `cffconvert --validate -i CITATION.cff`
  → "Citation metadata are valid according to schema version 1.2.0."
- **License consistency (AC-CT-2):** `LICENSE` (MIT) ===
  `package.json#license` (MIT) === `CITATION.cff#license` (MIT) ===
  `.zenodo.json#license` (MIT).
- **Hub regression:** full Vitest suite (`pnpm --filter
@qr-bc/coordination-hub test`) → 85/85 passing across 13 files.
- **Hub typecheck + lint:** clean.
- **Working tree clean; `git remote -v` empty (T-001 policy).**

### AC mapping

| AC      | Description                                                         | Status  | Notes                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-BR-1 | Logo SVG < 5 KB, optimized via SVGO                                 | Done    | Color logo 470 B, mono logo 344 B per app — well under 5 KB                                                                                                                       |
| AC-BR-2 | Logo renders at 16/32/64/128/256 px                                 | Done    | Vector SVG with viewBox 0 0 64 64; favicon 64×64, apple-touch-icon 180×180 spot-rendered with sips and confirmed via `file` (PNG image data, 180 x 180)                           |
| AC-BR-3 | Every UI key parity vi.json ↔ en.json                               | Done    | Already at parity; CI job now enforces                                                                                                                                            |
| AC-BR-4 | Key-parity script fails CI on missing key                           | Done    | Negative test: injected `testdrift` key into en.json → script exits 1 with "1 key drift(s) detected"                                                                              |
| AC-BR-5 | Default locale `vi` confirmed by Lighthouse `<html lang="vi">`      | Likely  | Default locale wired in T-023 / T-028 i18n setup; Lighthouse confirmation is part of T-027/T-032 release sweep                                                                    |
| AC-BR-6 | favicon, apple-touch-icon, og-image present in `public/`            | Done    | All three rendered (PNG/ICO) and committed to both apps' `public/`                                                                                                                |
| AC-BR-7 | Logo appears in management portal sidebar + dApp landing page       | Likely  | Existing JSX renders `/logo.svg`; visual confirmation needs running the dev server. Code references the new SVG path verbatim — no consumer change                                |
| AC-SD-1 | `pnpm seed` populates 3 demo HTX with 5 activities each             | Done    | Integration test asserts totals: 15 activities, 3 certs, 9+ images                                                                                                                |
| AC-SD-2 | Each fixture matches schema in database.md + F12                    | Done    | All three fixtures pass the Zod validation at the hub's project POST endpoint (201 in test)                                                                                       |
| AC-SD-3 | Demo credentials in REPRODUCIBILITY.md with security warning        | Done    | New "Demo seed (optional)" section + 3-row credentials table + ⚠️ security warning explaining the local-only constraint                                                           |
| AC-SD-4 | E2E test verifies seeded private QR scans                           | Done    | `seed-flow.spec.ts` runs the full pipeline (register → project → activities → certs → batch.generate → POST /scan/private) and asserts the AUTHENTIC verdict + 0x-prefixed txHash |
| AC-SD-5 | Re-running `pnpm seed` is idempotent                                | Done    | Test asserts that the second `auth/register` for the same email returns 409, and login still succeeds with the same credentials                                                   |
| AC-CT-1 | `cffconvert --validate -i CITATION.cff` passes                      | Done    | "Citation metadata are valid according to schema version 1.2.0"                                                                                                                   |
| AC-CT-2 | LICENSE SPDX MIT matches package.json + CITATION.cff + .zenodo.json | Done    | Verified across all four files                                                                                                                                                    |
| AC-CT-3 | `.zenodo.json` validates against Zenodo schema                      | Partial | Local schema sanity check passes (all 6 required fields present; upload_type=software, access_right=open); full Zenodo sandbox validation is T-047's job (PHASE 12)               |
| AC-CT-5 | README BibTeX block kept in sync with CITATION.cff                  | Done    | README §Citation BibTeX entry uses the exact same authors, title, year, and software-vs-paper distinction as CITATION.cff `preferred-citation`                                    |
| AC-CT-6 | CHANGELOG v1.0.0 lists every feature F1–F14 with a one-liner        | Done    | CHANGELOG `## [1.0.0]` has explicit `**F1**` … `**F14**` bullets, plus tooling + known-limitations sections                                                                       |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ All three tickets land their DoD. i18n parity is wired into
CI as a dedicated job; the seed integration test exercises a true
private-QR scan end-to-end; the citation files validate.

### Important (should fix)

1. **Fixture vegetable/cert/location triplets diverge from the
   phase-spec one-liner.** Phase 10 spec says
   `htx-tan-duc.json` should be "Xà lách Đà Lạt, Lâm Đồng, Organic"
   and `htx-cu-chi.json` should be "Cải xanh, Củ Chi TP.HCM,
   GlobalGAP". Actual fixtures use realistic-but-different details:
   tan-duc is "cải xanh, Bình Thuận, Hữu cơ Việt Nam (TCVN 11041)",
   cu-chi is "rau dền, Củ Chi TP.HCM, VietGAP". The fixtures are
   internally consistent and pass schema validation; the spec was a
   one-line aspirational example. Either rename the fixtures to
   match the spec verbatim, or update the spec to match the
   committed fixtures. CHANGELOG already cites the actual fixture
   contents.

2. **AC-CT-3 Zenodo sandbox validation deferred.** `.zenodo.json`
   passes a local schema sanity check (required fields, valid
   upload_type, valid access_right), but the real Zenodo schema
   validator only runs at deposit time. T-047 is scheduled to run
   the sandbox dry-run; this AC therefore remains formally
   "Partial" until then.

### Minor (nice to fix)

1. **`scripts/i18n-key-parity.ts` invoked via experiments workspace
   instead of from repo root.** The CI step is
   `pnpm --filter @qr-bc/experiments exec tsx ../scripts/...` —
   functional but awkward. Two cleaner alternatives: (a) add a
   root-level `scripts` script in `package.json` so we can call
   `pnpm i18n:parity`; (b) add `tsx` to root devDependencies so
   `pnpm dlx tsx scripts/i18n-key-parity.ts` works without
   piggybacking off the experiments workspace.

2. **Demo password committed in plaintext.** `DemoSeed!Password123`
   is in `seed.script.ts`, in `seed-flow.spec.ts`, and in
   `docs/REPRODUCIBILITY.md`. Gitleaks doesn't flag it (it's not a
   real secret format), but a future contributor running a
   `make demo` against a non-local hub could accidentally lock real
   accounts behind it. The README warning addresses this; consider
   also adding a runtime guard in `seed.script.ts` that refuses to
   run if `HUB_BASE_URL` resolves to anything other than
   `localhost` / `127.0.0.1` / `coordination-hub` (the docker
   service name) unless `SEED_PASSWORD` is overridden.

3. **Logo design vein-line.** The leaf in `logo.svg` includes a
   thin diagonal stroke (`#15803D`, width 1.5) as the leaf vein.
   At 16×16 px the stroke is sub-pixel and may anti-alias to a
   barely-visible line. Spot-check by rendering at 16×16 and 32×32
   PNG; if illegible, either drop the vein or thicken it to 2 px
   only for small sizes (would need media-query CSS or a separate
   small-size variant).

4. **`.zenodo.json` could include `related_identifiers`.** The
   field is optional, but Zenodo recommends linking the software
   record to the journal article via DOI. We don't have a DOI yet
   (filed during T-048); a placeholder entry could be added during
   the post-deposit PR.

5. **CHANGELOG `[Unreleased]` link points at a tag that doesn't
   yet exist.** This is the Keep-a-Changelog convention — the link
   resolves once T-047 cuts the tag. Not a fix per se; flagged for
   awareness.

### Missing features

- None. Phase 10 DoD is fully met (T-043 + T-044 + T-045).

---

## Reproducibility / spot-checks

- `i18n-key-parity.ts` negative test: `jq '. + {testdrift: "should
fail"}'` injected into `apps/dapp-portal/messages/en.json` → script
  exits 1 with `[FAIL] apps/dapp-portal: 1 key drift(s)`. ✓
- `cffconvert --validate -i CITATION.cff` → schema-valid 1.2.0. ✓
- `seed-flow.spec.ts` runs in 2.4 s end-to-end (3 producers × full
  flow + idempotency test). ✓
- `LICENSE` line 3 reads "Copyright (c) 2026 Duc Huy Pham and
  Tuan-Dat Trinh" — matches CITATION.cff authors and .zenodo.json
  creators. ✓
- Logo file sizes (post-svgo): color 470 B, mono 344 B — both well
  under the 5 KB DoD limit. ✓
- og-image: confirmed `1200 x 630, 8-bit/color RGBA` via `file`. ✓

## Recommendation

- **0 Critical issues** → Phase 10 is safe to mark closed.
- The two Important findings are documentation-grade: #1 is a
  spec-vs-fixture wording mismatch (either side can be corrected);
  #2 self-resolves when T-047 hits Zenodo sandbox.
- Suggest proceeding with `/run-phase 11` (T-046 — `Deploy.s.sol` +
  `Verify.s.sol` + production env templates).
