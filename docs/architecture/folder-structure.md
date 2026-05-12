# Folder Structure (locked)

This is the final repo layout. All implementation tickets reference paths in this tree.

---

## Root

```
qr-blockchain-anticounterfeiting/
├── README.md                          # Project overview, badges, quickstart, citation
├── LICENSE                            # MIT
├── CITATION.cff                       # Machine-readable citation
├── CHANGELOG.md                       # Keep-a-Changelog
├── .zenodo.json                       # Zenodo deposit metadata
├── .env.example                       # Master env template (root for compose)
├── .gitignore                         # Standard + secrets allowlist
├── .gitleaks.toml                     # Secret scanner config
├── .editorconfig
├── .nvmrc                             # Node 20
├── .prettierrc.json
├── .prettierignore
├── .eslintrc.json                     # Root ESLint config (extended per-app)
├── .eslintignore
├── .commitlintrc.json
├── .lintstagedrc.json
├── .husky/                            # Git hooks (pre-commit, commit-msg)
│   ├── pre-commit
│   └── commit-msg
├── package.json                       # Root workspace + scripts
├── pnpm-workspace.yaml
├── pnpm-lock.yaml                     # Committed
├── tsconfig.base.json                 # Shared TS config
├── docker-compose.yml                 # Full local stack
├── Makefile                           # Convenience commands (make setup, make test, make demo)
│
├── .github/
│   ├── workflows/
│   │   ├── contracts-ci.yml
│   │   ├── apps-ci.yml
│   │   ├── release.yml
│   │   ├── gitleaks.yml
│   │   └── commitlint.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── docs/                              # All human-readable docs
│   ├── ARCHITECTURE.md                # Master arch (C4 diagrams)
│   ├── prd.md
│   ├── gathered-requirements.md
│   ├── REPRODUCIBILITY.md
│   ├── THREAT_MODEL.md
│   ├── SECURITY_ANALYSIS.md
│   ├── MAINNET_DEPLOY.md
│   ├── CONTRIBUTING.md
│   ├── THIRD_PARTY.md                 # Auto-generated license inventory
│   ├── images/                        # Diagrams (PNG + SVG)
│   │   ├── architecture-context.svg
│   │   ├── architecture-container.svg
│   │   └── architecture-component.svg
│   ├── architecture/
│   │   ├── README.md
│   │   ├── system-design.md
│   │   ├── folder-structure.md        # this file
│   │   ├── tech-stack.md
│   │   ├── database.md
│   │   ├── api-design.md              # Full OpenAPI 3
│   │   ├── sequence-diagrams.md
│   │   ├── inter-service-contract.md
│   │   └── decision-log.md            # ADR-001..ADR-008
│   └── requirements/
│       ├── README.md
│       ├── user-stories.md
│       ├── non-functional.md
│       ├── glossary.md
│       ├── risk-register.md
│       ├── sequencing.md
│       ├── sr-mapping.md
│       └── features/
│           ├── smart-contract.md
│           ├── shared-package.md
│           ├── coordination-hub.md
│           ├── dapp-portal.md
│           ├── management-portal.md
│           ├── experiments.md
│           ├── static-analysis-and-tests.md
│           ├── devops.md
│           └── docs-and-branding.md
│
├── contracts/                         # F1 — Solidity smart contract
│   ├── README.md
│   ├── package.json
│   ├── foundry.toml
│   ├── hardhat.config.ts
│   ├── remappings.txt
│   ├── slither.config.json
│   ├── solhint.config.js
│   ├── .gas-snapshot                  # Committed gas baselines
│   ├── src/
│   │   ├── ProductRegistry.sol
│   │   ├── interfaces/
│   │   │   └── IProductRegistry.sol
│   │   └── errors/
│   │       └── Errors.sol             # Custom errors (extracted for reuse)
│   ├── script/
│   │   ├── Deploy.s.sol               # Foundry deploy script (multi-network)
│   │   └── Verify.s.sol               # Polygonscan verification helper
│   ├── deploy/                        # Hardhat deploy scripts (alt path)
│   │   └── 01_deploy_product_registry.ts
│   ├── test/
│   │   ├── unit/
│   │   │   ├── RegisterProject.t.sol
│   │   │   ├── RegisterBatch.t.sol
│   │   │   ├── RedeemProduct.t.sol
│   │   │   ├── VerifyProduct.t.sol
│   │   │   ├── ProjectExists.t.sol
│   │   │   └── Hashing.t.sol
│   │   ├── properties/
│   │   │   ├── SR1_Unforgeability.t.sol
│   │   │   ├── SR2_NonReplayability.t.sol
│   │   │   ├── SR3_NonRepudiation.t.sol
│   │   │   └── SR4_TrustIndependence.t.sol
│   │   ├── invariants/
│   │   │   └── RegistryInvariants.t.sol
│   │   ├── fixtures/
│   │   │   └── ProductRegistryFixture.sol
│   │   ├── gas/
│   │   │   └── GasSnapshots.t.sol
│   │   └── hardhat/
│   │       └── ProductRegistry.spec.ts # JS-side E2E
│   ├── lib/                           # Foundry forge-std as git submodule
│   └── out/                           # Foundry build output (gitignored)
│       └── ProductRegistry.sol/
│           └── ProductRegistry.json
│
├── packages/
│   └── shared/                        # F2 — TypeScript shared package
│       ├── README.md
│       ├── package.json               # name: @qr-bc/shared
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── src/
│       │   ├── index.ts               # Public surface
│       │   ├── types.ts
│       │   ├── notation.ts            # paper symbol aliases (φ, sid, h, etc.)
│       │   ├── hashing.ts
│       │   ├── outcomes.ts            # VerificationOutcome union
│       │   ├── schemas/
│       │   │   ├── project.zod.ts
│       │   │   ├── activity.zod.ts
│       │   │   └── certification.zod.ts
│       │   └── abi/
│       │       └── ProductRegistry.json   # Auto-generated by build:abi
│       ├── scripts/
│       │   └── build-abi.ts           # Reads contracts/out → writes src/abi
│       ├── test/
│       │   ├── hashing.test.ts        # cross-checks vs contract output
│       │   └── types.test-d.ts        # Type tests via tsd
│       └── dist/                      # tsup output (gitignored)
│
├── apps/
│   ├── coordination-hub/              # F3 — NestJS service
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   ├── .env.testnet.example
│   │   ├── .env.production.example
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   ├── config.module.ts
│   │   │   │   └── env.schema.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── register.dto.ts
│   │   │   │   │   └── login.dto.ts
│   │   │   │   └── guards/
│   │   │   │       └── jwt.guard.ts
│   │   │   ├── producers/
│   │   │   │   ├── producers.module.ts
│   │   │   │   ├── producers.controller.ts
│   │   │   │   ├── producers.service.ts
│   │   │   │   └── producer.schema.ts
│   │   │   ├── projects/
│   │   │   │   ├── projects.module.ts
│   │   │   │   ├── projects.controller.ts
│   │   │   │   ├── projects.service.ts
│   │   │   │   └── project.schema.ts
│   │   │   ├── activities/
│   │   │   │   ├── activities.module.ts
│   │   │   │   └── ...
│   │   │   ├── certifications/
│   │   │   │   └── ...
│   │   │   ├── uploads/
│   │   │   │   ├── uploads.module.ts
│   │   │   │   ├── uploads.service.ts
│   │   │   │   ├── pinata.adapter.ts
│   │   │   │   └── kubo.adapter.ts
│   │   │   ├── scan/
│   │   │   │   ├── scan.module.ts
│   │   │   │   ├── scan.controller.ts
│   │   │   │   └── scan.service.ts
│   │   │   ├── blockchain/
│   │   │   │   ├── blockchain.module.ts
│   │   │   │   ├── provider.service.ts
│   │   │   │   ├── contract.service.ts
│   │   │   │   ├── wallet.service.ts
│   │   │   │   └── nonce-manager.service.ts
│   │   │   ├── observability/
│   │   │   │   ├── observability.module.ts
│   │   │   │   ├── health.controller.ts
│   │   │   │   ├── metrics.controller.ts
│   │   │   │   └── logger.module.ts
│   │   │   ├── seed/
│   │   │   │   ├── seed.script.ts
│   │   │   │   └── fixtures/
│   │   │   │       ├── htx-van-noi.json
│   │   │   │       ├── htx-tan-duc.json
│   │   │   │       ├── htx-cu-chi.json
│   │   │   │       └── images/
│   │   │   │           └── *.jpg      # placeholder photos
│   │   │   └── common/
│   │   │       ├── filters/
│   │   │       │   └── http-exception.filter.ts
│   │   │       ├── interceptors/
│   │   │       │   ├── transform.interceptor.ts
│   │   │       │   └── request-id.interceptor.ts
│   │   │       ├── pipes/
│   │   │       │   └── zod-validation.pipe.ts
│   │   │       └── exceptions/
│   │   │           ├── domain.exception.ts
│   │   │           └── ...
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   ├── e2e/
│   │   │   └── fixtures/
│   │   └── dist/                      # gitignored
│   │
│   ├── management-portal/             # F5 — Producer-facing Next.js
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── next.config.mjs
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── components.json            # shadcn/ui
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   ├── public/
│   │   │   ├── logo.svg
│   │   │   ├── favicon.ico
│   │   │   ├── apple-touch-icon.png
│   │   │   └── og-image.png
│   │   ├── messages/
│   │   │   ├── vi.json
│   │   │   └── en.json
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── [locale]/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── (auth)/
│   │   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   │   └── register/page.tsx
│   │   │   │   │   ├── (dashboard)/
│   │   │   │   │   │   ├── layout.tsx
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── projects/
│   │   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   │   │   └── [phi]/
│   │   │   │   │   │   │       ├── page.tsx
│   │   │   │   │   │   │       ├── edit/page.tsx
│   │   │   │   │   │   │       ├── activities/page.tsx
│   │   │   │   │   │   │       ├── certifications/page.tsx
│   │   │   │   │   │   │       ├── images/page.tsx
│   │   │   │   │   │   │       ├── batches/
│   │   │   │   │   │   │       │   ├── page.tsx
│   │   │   │   │   │   │       │   └── new/page.tsx
│   │   │   │   │   │   │       └── verifications/page.tsx
│   │   │   │   │   │   └── account/page.tsx
│   │   │   │   │   └── api/
│   │   │   │   │       └── auth/[...nextauth]/route.ts
│   │   │   │   └── not-found.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                # shadcn/ui components
│   │   │   │   ├── projects/
│   │   │   │   ├── batches/
│   │   │   │   └── shared/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts      # fetch wrapper with auth
│   │   │   │   ├── auth.ts            # NextAuth config
│   │   │   │   └── i18n.ts
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── e2e/                       # Playwright
│   │   └── test/
│   │
│   └── dapp-portal/                   # F4 — Consumer dApp (IPFS)
│       ├── README.md
│       ├── package.json
│       ├── next.config.mjs            # output: 'export', trailingSlash: true
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── components.json
│       ├── Dockerfile
│       ├── .env.example
│       ├── ipfs-deploy.sh             # build + pin to Pinata
│       ├── public/
│       │   ├── logo.svg               # symlink or copy from management-portal
│       │   ├── favicon.ico
│       │   └── og-image.png
│       ├── messages/
│       │   ├── vi.json
│       │   └── en.json
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── globals.css
│       │   │   ├── [locale]/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx
│       │   │   │   ├── projects/
│       │   │   │   │   └── [projectId]/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── scan/
│       │   │   │   │   └── [projectId]/
│       │   │   │   │       └── [secretId]/
│       │   │   │   │           └── page.tsx
│       │   │   │   ├── scanner/page.tsx
│       │   │   │   └── about/page.tsx
│       │   │   └── not-found.tsx
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── scan/
│       │   │   ├── traceability/
│       │   │   └── shared/
│       │   ├── lib/
│       │   │   ├── api-client.ts
│       │   │   └── i18n.ts
│       │   ├── hooks/
│       │   └── types/
│       ├── e2e/                       # Playwright
│       └── test/
│
├── experiments/                       # F6
│   ├── README.md
│   ├── package.json
│   ├── tsconfig.json
│   ├── lib/
│   │   ├── runner.ts
│   │   ├── stats.ts
│   │   ├── csv.ts
│   │   ├── plot.ts
│   │   └── network.ts
│   ├── perf-registration/
│   │   ├── run.ts
│   │   └── README.md
│   ├── perf-verification/
│   │   ├── run-public.ts
│   │   ├── run-private-valid.ts
│   │   ├── run-private-invalid.ts
│   │   └── run-private-redeemed.ts
│   ├── cost-analysis/
│   │   └── run.ts
│   ├── adversarial/
│   │   ├── forge-unknown-sid.ts
│   │   ├── replay-redeemed.ts
│   │   ├── unauthorized-batch.ts
│   │   ├── tampered-hash.ts
│   │   └── race-redeems.ts
│   ├── all/
│   │   └── run-all.ts                 # orchestrates + writes SUMMARY.md
│   └── README.md
│
└── results/                           # Pre-computed sample outputs
    ├── README.md
    ├── example-RUN_ID/                # Author's reference run
    │   ├── perf-registration/
    │   │   ├── raw.csv
    │   │   ├── summary.json
    │   │   └── plot.png
    │   ├── perf-verification/
    │   ├── cost-analysis/
    │   ├── adversarial/
    │   └── SUMMARY.md
    ├── slither/                       # Archived Slither reports
    │   └── <commit-sha>/
    └── tables/                        # Pre-rendered Markdown tables for paper cross-reference
        ├── table3-performance.md
        └── table4-cost.md
```

