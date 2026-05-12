# Phase 10 — Branding, Seed Data, Citation

**Goal:** Logo SVG, full i18n strings, demo HTX rau seed data, machine-readable citation files.
**Effort:** ~1 day total (3 tickets).
**Prerequisites:** Phases 4 + 5 + earlier docs.

---

### T-043 — Logo + complete i18n strings

**Phase:** 10 · **Feature:** F11 · **Effort:** S

**Description.** Generate the QR-leaf SVG logo. Replace placeholder. Audit + complete all i18n keys VI/EN.

**Files to create/modify:**

- `apps/dapp-portal/public/logo.svg` — final (icon QR + lá rau, green palette)
- `apps/dapp-portal/public/logo-mono.svg`
- `apps/dapp-portal/public/og-image.png` — 1200×630 PNG with logo + title
- `apps/dapp-portal/public/favicon.ico`
- `apps/dapp-portal/public/apple-touch-icon.png`
- `apps/management-portal/public/logo.svg` (same)
- (Equivalents: og-image, favicon, apple-touch-icon)
- `apps/dapp-portal/messages/vi.json` — finalized with all keys
- `apps/dapp-portal/messages/en.json`
- `apps/management-portal/messages/vi.json`
- `apps/management-portal/messages/en.json`
- `scripts/i18n-key-parity.ts` — CI check: each key in `vi.json` must exist in `en.json` and vice versa

**Acceptance criteria refs:** AC-BR-1, AC-BR-2, AC-BR-3, AC-BR-4, AC-BR-5, AC-BR-6, AC-BR-7
**ADRs:** ADR-009
**Depends on:** T-027, T-032.
**Definition of Done:**

- [ ] Logo SVG ≤ 5 KB, optimized (`svgo`).
- [ ] Logo renders correctly at 16/32/64/128/256 px.
- [ ] favicon, apple-touch-icon, og-image present in both apps' `public/`.
- [ ] All UI strings keyed (no hard-coded text in JSX).
- [ ] `pnpm dlx ts-node scripts/i18n-key-parity.ts` exits 0 (perfect parity).
- [ ] CI integrates the parity check; missing key in either locale fails.
- [ ] Lighthouse `<html lang="vi">` confirmed on first visit.

---

### T-044 — Demo seed data (3 HTX rau)

**Phase:** 10 · **Feature:** F12 · **Effort:** S

**Description.** Realistic seed data: 3 vegetable cooperatives with cultivation activities and certifications.

**Files to create/modify:**

- `apps/coordination-hub/src/seed/fixtures/htx-van-noi.json` — Rau muống, Đông Anh Hà Nội, VietGAP, 5 activities
- `apps/coordination-hub/src/seed/fixtures/htx-tan-duc.json` — Xà lách Đà Lạt, Lâm Đồng, Organic, 5 activities
- `apps/coordination-hub/src/seed/fixtures/htx-cu-chi.json` — Cải xanh, Củ Chi TP.HCM, GlobalGAP, 5 activities
- `apps/coordination-hub/src/seed/fixtures/images/` — placeholder vegetable photos (creative-commons attributable or AI-generated)
- `apps/coordination-hub/src/seed/seed.script.ts` — finalize idempotency + image upload

**Acceptance criteria refs:** AC-SD-1, AC-SD-2, AC-SD-3, AC-SD-4, AC-SD-5
**ADRs:** —
**Depends on:** T-022.
**Definition of Done:**

- [ ] Each fixture matches schema in [database.md](../architecture/database.md) and [features/docs-and-branding.md F12](../requirements/features/docs-and-branding.md#f12--demo-seed-data).
- [ ] `pnpm seed` from a fresh Mongo populates all 3 producers, 3 projects, 15 activities, 3 certs, 9+ images, and 5 sample QR per project.
- [ ] Demo credentials documented in `docs/REPRODUCIBILITY.md` with security warning.
- [ ] Re-running `pnpm seed` is idempotent (no duplicates).
- [ ] E2E test verifies seeded private QR scans end-to-end.

---

### T-045 — Citation files + License + Zenodo metadata + CHANGELOG

**Phase:** 10 · **Feature:** F13 · **Effort:** S

**Description.** Finalize all top-level metadata files. v1.0.0 CHANGELOG entry covering all features.

**Files to create/modify:**

- `LICENSE` — final MIT text (year 2026, authors)
- `CITATION.cff` — per [features/docs-and-branding.md §F13](../requirements/features/docs-and-branding.md#citationcff)
- `.zenodo.json` — per same source
- `CHANGELOG.md` — Keep-a-Changelog format with v1.0.0 entry listing F1–F14
- Root `package.json` — `license: 'MIT'`, version `1.0.0`

**Acceptance criteria refs:** AC-CT-1, AC-CT-2, AC-CT-3, AC-CT-5, AC-CT-6
**ADRs:** —
**Depends on:** T-040.
**Definition of Done:**

- [ ] `pnpm dlx cffconvert --validate -i CITATION.cff` exits 0.
- [ ] `LICENSE` SPDX `MIT` matches `package.json#license` and CITATION.cff.
- [ ] `.zenodo.json` validates against Zenodo schema (test via Zenodo sandbox in Phase 12).
- [ ] CHANGELOG v1.0.0 lists every feature F1 → F14 with a one-liner.
- [ ] BibTeX block in README matches CITATION.cff.
