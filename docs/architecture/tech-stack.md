# Tech Stack

Each technology with the rationale. Choices locked in [gathered-requirements.md](../gathered-requirements.md) §5.2 and validated here.

---

## Smart contract

| Technology                 | Version                   | Why                                                                                                                  |
| -------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Solidity**               | `0.8.24` (locked, no `^`) | LTS-equivalent stable; built-in overflow checks; fits paper §7.1.                                                    |
| **Foundry**                | latest stable             | Native Rust speed; first-class fuzz + invariant tests; explicit gas snapshots; no JS overhead. Primary test runner.  |
| **Hardhat**                | `^2.22`                   | JS ecosystem integration (deploy scripts, ethers integration tests, ABI export pipeline). Side-by-side with Foundry. |
| **forge-std**              | latest (git submodule)    | Foundry standard test utilities.                                                                                     |
| **Slither**                | `0.10+`                   | Industry-standard static analyzer; fast in CI; high signal-to-noise.                                                 |
| **Solhint**                | `^4`                      | Solidity linter (style + security recommendations).                                                                  |
| **OpenZeppelin Contracts** | NOT USED in v1            | Contract is small + custom; pulling OZ adds attack surface and gas. May reconsider for v2 (e.g., `Pausable`).        |

**Why Hardhat AND Foundry?** They complement: Foundry tests run 10–100× faster and support stateful invariant testing; Hardhat owns the deploy + JS-integration story. The split is clean — no overlap.

---

## Backend (Coordination Hub)

| Technology                              | Version       | Why                                                                                                                |
| --------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Node.js**                             | `20 LTS`      | Required by NestJS 10; bookworm-slim Docker base.                                                                  |
| **NestJS**                              | `^10`         | DI, decorators, OpenAPI auto-gen, easier test boundaries vs Express. Modular structure maps cleanly to paper §7.2. |
| **TypeScript**                          | `^5.4`        | `strict: true`, `noUncheckedIndexedAccess: true`. Strict-by-default reduces bugs reviewer might flag.              |
| **MongoDB**                             | `7`           | Flexible schema for evolving project metadata. Paper §8 uses MongoDB Atlas (free tier).                            |
| **Mongoose**                            | `^8`          | Schema + ODM. Better DX than raw driver for project metadata's nested arrays.                                      |
| **ethers.js**                           | `v6`          | Industry standard JS library for Ethereum/Polygon. v6 has improved type safety + smaller bundle.                   |
| **Passport**                            | `^0.7`        | NestJS official auth middleware integration.                                                                       |
| **passport-jwt**                        | `^4`          | JWT strategy.                                                                                                      |
| **bcrypt**                              | `^5`          | Password hashing (12 rounds).                                                                                      |
| **jsonwebtoken**                        | `^9`          | JWT signing/verification.                                                                                          |
| **Zod**                                 | `^3.23`       | Runtime schema validation; integrates with NestJS pipes; reused across hub + frontends via `@qr-bc/shared`.        |
| **class-validator + class-transformer** | latest        | NestJS native DTO validation (used alongside Zod for legacy NestJS examples). Zod is preferred for new code.       |
| **`@nestjs/swagger`**                   | `^7`          | Auto-generated OpenAPI 3.0 spec at `/api/docs`. Reviewer-friendly.                                                 |
| **`@nestjs/throttler`**                 | `^5`          | Rate limiting per route.                                                                                           |
| **Helmet**                              | `^7`          | HTTP security headers.                                                                                             |
| **Pino**                                | `^9`          | Structured JSON logging; Node-fastest.                                                                             |
| **`nestjs-pino`**                       | `^4`          | Pino integration.                                                                                                  |
| **`prom-client`**                       | `^15`         | Prometheus exposition.                                                                                             |
| **Multer**                              | `^1.4`        | Multipart file uploads (NestJS native).                                                                            |
| **`ipfs-http-client`**                  | `^60`         | Talks to local Kubo node.                                                                                          |
| **`@pinata/sdk`**                       | latest        | Pinata-mode pinning.                                                                                               |
| **AES-256-GCM**                         | Node `crypto` | Wallet encryption at rest.                                                                                         |
| **node-cron**                           | NOT USED      | No scheduled jobs in v1.                                                                                           |
| **Redis**                               | NOT USED      | In-memory caching only (LRU); Redis adds infra without benefit at paper scale.                                     |

---

## Frontend (both portals)

