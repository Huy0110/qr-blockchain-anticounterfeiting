# Feature F8 + F9 — DevOps: Docker Compose & GitHub Actions CI

**Modules:** `docker-compose.yml`, `.github/workflows/`
**Priority:** P0
**Depends on:** F1, F3, F4, F5, F6
**Paper section:** Reproducibility goals from `repo_requirements.md` §1.2.

---

## Purpose

1. **Docker Compose** — one command (`docker compose up`) brings up the entire local stack so a reviewer can reproduce experiments without manual setup.
2. **GitHub Actions CI** — three workflows enforcing quality gates on push/PR + automating Zenodo deposit on tag.

---

## F8 — Docker Compose

### User stories

- **US-DO-1.** As a **reviewer**, I want to run `docker compose up` and have hub + Mongo + IPFS local + Hardhat node running and reachable in < 60 s, so that I don't manually install MongoDB, IPFS, etc.
- **US-DO-2.** As a **developer**, I want hot-reload during development so that hub changes reflect without rebuilding the image.
- **US-DO-3.** As a **reviewer**, I want a `--profile testnet` mode that switches RPC to Amoy so I can run experiments against real testnet without local Hardhat.

### Services

```yaml
services:
  mongo: # MongoDB 7 + healthcheck
  ipfs: # ipfs/kubo image, port 5001 (API) + 8080 (gateway)
  hardhat: # custom Dockerfile running `npx hardhat node`
  contracts-deployer: # one-shot service deploys ProductRegistry to hardhat, writes address to shared volume
  coordination-hub: # NestJS app, depends_on hardhat (+ contracts-deployer), volume-mounted source for hot-reload in dev
  management-portal: # Next.js dev server (NOT on IPFS for local dev)
  dapp-portal: # Next.js dev server (NOT on IPFS for local dev; pin command separate)
```

### Profiles

- `default` — hardhat + all apps (offline reproducibility).
- `testnet` — skip hardhat + contracts-deployer; hub/scripts use Amoy RPC.
- `prod` — hub only, expects MongoDB Atlas + Pinata + mainnet RPC.

### Volumes & networking

- `mongo-data:/data/db`
- `ipfs-data:/data/ipfs`
- `contracts-out:/contracts/out` (shared between contracts-deployer and hub for ABI + address)
- All services on `qr-bc-net` bridge network.

### Healthchecks

- `mongo`: `mongosh --eval 'db.runCommand({ ping: 1 })'`
- `ipfs`: `curl -s http://localhost:5001/api/v0/version`
- `hardhat`: `curl -s -X POST http://localhost:8545 -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
- `coordination-hub`: `curl -s http://localhost:3000/health`

### Acceptance criteria

| #       | Criterion                                                                                                        | Verified by         |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- |
| AC-DO-1 | `docker compose up` from a fresh checkout brings all services healthy in ≤ 60 s                                  | Manual + CI dry run |
| AC-DO-2 | `docker compose up --profile testnet` skips hardhat + uses Amoy                                                  | Manual              |
| AC-DO-3 | All Dockerfiles use `node:20-bookworm-slim` (per gathered-req §5)                                                | `grep` lint         |
| AC-DO-4 | Hot reload works on hub source change                                                                            | Manual              |
| AC-DO-5 | `docker compose down -v` cleans all volumes; subsequent up works                                                 | Manual              |
| AC-DO-6 | Compose file passes `docker compose config` validation in CI                                                     | CI                  |
| AC-DO-7 | Contracts deployer writes `contracts/out/ProductRegistry.json` + `address.local.json` consumed by hub on startup | Manual + CI smoke   |

---

## F9 — GitHub Actions CI

### Workflows

#### `contracts-ci.yml`

Triggered on: `push`, `pull_request` (paths: `contracts/**`, workflow itself).

Jobs:

1. **lint** — Solhint, Prettier on Solidity.
2. **build** — `forge build --sizes`.
3. **test** — `forge test --fuzz-runs 256` + Hardhat tests.
4. **coverage** — `forge coverage --report lcov` → upload to Codecov; gate ≥ 90%.
5. **slither** — `crytic/slither-action@v0.4`; gate `--fail-on high`.
6. **gas-snapshot** — `forge snapshot --check` (fails if drift > 5%).

#### `apps-ci.yml`

Triggered on: `push`, `pull_request` (paths: `apps/**`, `packages/**`).

Jobs (matrix per app: hub, dapp-portal, management-portal):

1. **install** — `pnpm install --frozen-lockfile`.
2. **typecheck** — `pnpm --filter <app> typecheck`.
3. **lint** — `pnpm --filter <app> lint`.
4. **test-unit** — `pnpm --filter <app> test`.
5. **build** — `pnpm --filter <app> build`.
6. **e2e** (hub only — uses Hardhat node + Mongo via service containers).
7. **lighthouse** (frontends only — Lighthouse CI on built static assets, gate ≥ 80 perf, ≥ 90 a11y).

#### `release.yml`

Triggered on: `push` of tag `v*.*.*`.

Jobs:

1. Verify all `contracts-ci` and `apps-ci` are green.
2. Build all artifacts (contracts ABI, hub Docker image, static dApp export).
3. Create GitHub Release with changelog.
4. Push static dApp build to **Pinata** via API → record CID.
5. Trigger **Zenodo** deposit via Zenodo's GitHub integration (auto-fires on release).
6. Comment on release with: Pinata CID + Zenodo DOI URL.

#### `gitleaks.yml`

Triggered on: every push.

Job: `gitleaks/gitleaks-action@v2` — fail PR if any secret pattern detected.

#### `commitlint.yml`

Triggered on: pull_request.

Job: validate Conventional Commits format.

### Common config

- Use `actions/setup-node@v4` with Node 20.
- Use `pnpm/action-setup@v3` with pnpm 9.
- Cache `~/.pnpm-store` and `~/.foundry/cache` for speed.
- Concurrency: cancel in-progress on new push to same PR.

### Service containers in CI

- `mongo:7` for hub e2e tests.
- `node:20` running Hardhat node started via `npx hardhat node &` step.
- IPFS not used in CI (mock IPFS uploads).

### Secrets needed in repo settings

- `CODECOV_TOKEN` (for coverage upload).
- `PINATA_JWT` (for release.yml dApp pinning).
- (Zenodo uses GitHub OAuth, no secret needed.)

### Acceptance criteria

| #        | Criterion                                                                                   | Verified by         |
| -------- | ------------------------------------------------------------------------------------------- | ------------------- |
| AC-CI-1  | All 3 main workflows (`contracts-ci`, `apps-ci`, `release`) defined and runnable            | CI dry run          |
| AC-CI-2  | `contracts-ci` passes on a clean PR                                                         | First PR            |
| AC-CI-3  | `apps-ci` passes on a clean PR                                                              | First PR            |
| AC-CI-4  | `gitleaks.yml` rejects a PR that introduces a fake secret                                   | Negative test       |
| AC-CI-5  | `commitlint.yml` rejects a PR with non-Conventional commit                                  | Negative test       |
| AC-CI-6  | Tag push of `v0.0.1-test` triggers `release.yml` and produces a Pinata CID + Zenodo deposit | Manual on test repo |
| AC-CI-7  | Coverage threshold gate (90% Solidity, 70% TS) blocks PR if regressed                       | Negative test       |
| AC-CI-8  | All workflows complete in ≤ 10 min on average                                               | CI dashboard        |
| AC-CI-9  | CI badges in README: build, coverage, Slither, license                                      | Manual              |
| AC-CI-10 | `release.yml` produces a `CHANGELOG.md` snippet appended to GitHub release notes            | Manual              |

---

## Non-goals

- No multi-platform Docker images (linux/amd64 only).
- No Kubernetes / Helm charts.
- No Terraform / IaC for cloud deploy.
- No Argo / Tekton.
- No private registry mirroring.
- No notary / SBOM signing in v1.
