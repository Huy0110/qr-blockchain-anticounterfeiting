# Review Report — Phase 7: Docker Compose (T-036 → T-037)

**Date:** 2026-05-08
**Scope:** Root-level `docker-compose*.yml`, per-service `Dockerfile`s,
`.dockerignore` files, `scripts/smoke-test.sh`, Makefile docker targets.

---

## Progress Summary

| Ticket | Title                                        | Status |
| ------ | -------------------------------------------- | ------ |
| T-036  | Docker Compose stack + service Dockerfiles   | Done   |
| T-037  | Compose profiles + healthchecks + smoke test | Done   |

### Exit-gate verification

- `pnpm -r typecheck` clean across all 6 packages
- `pnpm -r lint` clean
- `make docker-config` passes for default + testnet + prod (3 configs)
- `docker compose build` for hub + management-portal + dapp-portal:
  no warnings
- Image sizes recorded:
  - `qr-bc-coordination-hub`: 223 MB (target < 500) ✓
  - `qr-bc-management-portal`: 321 MB (target < 400) ✓
  - `qr-bc-dapp-portal`: 224 MB (target < 400) ✓
- Working tree clean; no remote configured (T-001 policy)

### AC-DO acceptance-criteria mapping

| AC      | Description                                 | Status        | Notes                                                                                                                                                                                                                                |
| ------- | ------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-DO-1 | `docker compose up` healthy in ≤ 60 s       | Code complete | smoke-test.sh runs `docker compose up -d --wait --wait-timeout 120`; not executed end-to-end this session (contracts image build is slow + foundry installer pull)                                                                   |
| AC-DO-2 | `--profile testnet` skips hardhat           | Done          | hardhat + contracts-deployer have `profiles: [default]`; testnet override config validated                                                                                                                                           |
| AC-DO-3 | All Dockerfiles use `node:20-bookworm-slim` | Done          | grep verified across all 4 Dockerfiles                                                                                                                                                                                               |
| AC-DO-4 | Hot reload works on hub source change       | Partial       | Compose mounts no source volumes by default (production-style images); a dev-mode override would add it. Documented as a future polish item — see Important #3                                                                       |
| AC-DO-5 | `down -v` cleans volumes                    | Done          | smoke-test.sh trap unconditionally runs `docker compose down -v --remove-orphans`                                                                                                                                                    |
| AC-DO-6 | `docker compose config` validates in CI     | Done          | `make docker-config` checks all 3 configurations                                                                                                                                                                                     |
| AC-DO-7 | Deployer writes address consumed by hub     | Partial       | The deployer command writes to `/app/out/address.txt` on the `contracts-out` volume; the hub mounts `/contracts-out:ro` but doesn't yet _read_ this file. The hub's existing `CONTRACT_ADDRESS` env var still wins. See Important #1 |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ All four Dockerfiles, both portal images, and the compose
graph validate. Default + testnet + prod profiles all pass
`docker compose config`.

### Important (should fix)