| Technology                          | Version      | Why                                                                                               |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| **Next.js**                         | `14.2 LTS`   | Stable App Router; static export for dApp on IPFS; SSR for management portal. React 18 anchor.    |
| **React**                           | `18.3`       | LTS; mature ecosystem; React 19 too new for IPFS-deployed app risk-tolerance.                     |
| **TypeScript**                      | `^5.4`       | Same as backend.                                                                                  |
| **Tailwind CSS**                    | `^3.4`       | Utility-first; small generated CSS; works perfectly with shadcn/ui + IPFS static export.          |
| **shadcn/ui**                       | latest       | Copy-paste Radix-based components; not a runtime dep — avoids vendor lock; accessible by default. |
| **Radix UI**                        | (via shadcn) | Accessible primitives.                                                                            |
| **lucide-react**                    | `^0.400`     | Icon set, tree-shakeable.                                                                         |
| **next-intl**                       | `^3`         | i18n for App Router. Handles VI + EN with locale routing.                                         |
| **TanStack Query**                  | `v5`         | Server state caching, retry, polling for verification logs.                                       |
| **react-hook-form**                 | `^7`         | Form state.                                                                                       |
| **`@hookform/resolvers`** + **Zod** | latest       | Form validation via shared Zod schemas.                                                           |
| **NextAuth.js (Auth.js)**           | `v5 beta`    | Auth in management portal; credentials provider talks to hub `/auth/login`. JWT strategy.         |
| **`html5-qrcode`**                  | `^2.3`       | Browser QR scanner for dApp `/scanner` route.                                                     |
| **date-fns**                        | `^3`         | Date utils; lighter than moment.js; locale-aware (vi + enUS).                                     |
| **Sonner**                          | `^1`         | Toast notifications (shadcn-recommended).                                                         |
| **Leaflet**                         | `^1.9`       | Map rendering for cultivation location (consumer dApp).                                           |
| **react-leaflet**                   | `^4`         | React bindings (only used if location coords present — lazy-loaded).                              |
| **chart.js + react-chartjs-2**      | latest       | Verification log analytics in management portal.                                                  |

---

## Experiments

| Technology                | Why                                                                  |
| ------------------------- | -------------------------------------------------------------------- |
| **tsx**                   | Run TypeScript directly without build; perfect for one-shot scripts. |
| **`@noble/hashes`**       | Pure JS SHA-256 (already pulled by `@qr-bc/shared`).                 |
| **`chartjs-node-canvas`** | Server-side Chart.js rendering for plot.png output.                  |
| **`csv-stringify`**       | Type-safe CSV emission.                                              |
| **ethers.js v6**          | Same as hub.                                                         |
| **Node `crypto`**         | CSPRNG for `sid_i`.                                                  |

---

## Shared package

| Technology          | Why                                                      |
| ------------------- | -------------------------------------------------------- |
| **TypeScript**      | Strict types.                                            |
| **tsup**            | Dual ESM + CJS bundler with `.d.ts` emission.            |
| **`@noble/hashes`** | Pure-JS, audited SHA-256 implementation. Cross-platform. |
| **Zod**             | Schema definitions reused across hub + frontends.        |
| **tsd**             | Type-level test runner.                                  |

---

## Workspace tooling

| Technology                                             | Why                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| **pnpm**                                               | `9.x`. Fast, disk-efficient; first-class workspace support; widely used. |
| **TypeScript Project References**                      | (configured but optional) Faster builds across workspace.                |
| **ESLint**                                             | `^9` flat config. `@typescript-eslint/strict` ruleset.                   |
| **Prettier**                                           | `^3` format on save + pre-commit.                                        |
| **lint-staged**                                        | Run lint on staged files only.                                           |
| **husky**                                              | Git hooks (pre-commit, commit-msg).                                      |
| **commitlint** + **`@commitlint/config-conventional`** | Enforce Conventional Commits.                                            |
| **gitleaks**                                           | Secret scanning pre-commit + CI.                                         |
| **dotenv-validator**                                   | (CI step) verifies code references match `.env.example`.                 |
| **license-checker**                                    | Auto-generate `docs/THIRD_PARTY.md`.                                     |

---

## Test runners & quality

