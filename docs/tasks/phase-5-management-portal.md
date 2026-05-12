# Phase 5 — Management Portal (`apps/management-portal/`)

**Goal:** Producer-facing Next.js app with auth, project CRUD, batch generation wizard, and verification analytics. Standard Next.js (NOT static export — needs runtime auth).
**Effort:** ~3.5 days total (5 tickets).
**Prerequisites:** Phase 2 + Phase 3.

> Can run in **parallel** with Phase 4.

---

### T-028 — Mgmt Portal scaffolding + NextAuth + i18n

**Phase:** 5 · **Feature:** F5 · **Effort:** M

**Description.** Next.js 14 App Router (no static export). NextAuth credentials provider talks to hub `/auth/login`.

**Files to create/modify:**

- `apps/management-portal/package.json`, `tsconfig.json`, `next.config.mjs`
- `apps/management-portal/tailwind.config.ts`, `postcss.config.mjs`, `components.json`
- `apps/management-portal/Dockerfile`
- `apps/management-portal/.env.example`
- `apps/management-portal/src/app/layout.tsx`, `globals.css`
- `apps/management-portal/src/app/[locale]/layout.tsx` — i18n + auth provider
- `apps/management-portal/src/app/api/auth/[...nextauth]/route.ts` — NextAuth v5 config
- `apps/management-portal/src/app/[locale]/(auth)/login/page.tsx`
- `apps/management-portal/src/app/[locale]/(auth)/register/page.tsx`
- `apps/management-portal/src/lib/auth.ts` — Auth.js config
- `apps/management-portal/src/lib/api-client.ts` — fetch wrapper with JWT injection + refresh
- `apps/management-portal/messages/vi.json`, `messages/en.json`
- `apps/management-portal/public/logo.svg` (placeholder)
- shadcn components installed: `button`, `card`, `input`, `label`, `form`, `dialog`, `dropdown-menu`, `tabs`, `toast`, `skeleton`

**Acceptance criteria refs:** AC-MP-1, AC-MP-8, AC-MP-9
**ADRs:** ADR-003 (regular Next.js for mgmt portal), ADR-009
**Depends on:** T-014, T-023 (shared shadcn install patterns).
**Definition of Done:**

- [ ] `pnpm --filter management-portal dev` boots on 3001.
- [ ] Producer can register + login + receive JWT (cookie-stored).
- [ ] Auto refresh on access token expiry.
- [ ] Default locale `vi`; toggle persists.
- [ ] Protected routes redirect to `/login` when not authenticated.

---

### T-029 — Dashboard + Project list + Create/Edit forms

**Phase:** 5 · **Feature:** F5 · **Effort:** M

**Description.** Dashboard with project list table, "New Project" form, edit form. Form uses `react-hook-form` + Zod schema from `@qr-bc/shared`.

**Files to create/modify:**

- `apps/management-portal/src/app/[locale]/(dashboard)/layout.tsx` — sidebar + topbar
- `apps/management-portal/src/app/[locale]/(dashboard)/page.tsx` — overview
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/page.tsx` — list with shadcn DataTable
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/new/page.tsx`
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/page.tsx`
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/edit/page.tsx`
- `apps/management-portal/src/components/projects/ProjectTable.tsx`
- `apps/management-portal/src/components/projects/ProjectForm.tsx`
- `apps/management-portal/src/components/projects/StatusBadge.tsx`
- `apps/management-portal/src/components/projects/MapPicker.tsx` (lazy Leaflet)
- `apps/management-portal/src/lib/use-projects.ts` — TanStack Query hooks
- `apps/management-portal/e2e/projects-crud.spec.ts`

**Acceptance criteria refs:** AC-MP-1, AC-MP-2, AC-MP-7, AC-MP-10, AC-MP-13, AC-MP-16
**ADRs:** —
**Depends on:** T-016 (hub endpoints), T-028.
**Definition of Done:**

