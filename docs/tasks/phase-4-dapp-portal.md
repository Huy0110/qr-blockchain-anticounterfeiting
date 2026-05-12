# Phase 4 — Consumer dApp (`apps/dapp-portal/`)

**Goal:** Mobile-first Next.js static-export app deployable to IPFS. Renders public scan + private scan pages with i18n VI/EN.
**Effort:** ~3.5 days total (5 tickets).
**Prerequisites:** Phase 2 + Phase 3.

> Phase 4 and Phase 5 can be **parallelized** — both depend on the same prerequisites.

---

### T-023 — dApp scaffolding + Tailwind + shadcn/ui + i18n

**Phase:** 4 · **Feature:** F4 · **Effort:** M

**Description.** Initialize Next.js 14 App Router with `output: 'export'` for IPFS pinning. Set up Tailwind, shadcn/ui, next-intl with locale folder routing.

**Files to create/modify:**

- `apps/dapp-portal/package.json`, `tsconfig.json`, `next.config.mjs` (with `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`)
- `apps/dapp-portal/tailwind.config.ts`, `postcss.config.mjs`, `components.json`
- `apps/dapp-portal/Dockerfile`
- `apps/dapp-portal/.env.example` per [inter-service-contract.md](../architecture/inter-service-contract.md)
- `apps/dapp-portal/src/app/layout.tsx`, `globals.css`
- `apps/dapp-portal/src/app/[locale]/layout.tsx` — i18n provider
- `apps/dapp-portal/src/app/[locale]/page.tsx` — landing page (paste URL or scan)
- `apps/dapp-portal/src/app/[locale]/about/page.tsx` — links to repo + paper DOI; shows IPFS CID footer
- `apps/dapp-portal/src/app/not-found.tsx`
- `apps/dapp-portal/src/lib/api-client.ts` — fetch wrapper to hub
- `apps/dapp-portal/src/lib/i18n.ts` — locale utilities
- `apps/dapp-portal/messages/vi.json`, `messages/en.json`
- `apps/dapp-portal/public/logo.svg` (placeholder; final in T-043), `favicon.ico`
- shadcn components installed via CLI: `button`, `card`, `skeleton`, `toast`, `tabs`, `badge`

**Acceptance criteria refs:** AC-DA-13, AC-DA-15
**ADRs:** ADR-003 (Next.js export for dApp), ADR-009 (vi default)
**Depends on:** T-002, T-011.
**Definition of Done:**

- [ ] `pnpm --filter dapp-portal dev` boots on port 3002.
- [ ] `pnpm --filter dapp-portal build && pnpm --filter dapp-portal export` produces `out/` directory.
- [ ] `npx http-server out -p 8000` serves the app; landing page renders.
- [ ] Default locale `vi`; toggle to `en` works.
- [ ] About page shows repo link + placeholder DOI + build CID env var.
- [ ] No console errors in production build.

---

### T-024 — Public scan page (`/projects/[projectId]`)

**Phase:** 4 · **Feature:** F4 · **Effort:** M

**Description.** Render project metadata returned from hub `GET /scan/public/:phi`. Includes traceability timeline, certifications, image gallery, optional Leaflet map.

**Files to create/modify:**

- `apps/dapp-portal/src/app/[locale]/projects/[projectId]/page.tsx`
- `apps/dapp-portal/src/components/traceability/TraceabilityTimeline.tsx`
- `apps/dapp-portal/src/components/traceability/CertificationCard.tsx`
- `apps/dapp-portal/src/components/traceability/ImageGallery.tsx`
- `apps/dapp-portal/src/components/traceability/LocationMap.tsx` (lazy-loaded Leaflet)
- `apps/dapp-portal/src/components/traceability/ProjectHeader.tsx`
- `apps/dapp-portal/src/lib/use-public-scan.ts` — TanStack Query hook
- `apps/dapp-portal/messages/vi.json`, `messages/en.json` — keys for traceability copy
- `apps/dapp-portal/e2e/public-scan.spec.ts` — Playwright

**Acceptance criteria refs:** AC-DA-1, AC-DA-2, AC-DA-3, AC-DA-6, AC-DA-7
**ADRs:** —
**SR/R mapping:** R3 (accessibility)
**Depends on:** T-020 (hub endpoint), T-023.
**Definition of Done:**

- [ ] Visiting `/vi/projects/0x<phi>` for a real seeded project renders cooperative + vegetable + activities + certs + images within 6 s on simulated 4G.
- [ ] Unknown phi shows "Unknown project" with paste-URL fallback.
- [ ] All UI strings keyed (no hard-coded VN/EN text).
- [ ] Mobile-first: works on iPhone SE (375×667) and Pixel 5 (393×851).
- [ ] Lighthouse a11y ≥ 90, mobile perf ≥ 85.
- [ ] Map lazy-loaded only if `coordinates` present.
- [ ] Playwright covers 3 cases: real project, unknown phi, project with no coordinates.

---

