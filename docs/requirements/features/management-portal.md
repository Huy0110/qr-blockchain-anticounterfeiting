# Feature F5 — Management Portal (`apps/management-portal/`)

**Module:** Next.js 14 (LTS) + React 18 + Tailwind + shadcn/ui
**Priority:** P0
**Depends on:** F2, F3
**Paper section:** §7.2 (lines 819–820 — "Centralized Product Management Portal").

---

## Purpose

Producer-facing web app for vegetable cooperatives to:

- Authenticate (email + password).
- CRUD project metadata, cultivation activities, certifications, images.
- Trigger batch QR generation.
- Download QR ZIP for printing.
- Monitor project status.

Deployed alongside hub (NOT on IPFS — this app talks to private hub APIs and producers log in here).

---

## User stories

- **US-MP-1.** As a **producer**, I want a clean dashboard listing my projects with status badges so that I can see what's active.
- **US-MP-2.** As a **producer**, I want a "New Project" form with all metadata fields so that I can create a project in < 5 minutes.
- **US-MP-3.** As a **producer**, I want to add a cultivation activity inline (date, type, name, description, materials, note) so that the public QR page shows a timeline.
- **US-MP-4.** As a **producer**, I want to upload PDFs for certifications and JPGs for product images, with progress bar feedback, so that I trust the upload completed.
- **US-MP-5.** As a **producer**, I want a "Generate QR Batch" wizard: pick project → pick N (1–500) → preview cost (in MATIC equivalent + USD estimate) → confirm → wait progress → download ZIP. So that I can print private QRs at scale.
- **US-MP-6.** As a **producer**, I want each ZIP to contain N PNG files named `private_001.png`...`private_NNN.png` + 1 file `public.png`, plus a `manifest.json` mapping filename → secretId (in case I lose the printout). So I have a backup.
- **US-MP-7.** As a **producer**, I want to switch UI language between Vietnamese (default) and English so that I can use the tool comfortably.
- **US-MP-8.** As a **producer**, I want to see a recent verification log per project (counts of AUTHENTIC / ALREADY_VERIFIED / COUNTERFEIT) so that I can detect anomalies (e.g., many COUNTERFEITs = printer leak).

---

## Detailed requirements

### Tech stack

- **Next.js 14 LTS** App Router.
- `output: 'export'` is NOT used here (this app talks to authenticated APIs; it can be SSR/static hybrid). Actually default standard build.
- **React 18**, **TypeScript** strict.
- **Tailwind CSS** + **shadcn/ui** components.
- **next-intl** for i18n (VI default, EN secondary).
- **TanStack Query** (`@tanstack/react-query`) for server state.
- **react-hook-form** + Zod for forms.
- **lucide-react** for icons.
- **NextAuth.js v5** (Auth.js) with credentials provider, JWT-strategy, talks to hub `/auth/login`.

### Routes (App Router)

```
app/
  [locale]/
    layout.tsx                 # i18n provider, theme provider
    (auth)/
      login/page.tsx
      register/page.tsx
    (dashboard)/
      layout.tsx               # sidebar + topbar
      page.tsx                 # dashboard overview
      projects/
        page.tsx               # project list
        new/page.tsx           # create project
        [phi]/
          page.tsx             # project detail
          edit/page.tsx        # edit metadata
          activities/page.tsx  # cultivation activity log
          certifications/page.tsx
          images/page.tsx
          batches/
            page.tsx           # batch generation history
            new/page.tsx       # wizard: pick N + confirm + download
          verifications/page.tsx  # verification log analytics
      account/
        page.tsx               # profile, wallet address (read-only)
```

### UI components (shadcn/ui)

- `<DataTable>` for projects + activity lists.
- `<Form>` + `<Input>`/`<Textarea>`/`<Select>` for CRUD forms.
- `<Dialog>` for confirmations (delete project, etc.).
- `<Stepper>` or `<Wizard>` (custom) for batch generation flow.
- `<Toast>` (`<Sonner>`) for success/error notifications.
- `<Badge>` for project status.
- `<Calendar>` / `<DatePicker>` for harvest/start dates.
- `<MapPicker>` (Leaflet wrapped) for coordinates input — optional, can fall back to manual lat/lng input.

### Forms validation (Zod schemas in `@qr-bc/shared`)

- ProjectMetadata schema enforced client + server.
- File upload: max 10 MB, MIME whitelist (`image/jpeg`, `image/png`, `application/pdf`).
- Cultivation activity: `activityDate ≤ today`, `name 1–100 chars`, `materials` is array of 1–50 char strings.

### i18n

- Default locale: `vi`.
- Secondary: `en`.
- Translations in `messages/vi.json`, `messages/en.json`.
- Date formatting via `date-fns/locale/vi`.

### Authentication flow

