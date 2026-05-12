# Review Report — Phase 4: Consumer dApp (T-023 → T-027)

**Date:** 2026-05-06
**Scope:** `apps/dapp-portal/` only. Hub (`apps/coordination-hub/`), shared package, contracts not in scope.

---

## Progress Summary

| Ticket | Title                                              | Status |
| ------ | -------------------------------------------------- | ------ |
| T-023  | dApp scaffolding + Tailwind + shadcn/ui + i18n     | Done   |
| T-024  | Public scan page (`/projects/[projectId]`)         | Done   |
| T-025  | Private scan page (`/scan/[projectId]/[secretId]`) | Done   |
| T-026  | Scanner page + URL paste fallback + about          | Done   |
| T-027  | Static export + IPFS deploy script + final E2E     | Done   |

**Phase 4 progress: 5/5 (100%).**

### Exit-gate verification (per phase-4 file + run-phase rules)

- `pnpm --filter @qr-bc/dapp-portal build` → success, 12 HTML files in `out/`, 1.9 MB
- `pnpm -r typecheck` → all packages clean
- `pnpm -r lint` → all packages clean
- `pnpm exec playwright test --project=chromium` → 13/13 passed (full-dapp + public-scan + private-scan)
- `./ipfs-deploy.sh --dry` → reports size + page count, exits 0
- `git status` clean; `git remote -v` empty (per T-001 policy: no push until T-047)

### AC-DA acceptance-criteria mapping (PRD `docs/requirements/features/dapp-portal.md`)

| AC       | Description                                | Status            | Notes                                                                                                                            |
| -------- | ------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| AC-DA-1  | Public scan ≤ 6 s on 4G                    | Likely            | Lighthouse perf threshold configured but **not run**; bundle size 9.7 kB / first-load 133 kB makes 6 s plausible                 |
| AC-DA-2  | AUTHENTIC ≤ 35 s on Amoy                   | Not verified live | E2E uses route mocks; Amoy timing is owned by hub Phase 6 experiments                                                            |
| AC-DA-3  | ALREADY_VERIFIED ≤ 5 s                     | Done              | E2E covers (mocked)                                                                                                              |
| AC-DA-4  | COUNTERFEIT ≤ 5 s                          | Done              | E2E covers (mocked)                                                                                                              |
| AC-DA-5  | TX hash → real Polygonscan event           | Partial           | E2E asserts href format `/tx/0x[d]{64}` but does not fetch Polygonscan                                                           |
| AC-DA-6  | Works on iPhone SE                         | Partial           | Playwright `mobile-iphone-se` project configured but **never executed** in this run                                              |
| AC-DA-7  | Works on Pixel 5                           | Missing           | No Pixel 5 device profile in `playwright.config.ts`                                                                              |
| AC-DA-8  | Language toggle without round-trip         | Done              | `full-dapp.spec.ts` `locale switch` test                                                                                         |
| AC-DA-9  | Build CID footer                           | Partial           | `CidFooter.tsx` reads from `NEXT_PUBLIC_BUILD_CID` env or pathname; requires post-pin redeploy with the env var to fully satisfy |
| AC-DA-10 | Lighthouse mobile perf ≥ 85                | Not run           | Config exists at `test/lighthouse.config.js`; LHCI invocation deferred                                                           |
| AC-DA-11 | Lighthouse a11y ≥ 90                       | Not run           | Same — config exists, not executed                                                                                               |
| AC-DA-12 | Works at `/ipfs/<CID>/`                    | Partial           | `CidFooter` parses CID from path; full test deferred to actual gateway pin (no local CID yet)                                    |
| AC-DA-13 | All routes static (no SSR runtime)         | Done              | `next build` with `output: 'export'` succeeds; placeholder shells emitted for dynamic routes                                     |
| AC-DA-14 | Degrades gracefully when hub offline       | Done              | `full-dapp.spec.ts` covers public+private offline → "Cannot connect" + retry button                                              |
| AC-DA-15 | Zero console errors/warnings in prod build | Likely            | No build errors; runtime not asserted by tests                                                                                   |
| AC-DA-16 | E2E covers 3 main flows                    | Done              | full-dapp.spec.ts covers landing, public scan, private scan, locale, offline                                                     |
| AC-DA-17 | About: repo + DOI + CID                    | Done              | `AboutPage` renders all three; placeholders shown when env vars unset                                                            |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ Phase 4 deliverables compile, pass tests, and produce a static export deployable to IPFS.

### Important (should fix)

