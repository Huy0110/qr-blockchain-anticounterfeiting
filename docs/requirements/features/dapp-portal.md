# Feature F4 — Consumer dApp Portal (`apps/dapp-portal/`)

**Module:** Next.js 14 (LTS) + React 18 + Tailwind + shadcn/ui — `output: 'export'` for IPFS pinning
**Priority:** P0
**Depends on:** F2, F3
**Paper section:** §5.2 (lines 566–698 — QR Scanning and Verification Workflow), §7.2 (lines 822 — IPFS deployment).

---

## Purpose

Anonymous, mobile-first decentralized app deployed to IPFS. When a consumer scans a public or private QR code, the QR redirects to this app. The app:

- For **public QR**: shows project metadata page (cooperative, vegetable type, location, cultivation timeline, certifications, images).
- For **private QR**: triggers redemption via hub, shows result (`AUTHENTIC` / `ALREADY_VERIFIED` / `COUNTERFEIT`) with on-chain evidence (tx hash + Polygonscan link).

App is content-addressed (IPFS CID). Once pinned, it cannot be tampered without changing the CID, so a malicious intermediary cannot serve a different UI.

---

## User stories

- **US-DA-1.** As a **consumer**, I want to scan a public QR with my phone camera and within ~5 s see the cooperative + vegetable type + traceability so that I trust the product before purchase.
- **US-DA-2.** As a **consumer**, I want to scroll through cultivation activities (chronological timeline) so that I see the production process (e.g., when fertilizer applied, harvest date).
- **US-DA-3.** As a **consumer**, I want to see certifications (VietGAP, Organic) with issuer + date and click to download PDF so that I verify them.
- **US-DA-4.** As a **consumer**, I want to scan a private QR after opening the package and within ~30 s see `AUTHENTIC` or `COUNTERFEIT` so that I confirm the product is genuine.
- **US-DA-5.** As a **consumer**, when I see `AUTHENTIC`, I want a clickable transaction hash so that I can verify on Polygonscan independently.
- **US-DA-6.** As a **consumer**, when I see `ALREADY_VERIFIED`, I want a clear message + the original verification timestamp so that I can take action (complain to seller).
- **US-DA-7.** As a **consumer**, I want to switch between Vietnamese (default) and English so that I can use the app comfortably.
- **US-DA-8.** As a **consumer**, I want the app to work offline-first as much as possible (cache last-seen project metadata) so that flaky 4G doesn't break the experience.
- **US-DA-9.** As a **reviewer**, I want the app to be content-addressed (IPFS CID printed in the footer) so that I verify it hasn't been tampered.
- **US-DA-10.** As a **reviewer**, I want a `/about` page documenting the verification flow + linking to the GitHub repo + paper DOI so that I can audit.

---

## Detailed requirements

### Tech stack

