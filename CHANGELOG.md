# Changelog

All notable changes to this project are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] — 2026-05-11

Reference release accompanying the paper _"A Dual-QR Blockchain-Based
Authentication Mechanism for Agricultural Anti-Counterfeiting"_
(Pham & Trinh, _Frontiers in Blockchain_, 2026). This release ships
the complete reviewer-runnable artifact: contract, hub, two portals,
experiments, full documentation, and the CI pipeline that gates them.

### Added — implemented features

- **F1 — Smart Contract `ProductRegistry.sol`.** Immutable Solidity
  0.8.24 registry on Polygon Amoy. `registerProject`,
  `registerBatch` (cap N ≤ 500), `redeemProduct`, `verifyProduct`,
  `projectExists`. Hashing via the EVM SHA-256 precompile.
- **F2 — Shared TypeScript Package (`@qr-bc/shared`).** Type
  definitions, Zod schemas, exported `ProductRegistry` ABI, and
  `hashSid()` helper cross-checked against the contract's
  precompile call.
- **F3 — Coordination Hub (`apps/coordination-hub/`).** NestJS API
  with auth (JWT + refresh), producer wallets (AES-256-GCM
  server-managed), projects + activities + certifications CRUD,
  IPFS uploads (local Kubo + Pinata adapter), public/private scan
  endpoints with on-chain `verifyProduct` + gasless redeem,
  health/metrics/audit-log.
- **F4 — Consumer dApp (`apps/dapp-portal/`).** Next.js 14 with
  `output: 'export'`. Public project page, private scan flow,
  scanner page with URL paste fallback, "about" page. Pinned to
  IPFS via Pinata.
- **F5 — Management Portal (`apps/management-portal/`).** Next.js
  14 producer-facing app with NextAuth credentials provider.
  Dashboard, project CRUD, activities + certifications + image
  upload pages, 4-step batch wizard (generates ZIP of QR PNGs +
  manifest), verification analytics (counts donut, daily line
  chart, recent scans table).
- **F6 — Reproducibility Experiments (`experiments/`).**
  Reviewer-runnable scripts: shared trial-runner + stats + CSV +
  plot library; `perf-registration`, `perf-verification`
  (public + private valid/invalid/redeemed), `cost-analysis`;
  five adversarial scripts proving SR1–SR4 (forge-unknown-sid,
  replay-redeemed, unauthorized-batch, race-redeems,
  tampered-hash); `exp:all` umbrella with paper-vs-measured
  `SUMMARY.md`.
- **F7 — Static Analysis & Property Tests.** Foundry property
  tests for SR1–SR4 (fuzz `runs = 1024`), invariants for
  monotonic redemption counters, Hardhat E2E. Slither
  configuration with high-severity gate. Gas snapshot enforced
  with ±5% tolerance.
- **F8 — Docker Compose.** Default profile spins up
  mongo + ipfs + hardhat + contracts-deployer + hub + both
  portals. `--profile testnet` swaps in Amoy; production override
  uses Atlas + Pinata + mainnet RPC. `make demo` brings the local
  stack to a verified scan in ≤ 60 s.
- **F9 — GitHub Actions CI.** Workflows: `contracts-ci`
  (solhint + forge test + coverage 90% + Slither + gas snapshot),
  `apps-ci` (5-workspace matrix typecheck/lint/test/build +
  i18n-parity + Playwright dapp/mgmt + Lighthouse perf ≥ 85 a11y
  ≥ 90), `release` (tag → Pinata pin → GitHub Release with CID),
  `gitleaks` secret scanning, `commitlint` PR-range Conventional
  Commits enforcement.
- **F10 — Documentation suite.** `README.md` with quickstart +
  badges + BibTeX citation + embedded C4 diagrams,
  `docs/ARCHITECTURE.md` (3 mermaid C4 levels rendered to PNG/SVG),
  `docs/THREAT_MODEL.md` (verbatim paper §3.2 + mitigations),
  `docs/SECURITY_ANALYSIS.md` (SR1–SR4 → contract:line →
  test:line → ADR), `docs/REPRODUCIBILITY.md` (paper Table/Figure
  → exact command, testnet vs mainnet variance),
  `docs/MAINNET_DEPLOY.md` (5-section operator runbook +
  rollback + KMS migration), `docs/CONTRIBUTING.md`,
  `docs/THIRD_PARTY.md` (auto-generated license inventory),
  `docs/RELEASE.md` (tag → IPFS → GitHub → Zenodo pipeline).
- **F11 — Branding + i18n.** QR-leaf logo (color + mono) ≤ 470 B
  after svgo, favicon, apple-touch-icon (180×180),
  og-image (1200×630). Default locale `vi`, secondary `en`.
  `scripts/i18n-key-parity.ts` enforces key parity in CI.
- **F12 — Demo Seed Data.** Three HTX cooperatives (HTX Vân Nội /
  rau muống / VietGAP, HTX Tân Đức / rau lá / Hữu cơ, HTX Củ Chi /
  rau dền / VietGAP) with 5 cultivation activities + 1
  certification + 3 image URLs each. Idempotent
  `pnpm --filter @qr-bc/coordination-hub seed` plus a sample batch
  of 5 QR per project. Demo credentials documented in
  `docs/REPRODUCIBILITY.md` with a security warning.
- **F13 — Citation, License, Zenodo metadata.** `CITATION.cff`
  (CFF 1.2.0 with `preferred-citation`), `.zenodo.json`,
  `LICENSE` (MIT), `CHANGELOG.md` (this file).
- **F14 — Mainnet deploy code path.** `contracts/script/Deploy.s.sol`
  and verification step (scheduled — see T-046). The runbook for
  promoting from Amoy to Polygon mainnet lives in
  `docs/MAINNET_DEPLOY.md` and explicitly states v1.0.0 is NOT
  deployed to mainnet; the reviewer-facing reproducer runs Amoy.

### Tooling and infrastructure

- pnpm workspaces with strict frozen-lockfile installs.
- TypeScript 5.6 strict; ESLint + Prettier on every commit via
  Husky + lint-staged.
- Conventional Commits enforced (commitlint config in
  `.commitlintrc.json`).
- Dependabot grouped weekly bumps for `nestjs`, `next`, `ethers`,
  `radix-ui`, `tanstack`, `mongoose`, `tooling`.
- Codecov upload from coordination-hub and management-portal.

### Known limitations

- **Not deployed to Polygon mainnet.** The artifact targets Amoy
  for reviewer reproducibility. Mainnet promotion follows
  `docs/MAINNET_DEPLOY.md`.
- **Table 5 (qualitative comparison) is not reproducible in
  v1.** The paper's Table 5 compares against three external
  systems whose primary sources sit outside this repo; the
  reasoning is documented in `docs/REPRODUCIBILITY.md#table-5`.
- **Management-portal coverage gate is Vitest-only (≥ 20%).**
  The combined Vitest+Playwright measurement (AC-MP-15's full
  70% target) is deferred to a Phase 12 polish step; see the
  comment in `.github/workflows/apps-ci.yml`.

[Unreleased]: https://github.com/Huy0110/qr-blockchain-anticounterfeiting/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Huy0110/qr-blockchain-anticounterfeiting/releases/tag/v1.0.0