| Technology                  | Where                                 | Why                                                 |
| --------------------------- | ------------------------------------- | --------------------------------------------------- |
| **Vitest**                  | All TS apps + experiments + shared    | Fast (esbuild-based); ESM-friendly; mature watcher. |
| **`@vitest/coverage-v8`**   | All TS apps                           | Native V8 coverage.                                 |
| **supertest**               | Hub integration tests                 | HTTP-level testing of NestJS routes.                |
| **`mongodb-memory-server`** | Hub integration tests                 | In-process Mongo for fast tests.                    |
| **Playwright**              | Both portals                          | E2E browser testing; mobile viewports for dApp.     |
| **Lighthouse CI**           | Both portals                          | Performance + accessibility gates.                  |
| **axe-core**                | Both portals (Playwright integration) | Accessibility scanning.                             |
| **Foundry `forge test`**    | Contracts                             | Primary test runner.                                |
| **Hardhat (mocha + chai)**  | Contracts (E2E)                       | JS-side deploy tests.                               |
| **Slither**                 | Contracts                             | Static analysis.                                    |
| **`forge coverage`**        | Contracts                             | Solidity line coverage.                             |
| **`forge snapshot`**        | Contracts                             | Gas regression detection.                           |

---

## CI & release

| Technology                                               | Why                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **GitHub Actions**                                       | Native to GitHub; OIDC for cloud, free-tier compatible.                                  |
| **`actions/setup-node@v4`** + **`pnpm/action-setup@v3`** | Standard Node + pnpm setup.                                                              |
| **`crytic/slither-action@v0.4`**                         | Slither in CI.                                                                           |
| **`gitleaks/gitleaks-action@v2`**                        | Secret scanner.                                                                          |
| **`treosh/lighthouse-ci-action`**                        | Lighthouse CI.                                                                           |
| **`codecov/codecov-action@v4`**                          | Coverage upload.                                                                         |
| **Zenodo GitHub integration**                            | Free DOI minting on tag push. Configured at https://zenodo.org/account/settings/github/. |
| **`treestache/keep-a-changelog`** approach               | CHANGELOG manually curated; release.yml extracts entries.                                |

---

## Container & local stack

| Technology                              | Version                          | Why                                  |
| --------------------------------------- | -------------------------------- | ------------------------------------ |
| **Docker**                              | latest                           | Reviewer-friendly bring-up.          |
| **Docker Compose**                      | v2                               | Multi-service orchestration.         |
| **`node:20-bookworm-slim`**             | base for all JS Dockerfiles      | Native build deps + reasonable size. |
| **`mongo:7`**                           | service container                | DB.                                  |
| **`ipfs/kubo:latest`**                  | service container                | Local IPFS.                          |
| **`ghcr.io/foundry-rs/foundry:latest`** | for `contracts-deployer` service | Foundry binary.                      |
| **`hardhat`**                           | via Node image                   | Local EVM via `npx hardhat node`.    |

---

## What we're NOT using (and why)

| Tech                    | Why not                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| GraphQL (Apollo / urql) | Schema is small; OpenAPI is more reviewer-friendly + free Swagger UI.      |
| WebSockets / Socket.IO  | No real-time push needs; TanStack Query polling is sufficient.             |
| Redux / MobX / Zustand  | TanStack Query covers server state; React Context for sparse client state. |
| GraphQL Code Generator  | n/a (no GraphQL).                                                          |
| OpenZeppelin Contracts  | Adds attack surface; v1 contract is small and custom.                      |
| Hardhat Ignition        | Foundry script is enough for v1; Ignition optional in v2.                  |
| Subgraph (The Graph)    | Paper-scale data; deferred per ADR-006.                                    |
| AWS KMS SDK             | Documented in MAINNET_DEPLOY.md, not implemented.                          |
| Sentry / Datadog        | Self-hosted Pino + Prometheus is enough for v1.                            |
| Cypress                 | Playwright is the modern choice for new projects.                          |
| Jest                    | Vitest is faster + ESM-native.                                             |
| Webpack                 | Vite under the hood for Vitest; Next.js handles its own.                   |
| Babel                   | TypeScript + esbuild handle transpilation.                                 |
| Lerna                   | pnpm workspaces + Turbo (optional later) cover this.                       |
| Turbo                   | Build cache nice-to-have; deferred until pnpm gets slow.                   |
| Storybook               | Component library is shadcn copy-paste; deferred.                          |

---

## Version pinning policy

- **Solidity:** exact version locked (`pragma solidity 0.8.24`).
- **Node:** `20.x` LTS (any 20.x patch; `nvmrc` enforces major.minor floor).
- **All npm deps:** `^X.Y.Z` pinned via lockfile (`pnpm-lock.yaml`). Renovate (or Dependabot) PRs for bumps; CI validates on each.
- **Docker base:** image SHA pinning in production; tag pinning in dev.