---

## Naming conventions

| Type                               | Convention                        | Example                                                   |
| ---------------------------------- | --------------------------------- | --------------------------------------------------------- |
| TS files                           | kebab-case                        | `wallet.service.ts`                                       |
| TS classes                         | PascalCase                        | `class WalletService`                                     |
| TS interfaces                      | PascalCase, no `I` prefix         | `interface Producer` (not `IProducer`)                    |
| TS types                           | PascalCase                        | `type Phi = string`                                       |
| TS variables                       | camelCase                         | `const projectId`                                         |
| TS constants (top-level)           | UPPER_SNAKE                       | `const MAX_BATCH_SIZE = 500`                              |
| Solidity files                     | PascalCase matching contract name | `ProductRegistry.sol`                                     |
| Solidity test files                | PascalCase + `.t.sol`             | `RegisterProject.t.sol`                                   |
| Solidity script files              | PascalCase + `.s.sol`             | `Deploy.s.sol`                                            |
| Markdown files                     | kebab-case (lowercase)            | `system-design.md`, `risk-register.md`                    |
| All-caps Markdown (top-level docs) | UPPER_SNAKE                       | `README.md`, `LICENSE`, `CHANGELOG.md`, `ARCHITECTURE.md` |
| Folders                            | kebab-case                        | `coordination-hub/`                                       |
| Branches                           | `<type>/<scope>-<short>`          | `feat/contracts-redeem-product`                           |
| Commits                            | Conventional Commits              | `feat(contracts): add registerBatch with N≤500 cap`       |