1. User enters email + password → POST `/auth/login` on hub → receives `{accessToken, refreshToken}`.
2. NextAuth stores tokens in HTTP-only cookies.
3. All subsequent fetches inject `Authorization: Bearer <accessToken>`.
4. On 401, attempt refresh via `/auth/refresh`; on second 401, redirect to login.

### Batch generation wizard (UX detail)

Step 1: Select project (dropdown of own projects).
Step 2: Enter N (1–500). Show cost estimate (`N × ~$0.0001 + base $0.001`).
Step 3: Review summary, confirm. Click → POST `/projects/:phi/batches`.
Step 4: Polling progress (or SSE if implemented). Show "Generating sid_i..." → "Submitting on-chain..." → "Waiting for confirmation..." → "Building ZIP...".
Step 5: Auto-download ZIP. Display tx hash + Polygonscan link.

### Verification log analytics (per project)

- Pull `/projects/:phi/verifications?since=...` (off-chain log).
- Render: line chart of scans per day, donut of outcome distribution, table of recent N=50 scans with txHash links.

---

## Edge cases

| #       | Scenario                                                 | Expected behavior                                                                         |
| ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| EC-MP-1 | User submits create-project form with stale CSRF         | NextAuth invalidates, retry from form                                                     |
| EC-MP-2 | Network down mid batch generation                        | Wizard shows error, suggests retry; no client-side state lost                             |
| EC-MP-3 | User leaves wizard mid-generation                        | Server-side tx already submitted; on return, batches list shows new entry with status     |
| EC-MP-4 | Producer wallet has 0 MATIC for `registerBatch`          | Hub returns `503` with message; wizard shows refill instructions + faucet link (Amoy)     |
| EC-MP-5 | User uploads PDF that's actually JS file (MIME mismatch) | Server rejects (sniffs header); show error toast                                          |
| EC-MP-6 | Two browser tabs editing same project                    | Last-write-wins with optimistic locking via `updatedAt` ETag; conflict shows merge dialog |
| EC-MP-7 | Date pickers default to wrong locale                     | Verified fix: `date-fns/locale/vi` + `date-fns/locale/enUS` selected by `useLocale()`     |
| EC-MP-8 | Image upload very slow on mobile                         | Show progress %; allow cancel                                                             |

---

## Acceptance criteria

| #        | Criterion                                                                                   | Verified by                  |
| -------- | ------------------------------------------------------------------------------------------- | ---------------------------- | ----------------- |
| AC-MP-1  | Producer can register and log in                                                            | E2E (Playwright)             |
| AC-MP-2  | Producer can create a project with all required fields and one cultivation activity         | E2E                          |
| AC-MP-3  | Producer can upload a PDF certification and see it linked to the project                    | E2E                          |
| AC-MP-4  | Producer can upload 3 product images, all pinned to IPFS                                    | E2E                          |
| AC-MP-5  | Batch wizard generates N=10 QR ZIP within 15 s end-to-end on Amoy                           | Paper Table 3 row 1 (scaled) | E2E               |
| AC-MP-6  | ZIP contains correct count, manifest.json, and one public.png                               | E2E                          |
| AC-MP-7  | Producer cannot view another producer's project list (server enforces; UI never even tries) | SR1, security                | Integration       |
| AC-MP-8  | Language toggle switches all visible text without page reload                               | i18n                         | E2E               |
| AC-MP-9  | Default locale on first visit = `vi`; persisted in cookie thereafter                        | i18n                         | Manual + E2E      |
| AC-MP-10 | All forms have inline validation errors in current locale                                   | UX                           | E2E               |
| AC-MP-11 | Verification analytics chart renders correctly with seeded data (3 demo HTX)                | Demo                         | E2E               |
| AC-MP-12 | Lighthouse accessibility score ≥ 90 on key pages (login, dashboard, new project)            | NFR                          | CI Lighthouse     |
| AC-MP-13 | Lighthouse performance score ≥ 80 on dashboard                                              | NFR                          | CI Lighthouse     |
| AC-MP-14 | No console errors or warnings in production build                                           | quality                      | CI                |
| AC-MP-15 | Coverage ≥ 70% (Vitest unit + Playwright E2E)                                               | quality                      | CI                |
| AC-MP-16 | All forms support keyboard-only navigation                                                  | Accessibility                | Manual + axe-core |
| AC-MP-17 | Dark mode supported (Tailwind `dark:` variants)                                             | UX                           | Manual            |

---

## Non-goals

- No native mobile app (responsive web only; producer typically on desktop for batch generation anyway).
- No real-time websockets (TanStack Query polling 30s is fine).
- No multi-step approval workflows (single producer, single approval = themselves).
- No in-app messaging / chat.
- No analytics beyond per-project verification chart.