### T-025 — Private scan page (`/scan/[projectId]/[secretId]`)

**Phase:** 4 · **Feature:** F4 · **Effort:** M

**Description.** Submits to hub `POST /scan/private` and renders one of three outcomes with on-chain evidence (txHash → Polygonscan).

**Files to create/modify:**

- `apps/dapp-portal/src/app/[locale]/scan/[projectId]/[secretId]/page.tsx`
- `apps/dapp-portal/src/components/scan/AuthenticResult.tsx` — green badge, txHash link, event args, verifiedAt timestamp
- `apps/dapp-portal/src/components/scan/AlreadyVerifiedResult.tsx` — yellow, prior timestamp + tx
- `apps/dapp-portal/src/components/scan/CounterfeitResult.tsx` — red, message + report link
- `apps/dapp-portal/src/components/scan/ScanProgress.tsx` — multi-stage spinner (Verifying / Submitting / Confirming)
- `apps/dapp-portal/src/lib/use-private-scan.ts`
- `apps/dapp-portal/messages/vi.json` + `en.json` — outcome strings
- `apps/dapp-portal/e2e/private-scan.spec.ts` — Playwright (uses seed data + Hardhat)

**Acceptance criteria refs:** AC-DA-4, AC-DA-5, AC-DA-6, AC-DA-7
**ADRs:** —
**SR/R mapping:** SR3 (txHash visible to consumer for independent audit)
**Depends on:** T-020, T-023.
**Definition of Done:**

- [ ] Valid sid → `AUTHENTIC` rendered within 35s on Amoy / 5s on Hardhat.
- [ ] Already-redeemed sid → `ALREADY_VERIFIED` within 5s.
- [ ] Invalid sid → `COUNTERFEIT` within 5s.
- [ ] txHash on AUTHENTIC opens Polygonscan in new tab and shows real `ProductRedeemed` event.
- [ ] Refresh of `AUTHENTIC` page shows `ALREADY_VERIFIED` (correct, since same sid now redeemed).
- [ ] Both languages tested.
- [ ] Mobile-first verified.

---

### T-026 — Scanner page + URL paste fallback + about

**Phase:** 4 · **Feature:** F4 · **Effort:** S

**Description.** In-app camera scanner using `html5-qrcode`. About page with CID, repo link, paper DOI.

**Files to create/modify:**

- `apps/dapp-portal/src/app/[locale]/scanner/page.tsx`
- `apps/dapp-portal/src/components/scan/CameraScanner.tsx`
- `apps/dapp-portal/src/components/scan/UrlPasteFallback.tsx`
- `apps/dapp-portal/src/app/[locale]/about/page.tsx` — finalize with all metadata
- `apps/dapp-portal/src/components/shared/CidFooter.tsx` — reads CID from URL pathname (`window.location.pathname` parse)

**Acceptance criteria refs:** AC-DA-9, AC-DA-17, EC-DA-5, EC-DA-7
**ADRs:** —
**Depends on:** T-023.
**Definition of Done:**

- [ ] Camera permission prompt; on grant, scanner detects QR and routes accordingly.
- [ ] Permission denied → instructions + paste-URL fallback works.
- [ ] On desktop (no camera), scanner page hides camera section, shows paste fallback.
- [ ] About page shows IPFS CID extracted from current URL (works only when served via gateway).
- [ ] About page links to GitHub repo + placeholder DOI.

---

### T-027 — Static export build + IPFS deploy script + final E2E

**Phase:** 4 · **Feature:** F4 · **Effort:** S

**Description.** Lock in static export config, IPFS deploy script (Pinata), final E2E coverage.

**Files to create/modify:**

- `apps/dapp-portal/next.config.mjs` — final tweaks for IPFS gateway compat
- `apps/dapp-portal/ipfs-deploy.sh` — `pnpm build && pnpm dlx @pinata/cli pin out/`
- `apps/dapp-portal/test/lighthouse.config.js` — perf ≥ 85, a11y ≥ 90
- `apps/dapp-portal/e2e/full-dapp.spec.ts` — all 3 routes + language toggle + offline

**Acceptance criteria refs:** AC-DA-10, AC-DA-11, AC-DA-12, AC-DA-13, AC-DA-14, AC-DA-16
**ADRs:** ADR-003
**Depends on:** T-024, T-025, T-026.
**Definition of Done:**

- [ ] `pnpm build && pnpm export` produces fully static `out/` (no `_next/server` runtime needs).
- [ ] `npx http-server out` allows full app exercise from `localhost:8000/vi/...`.
- [ ] Lighthouse perf ≥ 85, a11y ≥ 90 on key pages.
- [ ] Playwright `full-dapp.spec.ts` runs all 3 main flows + locale switch.
- [ ] When hub is offline, dApp shows "Cannot connect" with retry button (no white-screen).
- [ ] `ipfs-deploy.sh` runs (dry-run with `--dry`) and reports estimated CID; full pin gated behind `PINATA_JWT`.