- **Next.js 14 LTS** App Router with `output: 'export'` (static export → IPFS).
- **React 18**.
- **Tailwind CSS** + **shadcn/ui** + **lucide-react** icons.
- **next-intl** for i18n (VI default, EN secondary).
- **TanStack Query** for hub API calls.
- **html5-qrcode** or **@zxing/browser** for in-browser QR scanning (camera fallback if QR redirect doesn't work directly).
- No NextAuth (anonymous app).
- Deployed via `pnpm build && pnpm export` → `out/` → `pinata-cli pin-file out/`.

### Routes

```
app/
  [locale]/
    layout.tsx                       # i18n + theme + footer (with CID)
    page.tsx                         # landing: "Scan QR or paste URL"
    projects/[projectId]/page.tsx    # public scan landing
    scan/[projectId]/[secretId]/page.tsx  # private scan landing
    scanner/page.tsx                 # in-app camera scanner (alternative entry)
    about/page.tsx                   # about + repo link + paper citation
    not-found.tsx                    # generic 404
```

### Public scan flow (`/projects/[projectId]`)

1. On mount: call `GET {HUB_BASE_URL}/scan/public/:phi`.
2. If `404` → render "Unknown project" with explanation.
3. If `200` → render:
   - Hero: cooperative name + vegetable type + harvest date.
   - Image gallery (carousel of `imageUrls`).
   - Cultivation timeline (vertical, sorted by `activityDate`).
   - Certifications grid with issuer + dates + click-to-download PDF.
   - Map (Leaflet) if `coordinates` present.
   - Footer: CID + repo link.

### Private scan flow (`/scan/[projectId]/[secretId]`)

1. On mount: show "Verifying product..." spinner.
2. Call `POST {HUB_BASE_URL}/scan/private` body `{phi: projectId, sid: secretId}`.
3. Render outcome:
   - `AUTHENTIC` (green): "✅ Sản phẩm chính hãng" / "✅ Authentic product" + verification timestamp + tx hash (clickable to Polygonscan) + emitted event details (decoded).
   - `ALREADY_VERIFIED` (yellow): "⚠️ Đã được xác thực" / "⚠️ Already verified" + previous verification timestamp + previous tx hash + suggestion to contact seller.
   - `COUNTERFEIT` (red): "❌ Sản phẩm không hợp lệ" / "❌ Counterfeit" + brief explanation + link to report.
4. Below result: link to project metadata page (`/projects/[projectId]`).

### In-app scanner (`/scanner`)

- Request camera permission.
- Use `html5-qrcode` to scan; on detection, parse URL and route accordingly.
- Permission denied → instructions to enable camera or paste URL manually.

### i18n

- `vi.json`, `en.json`.
- All user-visible strings translated.
- Locale persisted in `localStorage` (no backend session).
- Locale auto-detect: `Accept-Language` → fallback `vi`.

### Mobile-first styling

- Tailwind breakpoints: design from 320px up.
- Tap targets ≥ 44×44 px (Apple HIG).
- Font: system-ui (Roboto on Android, San Francisco on iOS).
- Loading states: skeleton screens, not spinners.

### IPFS deploy considerations

- All assets relative paths (no `/_next/...` absolute references that break on IPFS gateway).
- Use `next.config.js` `assetPrefix: ''` and `images.unoptimized: true`.
- `trailingSlash: true` for IPFS-friendly routing.
- `next-intl` middleware NOT used (incompatible with static export); use locale folders.
- Map `[locale]/[...slug]` to file structure.
- Test build with `npx http-server out` before pinning.

### Configuration (`.env.example` for build time)

```
NEXT_PUBLIC_HUB_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BLOCKCHAIN_EXPLORER=https://amoy.polygonscan.com
NEXT_PUBLIC_GITHUB_REPO=https://github.com/Huy0110/qr-blockchain-anticounterfeiting
NEXT_PUBLIC_PAPER_DOI=                      # filled after Zenodo mint
NEXT_PUBLIC_BUILD_CID=                      # injected post-pin
```

---

## Edge cases

| #        | Scenario                                            | Expected behavior                                                                                 |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| EC-DA-1  | QR redirect URL malformed                           | Show "Invalid QR" page with paste-URL fallback                                                    |
| EC-DA-2  | Hub unreachable                                     | Show "Cannot connect to verification service. Please check internet and retry." with retry button |
| EC-DA-3  | Hub returns 5xx                                     | Same as EC-DA-2, log to console                                                                   |
| EC-DA-4  | User scans private QR but tx submission times out   | Show "Network confirmation slow. Your scan was submitted, please wait or refresh in 1 min."       |
| EC-DA-5  | Camera permission denied                            | Show instructions + paste-URL fallback                                                            |
| EC-DA-6  | Slow 3G on Vietnamese rural area                    | Skeleton screens immediately; lazy-load images; show network indicator                            |
| EC-DA-7  | User scans on desktop (no camera)                   | Detect and hide /scanner route entry; offer URL paste                                             |
| EC-DA-8  | Browser blocks 3rd-party cookies (privacy mode)     | App still works (no cookies needed for anonymous flows)                                           |
| EC-DA-9  | Project metadata has no images                      | Show placeholder vegetable icon                                                                   |
| EC-DA-10 | PDF certification > 5 MB                            | Open in new tab; don't inline preview                                                             |
| EC-DA-11 | User refreshes private QR scan page after AUTHENTIC | Detect via URL; second visit returns ALREADY_VERIFIED with prior data — display calmly            |
| EC-DA-12 | URL contains uppercase phi/sid                      | Normalize to lowercase before sending to hub                                                      |

---

## Acceptance criteria

| #        | Criterion                                                                              | Maps to             | Verified by                       |
| -------- | -------------------------------------------------------------------------------------- | ------------------- | --------------------------------- |
| AC-DA-1  | Public scan page renders within 6 s on 4G                                              | Paper Table 3 row 2 | Lighthouse + E2E timing           |
| AC-DA-2  | Private scan AUTHENTIC renders within 35 s on Amoy                                     | Paper Table 3 row 3 | E2E                               |
| AC-DA-3  | Private scan ALREADY_VERIFIED renders within 5 s                                       | Paper Table 3 row 4 | E2E                               |
| AC-DA-4  | Private scan COUNTERFEIT renders within 5 s                                            | Paper Table 3 row 4 | E2E                               |
| AC-DA-5  | TX hash on AUTHENTIC links to Polygonscan and resolves to a real ProductRedeemed event | SR3                 | E2E                               |
| AC-DA-6  | App is fully usable on iPhone SE viewport (375×667)                                    | Mobile-first        | Manual + Playwright mobile preset |
| AC-DA-7  | App is fully usable on Pixel 5 viewport (393×851)                                      | Mobile-first        | Manual + Playwright               |
| AC-DA-8  | Language toggle works without round-trip to hub                                        | i18n                | E2E                               |
| AC-DA-9  | Build CID printed in footer matches actual IPFS pin CID (post-deploy script verifies)  | reproducibility     | Deploy script                     |
| AC-DA-10 | Lighthouse mobile performance ≥ 85 on public scan page                                 | NFR                 | CI                                |
| AC-DA-11 | Lighthouse accessibility ≥ 90 on all pages                                             | Accessibility       | CI                                |
| AC-DA-12 | App works when served from `ipfs.io/ipfs/<CID>/` (relative paths verified)             | IPFS deploy         | Manual + smoke test               |
| AC-DA-13 | All routes generate static files (no SSR runtime needed)                               | IPFS deploy         | `output: 'export'` build succeeds |
| AC-DA-14 | App degrades gracefully when hub is offline (offline indicator + cached read)          | resilience          | E2E                               |
| AC-DA-15 | Console: zero errors or warnings in production build                                   | quality             | CI                                |
| AC-DA-16 | E2E test coverage of 3 main flows (public, private valid, private invalid)             | quality             | CI                                |
| AC-DA-17 | About page shows GitHub repo + paper DOI + build CID                                   | reproducibility     | Manual                            |

---

## Non-goals

- No user accounts.
- No persistent history of scans (paper §5.3 — consumer privacy).
- No payments / NFC / hardware integration.
- No native app (responsive web works).
- No PWA install prompt in v1 (defer to v2).
- No analytics/tracking beyond anonymous Lighthouse-equivalent metrics.