---

## What lives where (decision rationale)

| Decision                                   | Reason                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `docs/` at root, not per-app               | Reviewer reads docs first; centralized so links don't break.            |
| `contracts/` outside `apps/`               | Smart contract is special-tooled (Foundry+Hardhat); not a JS workspace. |
| `packages/shared/` for cross-cutting types | pnpm workspace requires `packages/` for non-app libraries.              |
| `experiments/` separate from `apps/`       | Reproducibility scripts are not deployable apps.                        |
| `results/` committed                       | Reviewers without testnet access still see numbers.                     |
| `.github/` standard                        | Required for GitHub Actions.                                            |
| `.husky/` standard                         | Required for git hooks.                                                 |
| `Makefile` at root                         | One-command convenience: `make setup`, `make test`, `make demo`.        |

---

## Workspace mapping (pnpm)

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'experiments'
  - 'contracts'
```

- `contracts` is a workspace too (so `pnpm --filter contracts build` works for ABI export script).
- `experiments` is also a workspace (gets to import `@qr-bc/shared`).

---

## Gitignored paths

```
# Build outputs
node_modules/
dist/
.next/
out/
contracts/out/
contracts/cache/
packages/shared/dist/

# Foundry
contracts/broadcast/

# IDE
.vscode/
.idea/
*.swp

# Env / secrets
.env
.env.*
!.env.example
!.env.testnet.example
!.env.production.example
*.pem
*.key
*.token

# Test artifacts
coverage/
playwright-report/
test-results/
*.log

# Local volumes
.docker-volumes/
```

---

## Locked

This structure is the contract for `/04-create-tasks`. Any structural change requires re-running `/03-design-architecture` (or an explicit ADR amendment in `decision-log.md`).
