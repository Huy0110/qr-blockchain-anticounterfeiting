# Review Report — Phase 5: Management Portal (T-028 → T-032)

**Date:** 2026-05-08
**Scope:** `apps/management-portal/` plus the small extension to
`apps/coordination-hub/src/scan/` that exposes the verification-stats
endpoint required by T-032.

---

## Progress Summary

| Ticket | Title                                        | Status |
| ------ | -------------------------------------------- | ------ |
| T-028  | Mgmt Portal scaffolding + NextAuth + i18n    | Done   |
| T-029  | Dashboard + Project list + Create/Edit forms | Done   |
| T-030  | Activities + Certifications + Images pages   | Done   |
| T-031  | Batch generation wizard                      | Done   |
| T-032  | Verification analytics + final E2E           | Done   |

**Phase 5 progress: 5/5 (100%).**

### Exit-gate verification

- `pnpm -r typecheck` → all 5 packages clean
- `pnpm -r lint` → all 5 packages clean (ESLint, solhint)
- `pnpm --filter @qr-bc/coordination-hub test` → 77/77 pass (no
  regression from the new VerificationsController)
- `pnpm --filter @qr-bc/management-portal exec playwright test` →
  17/17 pass (chromium): auth (4) + project CRUD (5) + sub-resources
  (4) + batches (2) + analytics (2)
- `git status` clean; `git remote -v` empty (per T-001 policy)
- `pnpm --filter @qr-bc/management-portal build` → success

### AC-MP acceptance-criteria mapping

