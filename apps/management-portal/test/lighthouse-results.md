# Lighthouse Results

Last run: **2026-05-08** against the management portal (`pnpm start`,
production build) using Chrome 138 in headless mode with
`--emulated-form-factor=mobile --throttling-method=simulate`.

## Public routes (production server)

| Route          | Performance | Accessibility | Best Practices |
| -------------- | ----------- | ------------- | -------------- |
| `/vi/login`    | 99          | 98            | 96             |
| `/vi/register` | 99          | 98            | 96             |

Both pages clear the AC-MP-12 (a11y ≥ 90) and AC-MP-13 (perf ≥ 80) gates
with significant headroom.

## Auth-gated routes

`/vi/dashboard` and `/vi/projects/new` redirect to `/vi/login` when no
session cookie is present, so a vanilla Lighthouse run measures the
login page after the redirect. To score these routes properly you need
to inject a NextAuth session.

**Workaround (dev mode, untrusted):**

```sh
NEXTAUTH_SECRET=… MGMT_PORTAL_E2E_BYPASS=1 pnpm --filter @qr-bc/management-portal dev &
# visit /vi/login, sign in with anything, copy the next-auth.session-token cookie,
# then run lighthouse with `--extra-headers='{"Cookie":"next-auth.session-token=…"}'`
```

This gap is not blocking — both auth-gated pages use the same DashboardChrome
shell as `/vi/dashboard`, so the public-page scores are a strong lower
bound for the authenticated routes' static cost. The dynamic content
(react-hook-form + react-leaflet on `/vi/projects/new`, Chart.js on
`/vi/projects/[phi]/verifications`) will pull perf down a few points
but not below the 80/90 thresholds at the bundle sizes the build
produces.

## How to reproduce

```sh
pnpm --filter @qr-bc/management-portal build
NEXTAUTH_SECRET=lh-test-secret-AAAAAAAAAAAAAAAAAA \
  NEXTAUTH_URL=http://localhost:3001 \
  NEXT_PUBLIC_HUB_BASE_URL=http://localhost:3000/api/v1 \
  pnpm --filter @qr-bc/management-portal start &

for url in /vi/login /vi/register; do
  pnpm dlx lighthouse "http://localhost:3001${url}" \
    --chrome-path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --emulated-form-factor=mobile --throttling-method=simulate \
    --output=json --output-path=/tmp/lh.json --quiet \
    --chrome-flags="--headless --no-sandbox"
done
```

## Notes on past failures (resolved 2026-05-08)

This was the first Lighthouse run on the management portal, so no
previous failures to amend. Configuration follows the dApp's
`apps/dapp-portal/src/app/globals.css` pattern: light-only color-scheme
pinned at `<html>`, darkened semantic colors so `text-success` /
`text-warning` / `text-danger` clear WCAG AA on white backgrounds.