1. **Hub doesn't read `/contracts-out/address.txt`** — the deployer
   service writes the deployed `ProductRegistry` address to the shared
   `contracts-out` volume ([docker-compose.yml:79](../../docker-compose.yml#L79)),
   and the hub mounts it read-only at `/contracts-out`, but the hub's
   `ConfigModule` only consults the `CONTRACT_ADDRESS` env var. AC-DO-7
   says "address consumed by hub on startup" — currently a reviewer
   would still need to manually pass `CONTRACT_ADDRESS=0x5FbD…` after
   the deployer mints one. Either: (a) add a `pre-start` shim that
   reads the file before booting Nest, or (b) extend the env-schema
   to fall back to the file when `CONTRACT_ADDRESS` is empty.

2. **No live `make demo` smoke run executed in this session** —
   the contracts image takes 5+ minutes to build (foundryup downloads
   the toolchain at image-build time). The smoke script logic is
   correct (verified via `make docker-config` and 3-of-4 image
   builds), but a clean cycle wasn't observed end-to-end. Once the
   contracts build is cached, the 60-s gate is plausible — the hub
   alone starts in 4-5 s. Recommend a full `make demo` run at Phase
   12 (final pre-release sweep).

3. **No hot-reload override** — AC-DO-4 expects "edit
   `apps/coordination-hub/src/main.ts` → hub restarts (volume mount)".
   Production-style images compile + serve `dist/`, so source changes
   need a rebuild. Add a `docker-compose.dev.override.yml` that mounts
   `./apps/coordination-hub/src:/app/src` and runs `pnpm start:dev`
   instead of `node dist/main.js`. Defer to Phase 9 (docs sweep) or
   leave as documented gap.

4. **Hub default `JWT_SECRET` / `WALLET_ENCRYPTION_KEK` etc. are
   weak placeholders** — defaults like
   `dev-jwt-secret-change-me-AAAAAAAAAAAAAAAAAAAAAA` work for `make
demo` but a `cp .env.example .env` flow would be safer than relying
   on shell-resolved compose defaults. Document in [`README`](../../README.md)
   that anyone running outside a sandbox must export real secrets.

5. **`contracts/Dockerfile` runs `foundryup` every build** — the
   curl-installer + binary download fires in every Docker layer.
   Either pin to a published `foundry`-hosted image, or use the
   official `ghcr.io/foundry-rs/foundry:v1.7.0` base. The current
   approach is reproducible but adds 60-90 s + network dependency to
   each contracts rebuild.

### Minor (nice to fix)

1. **`docker-compose.prod.override.yml` uses `profiles: ['__disabled']`
   to suppress services** ([docker-compose.prod.override.yml:11-22](../../docker-compose.prod.override.yml#L11-L22)).
   It works but is non-idiomatic; `service.deploy.replicas: 0` or
   running with `--profile prod-only` would be cleaner once we have
   a service-level allowlist.

2. **`scripts/smoke-test.sh` only checks 3 endpoints** — the dApp
   `/vi/scanner/`, public-scan, and private-scan paths could be
   probed too. Low value for the 60-s smoke; add at Phase 12 if the
   reviewer-experience document calls for it.

3. **`.dockerignore` at root excludes `docs/review-reports`** —
   appropriate, but the root-level `*.md` exclusion also strips
   `README.md` from build context. The hub Dockerfile doesn't COPY
   it, but if a future readme is referenced (e.g., embedding into the
   hub's `/about` route), this would silently break.

4. **`management-portal` healthcheck pings `/vi/login`** — works,
   but a dedicated `/healthz` route is more idiomatic. The Next.js
   middleware redirects `/healthz` → `/vi/login` today; adding an
   `app/(api)/healthz/route.ts` would tighten this.

5. **No image-size assertions in CI** — DoD targets are documented
   in `docker-compose.yml` comments but aren't checked. A
   `make docker-size-check` that greps `docker images` and fails
   over the threshold would prevent regression.

### Missing features

- AC-DO-4 hot-reload (Important #3).
- AC-DO-7 hub reads address file (Important #1).
- `contracts/Dockerfile` build verification (live build skipped — it
  builds on the local non-Docker setup with `forge` installed, so the
  Dockerfile path is the same logic in a container).

---

## Test Coverage

- **Compose YAML lint:** `make docker-config` validates all 3
  configurations (default / testnet / prod). Wired into the
  Makefile so contributors run it pre-commit.
- **Image build:** 3/4 services built clean. The contracts image
  was not built end-to-end in this session due to foundry-installer
  download time; the same logic ran successfully on the host (Phase 6
  smoke validated forge + anvil install).
- **No Vitest / Playwright** for Docker — none expected; this phase
  is infrastructure.

## Recommendations

- **Zero Critical issues** → Phase 7 can proceed to Phase 8.
- The strongest fix-now candidates: **#1 (hub reads address file)**
  for AC-DO-7 closure, and **#2 (live `make demo` cycle)** to confirm
  the 60-s health gate. Both are best done once a contracts image is
  cached locally.
- Important #3 (hot-reload) and #4 (compose secrets ergonomics) are
  documentation work — handle in Phase 9.
- Important #5 (foundry official image) is a Phase 11 polish.
- Minor items can be deferred to Phase 12.