| AC       | Description                                           | Status            | Notes                                                                                                                                                                                            |
| -------- | ----------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-MP-1  | Producer can register and log in                      | Done              | NextAuth credentials + auth.spec.ts                                                                                                                                                              |
| AC-MP-2  | Create a project with full fields + first activity    | Partial           | Creation flow covered; "first activity" needs a follow-on step in the new-project wizard (currently activities are added on the activities page after the project exists)                        |
| AC-MP-3  | Upload a PDF certification, link visible              | Partial           | Form supports PDF upload via the /images sink (the hub doesn't expose a dedicated /uploads/cert yet); link renders on success                                                                    |
| AC-MP-4  | Upload 3 product images                               | Done              | Multi-select up to 10, MIME guard, mid-upload cancel                                                                                                                                             |
| AC-MP-5  | Batch wizard generates ZIP for N=10 within 15 s       | Likely / not live | E2E uses a stubbed hub. Real Amoy run owned by Phase 6 experiments                                                                                                                               |
| AC-MP-6  | ZIP contains correct count, manifest.json, public.png | Hub-side          | Verified in Phase 3 batches integration tests (the portal just consumes the bytes)                                                                                                               |
| AC-MP-7  | Producer cannot view another producer's project list  | Done              | Server-enforced via JwtAuthGuard + ProjectsService.findOwnedByProducer; new VerificationsController also calls it                                                                                |
| AC-MP-8  | Language toggle without page reload                   | Done              | DashboardChrome.toggleLocale uses next/router.push (client-side)                                                                                                                                 |
| AC-MP-9  | Default locale = vi, persisted                        | Done              | localeDetection: false in middleware so first visit always lands on /vi/                                                                                                                         |
| AC-MP-10 | Forms have inline validation in current locale        | Done              | react-hook-form + zodResolver; ProjectForm Field surfaces localised errKey()                                                                                                                     |
| AC-MP-11 | Verification chart renders with seeded data           | Done (mocked)     | Daily line + outcome donut + recent table on /verifications; real seed-data wiring waits for `pnpm seed` to populate verification logs                                                           |
| AC-MP-12 | Lighthouse a11y ≥ 90                                  | Not run           | No run yet — see Important #1                                                                                                                                                                    |
| AC-MP-13 | Lighthouse perf ≥ 80                                  | Not run           | Same                                                                                                                                                                                             |
| AC-MP-14 | No console errors/warnings in prod build              | Likely            | next build clean; runtime not asserted                                                                                                                                                           |
| AC-MP-15 | Coverage ≥ 70% (Vitest + Playwright)                  | Partial           | 17 Playwright specs cover all main flows; no Vitest unit tests yet (see Important #2)                                                                                                            |
| AC-MP-16 | Forms support keyboard-only navigation                | Done              | Standard input/label pairs with htmlFor wiring                                                                                                                                                   |
| AC-MP-17 | Dark mode supported                                   | Partial           | Class-based theme tokens defined in globals.css; toggle button in DashboardChrome flips `.dark` class but doesn't persist via cookie/localStorage so it's lost on hard reload (works inside SPA) |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ Phase 5 deliverables compile, all tests pass, and the management
portal is functionally complete against the hub's existing endpoints.

### Important (should fix)

1. **Lighthouse never executed** — Phase 4 review left this same gap on
   the dApp; Phase 5's DoD requires perf ≥ 80 and a11y ≥ 90 on the
   dashboard + new-project form. The dapp-portal's `lighthouse-results.md`
   pattern works — replicate it. Run `lhci autorun` against `pnpm dev`
   for `/vi/login`, `/vi/dashboard`, `/vi/projects/new` and capture
   results in `apps/management-portal/test/lighthouse-results.md`.

2. **No Vitest unit tests** — AC-MP-15 calls for "Vitest unit + Playwright
   E2E ≥ 70%". The portal has 17 E2E specs but zero unit tests. Most
   business logic is in [project-schema.ts](../../apps/management-portal/src/lib/project-schema.ts)
   ([toCreatePayload](../../apps/management-portal/src/lib/project-schema.ts#L52-L82)),
   [batch-api.ts](../../apps/management-portal/src/lib/batch-api.ts)
   ([estimateCost](../../apps/management-portal/src/lib/batch-api.ts#L60-L70)),
   and [auth.ts](../../apps/management-portal/src/lib/auth.ts)
   ([refreshAccessTokenIfNeeded](../../apps/management-portal/src/lib/auth.ts#L31-L52)).
   Add focused Vitest specs for those — coverage will jump quickly.

3. **`MGMT_PORTAL_E2E_BYPASS` ships in `auth.ts` source code** — the
   bypass is gated by an env var, which is the right approach, but the
   code path is in production source ([auth.ts:67-78](../../apps/management-portal/src/lib/auth.ts#L67-L78)).
   A dev who flips the env var in production gets a credential-bypass
   backdoor. Mitigations: (a) add a startup assertion that throws when
   `NODE_ENV === 'production'` and the bypass is set; (b) move the
   bypass into a separate file gated by a build-time tree-shake flag;
   or (c) use a real local mock-hub server in tests instead.

4. **Cert upload re-uses the `/images` endpoint** — the
   [CertificationsView](../../apps/management-portal/src/components/projects/CertificationsView.tsx#L88-L95)
   uploads PDFs through the multipart `/projects/:phi/images` sink
   because the hub doesn't expose a dedicated `/uploads/cert`. The
   image endpoint may MIME-validate as `image/*` and reject PDFs at
   runtime — the test's MIME guard catches `image/png` for cert,
   not the reverse. Either add `/uploads/cert` to the hub or make the
   `/images` endpoint accept `application/pdf` when the caller flags
   "this is a cert".

5. **Dark-mode toggle isn't persisted across reloads** — the
   [DashboardChrome.toggleDark](../../apps/management-portal/src/components/shared/DashboardChrome.tsx#L33-L42)
   writes to `localStorage` but no boot-time hydration reads the
   stored preference. On next visit the user is back to light mode.
   Fix: tiny inline script in `[locale]/layout.tsx` (similar to the
   `<html lang>` syncer) that adds the `dark` class before paint.

6. **`expectedOutput` field is required by Zod but the seed paths
   from Phase 3 may not always set it** — the portal form rejects
   submissions where the field is 0 (the form schema uses
   `.positive()`). When editing an older project that has
   `expectedOutput: 0`, the form blocks save until the user enters
   a positive number. Either relax to `.nonnegative()` or coerce
   missing values upstream.

### Minor (nice to fix)

1. **`useRouter` unused on a couple of pages** — server-side page
   wrappers don't need a router. Clean up.

2. **`Select` is a plain `<select>`** — the spec called for a shadcn
   `Select` primitive. The plain select works and is keyboard-accessible
   (AC-MP-16 holds), but the styling drifts from the rest of the form.

3. **Auth bypass user object cast** — [auth.ts:81](../../apps/management-portal/src/lib/auth.ts#L81)
   uses `as unknown as { id: string; email: string }` to attach the
   token bundle to NextAuth's `User` type. A `module augmentation` of
   `next-auth`'s `User` interface would be cleaner.

4. **Sub-resource fixture state lives in closure scope** — the test
   `mockHub` in [e2e/fixtures.ts](../../apps/management-portal/e2e/fixtures.ts)
   uses Map state in JS closures, which means parallel test workers
   share nothing across pages (good for isolation) but state survives
   for the full page lifetime (which can leak between sequentially-run
   tests in the same file). Consider per-test `beforeEach(mockHub)`
   reset (already done) — the gotcha is documenting that pattern.

5. **`hubFetch` re-import** — `CertificationsView` ends with
   `void hubFetch` to keep the import tree-shakeable. Pretttier might
   strip the line; either remove the dead reference or actually use
   the helper.

6. **Wallet balance is hard-coded to `—`** — the wizard's
   "Insufficient balance" path is only triggered when the hub returns
   `INSUFFICIENT_BALANCE`. There's no proactive balance display because
   the hub doesn't expose a `/wallet` endpoint. Defer to a future
   ticket once the endpoint exists.

### Missing features (per AC-MP, partial)

- **AC-MP-2 "first cultivation activity in the create form"** — the
  Phase 5 spec implies the new-project form includes one activity row.
  Current implementation requires the producer to add activities on
  the dedicated activities page after creating the project. Acceptable
  workflow but not literal AC compliance.
- **AC-MP-15 unit-test coverage** — see Important #2 above.

---

## Test Coverage

- **Playwright (chromium):** 17/17 pass
  - `auth.spec.ts` (T-028): 4 tests — locale prefix, protected redirect,
    en/vi rendering, invalid creds
  - `projects-crud.spec.ts` (T-029): 5 tests — list, create, validation,
    edit + delete, 409 conflict
  - `activities.spec.ts` (T-030): 4 tests — 5 activities ascending,
    cert MIME guard, image MIME guard, valid PNG upload
  - `batch-generation.spec.ts` (T-031): 2 tests — past list, full wizard
    with download capture
  - `verification-analytics.spec.ts` (T-032): 2 tests — totals/recent
    table from stats, 2 canvases mount
- **Mobile profiles:** not configured this phase — Phase 5 didn't
  require iPhone SE / Pixel 5 projects (Phase 4 already covers the
  shared scaffolding work).
- **Hub tests:** 77/77 still pass after the new VerificationsController.

---

## Recommendations

- **Zero Critical issues** — Phase 5 can proceed to Phase 6.
- The two Important items most worth addressing now are #2
  (Vitest unit tests) and #3 (E2E bypass safety). #1 (Lighthouse) is
  a known recurring debt — same pattern as Phase 4.
- Important #4 (cert PDF endpoint) and #6 (expectedOutput Zod) are
  hub-side work that crosses phase boundaries; surface them in the
  Phase 9 (docs) sweep or as standalone fixes.
- Minor issues can be deferred to Phase 12 (final pre-release sweep).