1. **Leaflet CSS loaded from `unpkg.com` CDN at runtime** — [`apps/dapp-portal/src/components/traceability/LocationMap.tsx:32-37`](../../apps/dapp-portal/src/components/traceability/LocationMap.tsx#L32-L37). The `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">` injection contradicts the paper's "fully decentralized hosting via IPFS" claim — every map view becomes dependent on a third-party CDN, and breaks if the user is on an IPFS-only network or the CDN is censored. Should bundle the CSS via `import 'leaflet/dist/leaflet.css'` in the lazy-import.

2. **`usePrivateScan` useEffect re-runs on every render** — [`apps/dapp-portal/src/lib/use-private-scan.ts:30-32`](../../apps/dapp-portal/src/lib/use-private-scan.ts#L30-L32). The dependency array includes `mut`, which is a new object reference every render. The `mut.isIdle` guard prevents infinite mutate calls, but this is fragile — any future code path that goes back to `isIdle` (e.g., calling `mut.reset()`) would loop. Use `mut.mutate` (stable callback) as the dep, or trigger mutation with a one-shot `useRef` flag.

3. **Lighthouse never actually executed** — [`apps/dapp-portal/test/lighthouse.config.js`](../../apps/dapp-portal/test/lighthouse.config.js) defines the perf ≥ 85 / a11y ≥ 90 thresholds (per AC-DA-10/11) but no LHCI run has confirmed real numbers. The DoD checkbox for "Lighthouse perf ≥ 85" relies on the bundle stats (9.7 kB project page, 87.6 kB shared) being _plausibly_ fast on 4G, not measured. Run `lhci autorun --config=apps/dapp-portal/test/lighthouse.config.js` against a built `out/` and capture the report before claiming AC-DA-10/11 met.

4. **Mobile Playwright project never executed** — [`apps/dapp-portal/playwright.config.ts:14`](../../apps/dapp-portal/playwright.config.ts#L14) defines `mobile-iphone-se` but every Phase 4 run was `--project=chromium` only. AC-DA-6 ("Works on iPhone SE") is effectively unverified. Either run `pnpm exec playwright test --project=mobile-iphone-se` as part of the gate, or document the gap.

5. **AC-DA-7 (Pixel 5 viewport) not configured** — `playwright.config.ts` only has `Desktop Chrome` + `iPhone SE`. Add a `mobile-pixel-5` project with `devices['Pixel 5']` for parity with the AC.

6. **`AuthenticResult` / `AlreadyVerifiedResult` / `CounterfeitResult` show duplicate title** — [`AuthenticResult.tsx:27-30`](../../apps/dapp-portal/src/components/scan/AuthenticResult.tsx#L27-L30) renders both a `<Badge>` and a `<CardTitle>` with the same `t('authenticTitle')` text, producing visually redundant UI ("✓ HÀNG THẬT ✓ HÀNG THẬT"). Same pattern in the other two outcome components. This forced the E2E selectors to use `.first()` to disambiguate. Drop the badge or change one to a status-icon-only.

### Minor (nice to fix)

1. **`PublicScanContent` infinite skeleton on malformed URL** — [`PublicScanContent.tsx:35-39`](../../apps/dapp-portal/src/components/traceability/PublicScanContent.tsx#L35-L39). If the URL doesn't match the `0x[hex]{64}` regex (e.g., a hand-typed URL), `phi` stays `''` forever and the skeleton renders indefinitely. Add a fallback: after one tick with no match, set state to `not-found`.

2. **`PrivateScanContent` same issue** — [`PrivateScanContent.tsx:29-36`](../../apps/dapp-portal/src/components/scan/PrivateScanContent.tsx#L29-L36). Initial render shows `<ScanProgress stage="verifying" />` even when the URL is malformed; should fall through to a counterfeit-or-error state.

3. **Magic `'placeholder'` string repeated** — `'placeholder'` appears as a sentinel in three files (`projects/[projectId]/page.tsx`, `scan/[projectId]/[secretId]/page.tsx`, both `*Content.tsx` components). Pull into a `STATIC_PLACEHOLDER` constant in `src/lib/i18n.ts` or a new `static-export.ts` so a future rename can't drift.

4. **Empty commits in git history** — Commits `8c7748b`, `68f6958`, `f058c40`, `2c8b758` (and Phase 3 equivalents) are titled `chore(progress): mark T-XXX done` but contain zero file changes. Earlier sessions wrote the implementation commit and the chore commit but didn't actually flip the checkboxes in `progress.md`. T-027's commit reconciled this. Future ticket completions should `git add docs/tasks/progress.md` before the chore commit.

5. **`AlreadyVerifiedResult` uses `as unknown as string`** — [`AlreadyVerifiedResult.tsx:35`](../../apps/dapp-portal/src/components/scan/AlreadyVerifiedResult.tsx#L35). Same hack as `AuthenticResult.tsx:22`. The `VerificationOutcome` type from `@qr-bc/shared` likely has `verifiedAt: Date` but the JSON wire format is a string. Either narrow the schema (Zod transform) at the API boundary so `verifiedAt` is always `Date`, or change the type to `Date | string`.

6. **`logo.svg` is a placeholder** — `apps/dapp-portal/public/logo.svg` is a 1-line stub. Final logo is owned by T-043 in Phase 10; flagged here only as a visible reminder.

### Missing features (per AC-DA, not blocking)

- AC-DA-12 (`/ipfs/<CID>/`) — verified only by code reading; can be confirmed once T-027's `ipfs-deploy.sh` runs against a real Pinata account.
- AC-DA-15 — production-build console-error count is not asserted by any test. Could add a Playwright `page.on('console', ...)` hook in `full-dapp.spec.ts`.

---

## Test Coverage

- **Playwright (chromium):** 13/13 pass
  - `full-dapp.spec.ts` (T-027): 6 tests — three routes, locale switch, public scan flow, AUTHENTIC flow, public offline, private offline
  - `public-scan.spec.ts` (T-024): 3 tests — real project, unknown phi, no-coordinates
  - `private-scan.spec.ts` (T-025): 4 tests — AUTHENTIC, ALREADY_VERIFIED, COUNTERFEIT, English locale
- **Mobile (iPhone SE):** not exercised this run — see Important #4
- **Lighthouse:** config present, not run — see Important #3
- **Unit tests:** none in `apps/dapp-portal/` (Playwright is the only test layer); appropriate for thin client code where logic lives in `@qr-bc/shared`.

---

## Recommendations

- **Zero Critical issues** — Phase 4 can proceed to Phase 5.
- Important #1 (Leaflet CDN) and Important #3 (run Lighthouse) are the strongest candidates for `/08-fix-bug` before Phase 5, because they directly contradict paper claims.
- Important #2 (useEffect dep) is a latent correctness issue worth fixing while the code is fresh.
- Important #4–5 (mobile project / Pixel 5) can be batched into a single config tweak.
- Minor issues can be deferred to Phase 12 (final pre-release sweep) without risk.
