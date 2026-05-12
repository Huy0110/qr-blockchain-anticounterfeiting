# Feature F10 + F11 + F12 + F13 + F14 — Docs, Branding, Seed Data, Citation, Mainnet Path

**Modules:** `docs/`, `apps/*/public/logo.svg`, `apps/coordination-hub/seed/`, repo-root metadata files, `contracts/script/` deploy
**Priority:** F10/F13 = P0; F11/F12 = P1; F14 = P2

---

## F10 — Documentation suite

### Files

| File                        | Audience             | Content                                                                                                                                                                           |
| --------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` (root)          | First-time visitor   | Project tagline, status badges, what-this-is, quickstart `docker compose up` → first verification in 15 min, link to paper, citation block, license, project structure tree.      |
| `docs/ARCHITECTURE.md`      | Reviewer / developer | C4-style diagrams (Context, Container, Component); detailed component description mirroring paper §7; data flow for Algorithms 1–3.                                               |
| `docs/THREAT_MODEL.md`      | Reviewer             | Verbatim entities + adversary capabilities + assumptions from paper §3.2 (lines 209–229), plus mitigations table.                                                                 |
| `docs/SECURITY_ANALYSIS.md` | Reviewer             | Per-SR table: SR# → contract function → test file:line proving it; Slither findings allowlist with rationale.                                                                     |
| `docs/REPRODUCIBILITY.md`   | Reviewer             | Step-by-step from `git clone` to `pnpm exp:all` outputting `SUMMARY.md`; mapping each paper Table/Figure → script that reproduces it; explanation of testnet vs mainnet variance. |
| `docs/MAINNET_DEPLOY.md`    | Future operator      | Optional production deploy: ops checklist (KMS/HSM, monitoring, MATIC top-up, Pinata production tier, custom domain).                                                             |
| `docs/CONTRIBUTING.md`      | Future contributor   | Conventional Commits, PR template, branch strategy, code style.                                                                                                                   |
| `docs/CHANGELOG.md`         | Everyone             | Keep-a-Changelog format.                                                                                                                                                          |
| `docs/glossary.md`          | Reviewer / new dev   | See [requirements/glossary.md](../glossary.md).                                                                                                                                   |

### README.md required sections

1. Title + subtitle.
2. Badges: build (CI), coverage, Slither status, license, DOI (post-Zenodo).
3. Citation block (BibTeX) at top — Reviewer 1 wants this discoverable.
4. "What this is": one paragraph linking to paper.
5. Quickstart: 3 commands → first private QR redeemed.
6. Architecture diagram (PNG embedded, links to ARCHITECTURE.md).
7. Repo structure tree (top-level directories + 1-line description).
8. Reproducing paper claims: bullet list pointing to `docs/REPRODUCIBILITY.md`.
9. Documentation index: links to all `docs/*` files.
10. License (MIT) + acknowledgements (paper authors, Frontiers, advisor).

### Acceptance criteria

| #        | Criterion                                                                                                                     | Verified by         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| AC-DOC-1 | README quickstart, when followed verbatim on a clean Linux VM, leads to first successful private QR redemption in ≤ 15 min    | Manual + CI dry run |
| AC-DOC-2 | All `docs/*.md` files render correctly on GitHub (no broken Mermaid, no truncated tables)                                     | GitHub preview      |
| AC-DOC-3 | `docs/ARCHITECTURE.md` contains at least 3 diagrams (Context, Container, Component)                                           | Manual review       |
| AC-DOC-4 | `docs/THREAT_MODEL.md` quotes paper §3.2 verbatim (verified by diff)                                                          | Manual              |
| AC-DOC-5 | `docs/SECURITY_ANALYSIS.md` table has SR1, SR2, SR3, SR4 → contract function → test file:line — every cell filled             | Manual review       |
| AC-DOC-6 | `docs/REPRODUCIBILITY.md` lists each paper Table/Figure (Tab 3, Tab 4, Tab 5, Fig 1) and the exact command that reproduces it | Manual review       |
| AC-DOC-7 | Docs link checker (`lychee` or similar) in CI, no broken internal/external links                                              | CI                  |
| AC-DOC-8 | Citation block uses BibTeX format with placeholder for DOI (filled post-Zenodo)                                               | Manual              |
| AC-DOC-9 | Docs are written in English (single language for academic audience)                                                           | Manual              |

---

## F11 — Branding (logo + i18n)

### Logo design

Simple SVG, no AI-generated raster. Concept: stylized QR code square with a green vegetable leaf overlay.

`apps/dapp-portal/public/logo.svg` and `apps/management-portal/public/logo.svg` (same file).

```
- Shape: 64×64 viewBox.
- QR icon: 3 corner-finder squares (Tailwind green-700, #15803D).
- Leaf: simple lobed leaf shape over the bottom-right corner-finder, Tailwind green-500 (#22C55E).
- Background: transparent.
- Color variants: `logo.svg` (color), `logo-mono.svg` (single color, for prints).
- Text variant for `og-image`: 1200×630 PNG with logo + title "QR-Blockchain Anti-Counterfeiting".
```

### i18n

- **Default locale: `vi`** (per gathered-req §3.4).
- **Secondary: `en`**.
- Translation files: `apps/{app}/messages/{locale}.json`.
- All user-visible strings keyed; no hard-coded strings in JSX.
- Formatting:
  - Dates: `date-fns/locale/vi` and `enUS`.
  - Numbers: `Intl.NumberFormat` with locale.
  - Currency: USD always (cost numbers from paper); show MATIC as secondary.

### Acceptance criteria

| #       | Criterion                                                                                                | Verified by         |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| AC-BR-1 | Logo SVG is < 5 KB, optimized via SVGO                                                                   | CI lint             |
| AC-BR-2 | Logo renders correctly at 16/32/64/128/256 px                                                            | Manual              |
| AC-BR-3 | All UI strings in both apps have entries in both `vi.json` and `en.json` (verified by key-parity script) | CI                  |
| AC-BR-4 | i18n key parity script fails CI if a key missing in either locale                                        | CI                  |
| AC-BR-5 | Default locale `vi` confirmed by Lighthouse `<html lang="vi">`                                           | Manual + Lighthouse |
| AC-BR-6 | favicon, apple-touch-icon, og-image present in `public/`                                                 | Manual              |
| AC-BR-7 | Logo appears in management portal sidebar + dApp landing page                                            | Manual              |

---

## F12 — Demo Seed Data

### Seed projects (per gathered-req §7)

```typescript
const SEED_PROJECTS = [
  {
    cooperativeName: 'HTX Rau An Toàn Vân Nội',
    vegetableType: 'Rau muống',
    cultivationLocation: {
      address: 'Vân Nội, Đông Anh',
      province: 'Hà Nội',
      coordinates: { lat: 21.1024, lng: 105.7892 },
    },
    startDate: '2026-03-15',
    harvestDate: '2026-04-30',
    cultivationArea: 5000, // m²
    expectedOutput: 8000, // kg
    cultivationActivities: [
      {
        type: 'land_preparation',
        activityDate: '2026-03-15',
        name: 'Cày bừa đất',
        materials: ['phân chuồng hoai mục'],
        description: '...',
      },
      { type: 'planting', activityDate: '2026-03-18', name: 'Gieo hạt', description: '...' },
      {
        type: 'fertilizing',
        activityDate: '2026-04-01',
        name: 'Bón thúc lần 1',
        materials: ['NPK 16-16-8'],
        description: '...',
      },
      {
        type: 'pest_control',
        activityDate: '2026-04-15',
        name: 'Phun chế phẩm sinh học',
        materials: ['Bacillus thuringiensis'],
        description: '...',
      },
      {
        type: 'harvesting',
        activityDate: '2026-04-30',
        name: 'Thu hoạch lứa 1',
        description: '...',
      },
    ],
    certifications: [{ name: 'VietGAP', issuer: 'Sở NN&PTNT Hà Nội', issueDate: '2025-12-10' }],
  },
  // 2: HTX Tân Đức (Đà Lạt) — Xà lách — Organic
  // 3: HTX Rau Sạch Củ Chi — Cải xanh — GlobalGAP
];
```

### Seed runner

- `apps/coordination-hub/seed/seed.ts` — invoked via `pnpm seed`.
- Idempotent: detects already-seeded producers + projects, skips.
- Creates 3 producer accounts with deterministic credentials (logged once with warning "FOR DEMO ONLY, REGENERATE IN PROD").
- Generates 5 sample private QR per project (small batch).
- Pins 2-3 placeholder vegetable images per project to IPFS (committed to repo as fixtures, not real photos).

### Acceptance criteria

| #       | Criterion                                                                        | Verified by      |
| ------- | -------------------------------------------------------------------------------- | ---------------- |
| AC-SD-1 | `pnpm seed` populates 3 demo HTX with 5 cultivation activities each              | Integration test |
| AC-SD-2 | Each demo project has 1 certification + 3 placeholder images                     | Integration test |
| AC-SD-3 | Seeded private QR codes are scannable end-to-end (smoke test in `pnpm test:e2e`) | E2E              |
| AC-SD-4 | Demo credentials documented in `docs/REPRODUCIBILITY.md` with security warning   | Manual           |
| AC-SD-5 | Re-running `pnpm seed` is idempotent                                             | Integration test |

---

## F13 — Citation, License, Zenodo metadata

### Files

#### `LICENSE` (MIT)

Standard MIT text. Authors: Duc Huy Pham, Tuan-Dat Trinh. Year: 2026.

#### `CITATION.cff`

```yaml
cff-version: 1.2.0
message: 'If you use this software, please cite both the software and the paper.'
type: software
authors:
  - family-names: Pham
    given-names: Duc Huy
    affiliation: Hanoi University of Science and Technology
    # orcid: TBD (left blank per user 2026-05-05)
  - family-names: Trinh
    given-names: Tuan-Dat
    affiliation: Hanoi University of Science and Technology
    email: dattt@soict.hust.edu.vn
title: 'qr-blockchain-anticounterfeiting: Reference Implementation for Dual-QR Blockchain Authentication'
version: 1.0.0
date-released: 2026-XX-XX
license: MIT
repository-code: https://github.com/Huy0110/qr-blockchain-anticounterfeiting
preferred-citation:
  type: article
  title: 'A Dual-QR Blockchain-Based Authentication Mechanism for Agricultural Anti-Counterfeiting'
  authors:
    - family-names: Pham
      given-names: Duc Huy
    - family-names: Trinh
      given-names: Tuan-Dat
  journal: Frontiers in Blockchain
  year: 2026
  # doi: TBD (filled when paper published)
```

#### `.zenodo.json`

```json
{
  "title": "qr-blockchain-anticounterfeiting: Reference Implementation for Dual-QR Blockchain Authentication",
  "description": "Source code and reproducibility scripts for the paper 'A Dual-QR Blockchain-Based Authentication Mechanism for Agricultural Anti-Counterfeiting' (Frontiers in Blockchain, 2026).",
  "creators": [
    { "name": "Pham, Duc Huy", "affiliation": "Hanoi University of Science and Technology" },
    { "name": "Trinh, Tuan-Dat", "affiliation": "Hanoi University of Science and Technology" }
  ],
  "license": "MIT",
  "keywords": [
    "blockchain",
    "anti-counterfeiting",
    "QR code",
    "smart contract",
    "agriculture",
    "Polygon",
    "supply chain"
  ],
  "upload_type": "software",
  "access_right": "open"
}
```

#### `CHANGELOG.md`

Keep-a-Changelog format. v1.0.0 entry written at release time listing every feature.

### Acceptance criteria

| #       | Criterion                                                                                                  | Verified by      |
| ------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| AC-CT-1 | `cffconvert --validate -i CITATION.cff` passes                                                             | CI               |
| AC-CT-2 | `LICENSE` SPDX `MIT` matches `package.json` and root metadata                                              | CI grep test     |
| AC-CT-3 | `.zenodo.json` matches Zenodo schema (validated via Zenodo sandbox before tag)                             | Manual + sandbox |
| AC-CT-4 | First tag `v1.0.0` triggers Zenodo deposit and DOI is reflected back into CITATION.cff via post-release PR | Manual           |
| AC-CT-5 | README has BibTeX block kept in sync with CITATION.cff                                                     | Manual           |
| AC-CT-6 | CHANGELOG entry for v1.0.0 lists all features F1–F14                                                       | Manual           |

---

## F14 — Mainnet deploy code path

### Scope

Code exists, NOT executed in v1. Documented for future use.

- `contracts/script/Deploy.s.sol` — Foundry script that deploys `ProductRegistry`, parameterized by `--rpc-url $RPC_URL_MAINNET --private-key $DEPLOYER_KEY --broadcast`.
- `contracts/script/Verify.s.sol` — verifies on Polygonscan (mainnet).
- `docs/MAINNET_DEPLOY.md`:
  - Pre-deploy checklist: KMS for hub wallet, monitoring (Tenderly), MATIC reserve top-up, Pinata production tier, gas price strategy.
  - Step-by-step: env vars → `forge script` → record contract address → update `.env.production` → tag dApp build → pin to Pinata production → update DNS (if any).
  - Post-deploy: smoke test, Polygonscan verification, register a real demo project, mint a private QR, full e2e.
  - Rollback: contract is immutable; `rollback` means deploy a new contract with bumped version + halt registrations on old (off-chain).
- `apps/coordination-hub/.env.production.example` — production env template.
- CI: `release.yml` does NOT auto-deploy to mainnet (gated by manual approval).

### Acceptance criteria

| #       | Criterion                                                                                                         | Verified by |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| AC-MN-1 | `forge script Deploy.s.sol --rpc-url <hardhat>` deploys successfully (verifies code path works)                   | CI          |
| AC-MN-2 | `docs/MAINNET_DEPLOY.md` covers all 5 sections: prereq, deploy, verify, post-deploy, rollback                     | Manual      |
| AC-MN-3 | Doc explicitly states v1 has not been deployed to mainnet by author; reproducer is responsible for own deployment | Manual      |
| AC-MN-4 | Mainnet wallet/key NEVER in repo (gitleaks ensures)                                                               | CI          |
| AC-MN-5 | `.env.production.example` documents all required production env vars                                              | Manual      |

---

## Non-goals (cross-cutting)

- No automated mainnet deploy in v1.
- No paid Zenodo features; default open-access plan.
- No localized README (English only for academic).
- No interactive logo generator; static SVG.
- No analytics tracker (privacy-preserving).
