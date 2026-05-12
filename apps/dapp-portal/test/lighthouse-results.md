# Lighthouse Results

Last run: **2026-05-07** against `apps/dapp-portal/out/` served via
`node test/serve-static.cjs out 8765` and audited by Chrome 138 in
headless mode with `--emulated-form-factor=mobile --throttling-method=simulate`.

| Route          | Performance | Accessibility | Best Practices | SEO |
| -------------- | ----------- | ------------- | -------------- | --- |
| `/vi/`         | 87          | 100           | 96             | 100 |
| `/vi/scanner/` | 90          | 100           | 96             | 100 |
| `/vi/about/`   | 88          | 100           | 96             | 100 |

**Thresholds (from `test/lighthouse.config.js`):** perf ≥ 85, a11y ≥ 90.
All three routes clear both gates.

## How to reproduce

```sh
pnpm --filter @qr-bc/dapp-portal build
node apps/dapp-portal/test/serve-static.cjs apps/dapp-portal/out 8765 &
for url in /vi/ /vi/scanner/ /vi/about/; do
  pnpm dlx lighthouse "http://localhost:8765${url}" \
    --chrome-path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --output=json --output-path=/tmp/lh.json --quiet \
    --chrome-flags="--headless --no-sandbox"
done
```

## Notes on past failures (resolved 2026-05-07)

- **/vi/scanner/ perf 72 → 90.** The camera Card mounted unconditionally on
  hydration. `getUserMedia` then hung in headless Chrome, leaving an
  unsized container that Lighthouse picked as LCP target (6.1 s). Fix:
  feature-detect cameras in a `useEffect` and gate the camera mount
  behind a "Start camera" button — keeps the static paint fast and only
  loads `html5-qrcode` on user intent.
- **a11y 87 → 100.** Three audits failed:
  - `html-has-lang` — root layout had a bare `<html>`. Fixed by hardcoding
    `lang="vi"` in the root layout and syncing it per-locale via a tiny
    inline script in `[locale]/layout.tsx`.
  - `heading-order` — `CardTitle` rendered `<h3>` directly under a
    page-level `<h1>`. Changed to `<h2>` so the hierarchy is sequential.
  - `color-contrast` — primary/muted-foreground/warning/danger lightness
    values failed WCAG AA against the white card background. Darkened
    each (lightness reductions of 5–13 percentage points) and removed
    the `prefers-color-scheme: dark` media block, which had been pushing
    primary back up to 45 % lightness in headless runs and re-failing
    contrast.
