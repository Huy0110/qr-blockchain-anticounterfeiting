# Phase 7 — Docker Compose

**Goal:** `docker compose up` brings up the entire local stack (mongo + ipfs + hardhat + contracts-deployer + hub + 2 portals) in ≤ 60 s, with profiles for testnet/prod.
**Effort:** ~1 day total (2 tickets).
**Prerequisites:** Phases 1–5.

---

### T-036 — Docker Compose stack + service Dockerfiles

**Phase:** 7 · **Feature:** F8 · **Effort:** M

**Description.** Build per-service Dockerfiles and orchestrate with Compose. Use `node:20-bookworm-slim` per ADR.

**Files to create/modify:**

- `docker-compose.yml` (root) — services + volumes + networks per [inter-service-contract.md §4](../architecture/inter-service-contract.md#4-docker-network-topology-docker-composeyml)
- `apps/coordination-hub/Dockerfile` — multi-stage (deps → build → runtime), runs as non-root user
- `apps/management-portal/Dockerfile`
- `apps/dapp-portal/Dockerfile`
- `contracts/Dockerfile` — Foundry image, runs `pnpm hardhat node` for default profile, `pnpm deploy:hardhat` one-shot for `contracts-deployer`
- `.dockerignore` files per service

**Acceptance criteria refs:** AC-DO-3, AC-DO-7
**ADRs:** —
**Depends on:** T-022, T-027, T-032.
**Definition of Done:**

- [ ] All Dockerfiles use `node:20-bookworm-slim` base (verified via `grep`).
- [ ] All services run as non-root user in container.
- [ ] Image sizes documented in `docker-compose.yml` comments (target: hub < 500 MB, portals < 400 MB each).
- [ ] `.dockerignore` excludes `node_modules`, `.git`, `dist/`, etc.
- [ ] `docker compose build` succeeds without warnings.

---

### T-037 — Compose profiles + healthchecks + smoke test

**Phase:** 7 · **Feature:** F8 · **Effort:** S

**Description.** Wire up healthchecks, depends_on conditions, profiles (`default | testnet | prod`), and a smoke test.

**Files to create/modify:**

- `docker-compose.yml` — finalize healthchecks per [inter-service-contract.md §4](../architecture/inter-service-contract.md#4-docker-network-topology-docker-composeyml)
- `docker-compose.testnet.override.yml` — overrides for testnet profile
- `docker-compose.prod.override.yml` — overrides for prod (mongo + ipfs externalized)
- `scripts/smoke-test.sh` — `docker compose up -d && wait-for-healthy && curl /health && docker compose down`
- `Makefile` — `make demo` runs the smoke test

**Acceptance criteria refs:** AC-DO-1, AC-DO-2, AC-DO-4, AC-DO-5, AC-DO-6
**ADRs:** ADR-005 (IPFS dual provider supported via env switch)
**Depends on:** T-036.
**Definition of Done:**

- [ ] `docker compose up` brings all services healthy (per `docker compose ps` reporting `healthy`) in ≤ 60 s.
- [ ] `docker compose --profile testnet up` skips hardhat + deployer; hub uses Amoy RPC.
- [ ] `make demo` succeeds end-to-end (up → smoke → down).
- [ ] `docker compose down -v` removes volumes; subsequent `up` is clean.
- [ ] `docker compose config` validates the YAML in CI.
- [ ] Hot-reload works: edit `apps/coordination-hub/src/main.ts` → hub restarts (volume mount).