- [ ] Dashboard lists own projects only (server-enforced; UI never sees others').
- [ ] "New Project" form creates project end-to-end (off-chain + on-chain).
- [ ] Edit form updates project; conflicting concurrent edits show merge dialog.
- [ ] Status badge reflects `in_progress | harvesting | finished`.
- [ ] Inline validation errors localized.
- [ ] Lighthouse perf ≥ 80, a11y ≥ 90 on dashboard + new project form.
- [ ] E2E covers create + edit + soft-delete.

---

### T-030 — Activities + Certifications + Images pages

**Phase:** 5 · **Feature:** F5 · **Effort:** M

**Description.** Sub-resource UIs nested under a project.

**Files to create/modify:**

- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/activities/page.tsx`
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/certifications/page.tsx`
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/images/page.tsx`
- `apps/management-portal/src/components/projects/ActivityList.tsx`, `ActivityForm.tsx`, `ActivityTimeline.tsx`
- `apps/management-portal/src/components/projects/CertificationList.tsx`, `CertificationUploadForm.tsx`
- `apps/management-portal/src/components/projects/ImageGallery.tsx`, `ImageUpload.tsx` — multipart with progress bar
- `apps/management-portal/e2e/activities.spec.ts`

**Acceptance criteria refs:** AC-MP-3, AC-MP-4
**ADRs:** —
**Depends on:** T-017, T-018, T-029.
**Definition of Done:**

- [ ] Producer can add 5+ cultivation activities with full metadata.
- [ ] Activity timeline view sorts by `activityDate` ascending.
- [ ] PDF certification upload shows progress and links the resulting IPFS URL.
- [ ] Image upload supports up to 10 files with progress.
- [ ] Cancel mid-upload works.
- [ ] EC-MP-5 (MIME mismatch) handled with clear error toast.

---

### T-031 — Batch generation wizard

**Phase:** 5 · **Feature:** F5 · **Effort:** M

**Description.** 4-step wizard: select project → input N → preview cost → confirm + generate. Show progress; auto-download ZIP; render tx hash with Polygonscan link.

**Files to create/modify:**

- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/batches/page.tsx` — list of past batches
- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/batches/new/page.tsx` — wizard
- `apps/management-portal/src/components/batches/BatchWizard.tsx` — stepper
- `apps/management-portal/src/components/batches/BatchCostPreview.tsx`
- `apps/management-portal/src/components/batches/BatchProgress.tsx`
- `apps/management-portal/src/lib/use-batch.ts`
- `apps/management-portal/e2e/batch-generation.spec.ts`

**Acceptance criteria refs:** AC-MP-5, AC-MP-6, EC-MP-2, EC-MP-3, EC-MP-4
**ADRs:** ADR-014
**Depends on:** T-022 (hub batches endpoint), T-029.
**Definition of Done:**

- [ ] Wizard generates ZIP for N=10 within 15s on Hardhat.
- [ ] ZIP downloads automatically; shadcn toast confirms success with Polygonscan link.
- [ ] Past-batches list shows status (pending/confirmed/failed) per record.
- [ ] If wallet has 0 MATIC, wizard shows refill instructions + faucet link.
- [ ] If user navigates away mid-generation and returns, batch list shows the new entry.

---

### T-032 — Verification analytics + final E2E

**Phase:** 5 · **Feature:** F5 · **Effort:** M

**Description.** Per-project verification log analytics: counts donut chart, daily line chart, recent scan table.

**Files to create/modify:**

- `apps/management-portal/src/app/[locale]/(dashboard)/projects/[phi]/verifications/page.tsx`
- `apps/management-portal/src/components/projects/VerificationStatsCards.tsx`
- `apps/management-portal/src/components/projects/VerificationDailyChart.tsx` — Chart.js line
- `apps/management-portal/src/components/projects/VerificationOutcomeDonut.tsx`
- `apps/management-portal/src/components/projects/RecentVerificationsTable.tsx`
- `apps/management-portal/e2e/verification-analytics.spec.ts`
- Final coverage gate via Playwright + Vitest

**Acceptance criteria refs:** AC-MP-8, AC-MP-11, AC-MP-12, AC-MP-13, AC-MP-14, AC-MP-15, AC-MP-17
**ADRs:** —
**Depends on:** T-029.
**Definition of Done:**

- [ ] With seeded data, verification page shows counts per outcome.
- [ ] Daily chart shows last 30 days.
- [ ] Recent table shows last 50 scans with txHash links.
- [ ] Lighthouse perf ≥ 80 on verifications page.
- [ ] Dark mode renders correctly across all pages.
- [ ] Mgmt portal coverage ≥ 70% (Vitest + Playwright combined).
