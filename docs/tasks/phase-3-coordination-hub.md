# Phase 3 — Coordination Hub (`apps/coordination-hub/`)

**Goal:** A NestJS service exposing all hub endpoints per [api-design.md](../architecture/api-design.md), passing integration tests (≥ 70% coverage), with Swagger at `/api/docs`.
**Effort:** ~5 days total (10 tickets).
**Prerequisites:** Phase 2.

---

### T-013 — NestJS skeleton + ConfigModule + observability bootstrap

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Initialize NestJS app with strict env validation, Pino logging, request ID interceptor, error filter, and Swagger setup. No business logic yet.

**Files to create/modify:**

- `apps/coordination-hub/package.json`
- `apps/coordination-hub/tsconfig.json`, `nest-cli.json`
- `apps/coordination-hub/src/main.ts` — bootstrap, helmet, CORS, swagger
- `apps/coordination-hub/src/app.module.ts`
- `apps/coordination-hub/src/config/config.module.ts`, `env.schema.ts` — Zod env validation
- `apps/coordination-hub/src/observability/logger.module.ts`, `health.controller.ts`, `metrics.controller.ts`
- `apps/coordination-hub/src/common/filters/http-exception.filter.ts` — error envelope
- `apps/coordination-hub/src/common/interceptors/transform.interceptor.ts`
- `apps/coordination-hub/src/common/interceptors/request-id.interceptor.ts`
- `apps/coordination-hub/src/common/exceptions/domain.exception.ts` — base class
- `apps/coordination-hub/.env.example` — per [inter-service-contract.md §3](../architecture/inter-service-contract.md#3-environment-variables--per-service)
- `apps/coordination-hub/Dockerfile` — node:20-bookworm-slim, multi-stage

**Acceptance criteria refs:** AC-CH-13, AC-CH-14, AC-CH-17
**ADRs:** ADR-002 (NestJS)
**Depends on:** T-002.
**Definition of Done:**

- [ ] `pnpm --filter coordination-hub start:dev` boots, `GET /api/v1/health` returns `{status: 'ok'}`.
- [ ] `GET /api/docs` shows Swagger UI.
- [ ] Missing required env var → process exits 1 with descriptive log.
- [ ] All requests log structured JSON (Pino) with `requestId`.
- [ ] Error envelope present on `404` (test by hitting unknown route).
- [ ] Helmet headers present in response.

---

### T-014 — Auth module: register, login, refresh, JWT guard

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Producer auth with bcrypt + JWT (access + refresh). Lockout after 5 failed logins in 15 min.

**Files to create/modify:**

- `apps/coordination-hub/src/auth/auth.module.ts`
- `apps/coordination-hub/src/auth/auth.controller.ts` — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- `apps/coordination-hub/src/auth/auth.service.ts`
- `apps/coordination-hub/src/auth/dto/register.dto.ts`, `login.dto.ts`, `refresh.dto.ts` — Zod via pipe
- `apps/coordination-hub/src/auth/strategies/jwt.strategy.ts`
- `apps/coordination-hub/src/auth/guards/jwt.guard.ts`
- `apps/coordination-hub/src/auth/exceptions.ts` — `EmailExistsException`, `InvalidCredentialsException`, `AccountLockedException`
- `apps/coordination-hub/test/integration/auth.spec.ts` — supertest covering happy + edge cases

**Acceptance criteria refs:** AC-CH-1, AC-CH-2
**ADRs:** ADR-002
**SR/R mapping:** R3 (accessibility — email/password familiar), security NF-S-7 (bcrypt 12 rounds)
**Depends on:** T-013, T-015 (producer schema; circular — co-implement).
**Definition of Done:**

- [ ] `POST /auth/register` creates a producer; returns `{accessToken, refreshToken, producer}`.
- [ ] `POST /auth/login` returns same envelope; bcrypt comparison correct.
- [ ] Wrong password 5× → 6th attempt returns 423 `ACCOUNT_LOCKED`.
- [ ] JWT contains `producerId`, `email`, `walletAddress`, expires in 24h.
- [ ] `POST /auth/refresh` exchanges valid refresh token for new access token.
- [ ] Throttler rate-limits `/auth/login` to 5/15min per IP+email.
- [ ] Integration tests cover all 7+ scenarios.

---

### T-015 — Producers module + wallet service (encryption)

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Producer profile + on-register wallet generation with AES-256-GCM at-rest encryption. Wallet decryption is in-memory only; buffer zeroed after signing.

**Files to create/modify:**

- `apps/coordination-hub/src/producers/producers.module.ts`
- `apps/coordination-hub/src/producers/producers.controller.ts` — `GET /producers/me`
- `apps/coordination-hub/src/producers/producers.service.ts` — create + load
- `apps/coordination-hub/src/producers/producer.schema.ts` — Mongoose schema per [database.md §3.1](../architecture/database.md#31-producerschemats)
- `apps/coordination-hub/src/blockchain/wallet.service.ts` — encrypt + decrypt + zero buffer
- `apps/coordination-hub/test/unit/wallet.service.spec.ts` — Vitest covering encrypt/decrypt round-trip + buffer zeroization (memory snapshot test)

**Acceptance criteria refs:** AC-CH-3, AC-CH-12
**ADRs:** ADR-004 (server-managed wallets)
**SR/R mapping:** NF-S-6 (AES-256-GCM), NF-S-11 (no key in logs)
**Depends on:** T-013.
**Definition of Done:**

- [ ] `GET /producers/me` (with valid JWT) returns profile incl. `walletAddress`.
- [ ] Producer document in Mongo has `encryptedPrivateKey`, `encryptionIV`, `encryptionAuthTag`; never raw `privateKey`.
- [ ] `WalletService.decrypt` round-trips correctly with KEK.
- [ ] After signing, the private-key buffer is filled with zeros (verified via memory snapshot in test).
- [ ] CI grep test: `grep -r "console.log.*privateKey" apps/coordination-hub/src/` returns 0 matches.

---

### T-016 — Projects module: CRUD + on-chain `registerProject`

**Phase:** 3 · **Feature:** F3 · **Effort:** L

**Description.** Producer creates a project: hub auto-generates `phi` (random bytes32 with collision retry), persists metadata, then calls `registerProject(phi)` on-chain via the producer's wallet.

**Files to create/modify:**

- `apps/coordination-hub/src/projects/projects.module.ts`
- `apps/coordination-hub/src/projects/projects.controller.ts` — POST/GET/PATCH/DELETE per [api-design.md](../architecture/api-design.md)
- `apps/coordination-hub/src/projects/projects.service.ts`
- `apps/coordination-hub/src/projects/project.schema.ts` — Mongoose per [database.md §3.2](../architecture/database.md#32-projectschemats)
- `apps/coordination-hub/src/projects/dto/create-project.dto.ts`, `update-project.dto.ts` — Zod via pipe
- `apps/coordination-hub/src/blockchain/contract.service.ts` — typed `ProductRegistry` from `@qr-bc/shared`
- `apps/coordination-hub/src/blockchain/provider.service.ts` — RPC provider per `NETWORK`
- `apps/coordination-hub/test/integration/projects.spec.ts`

**Acceptance criteria refs:** AC-CH-3, AC-CH-4
**ADRs:** ADR-002, ADR-013 (soft delete)
**SR/R mapping:** SR1 (off-chain ownership matches on-chain); R2 (efficient batch)
**Depends on:** T-014, T-015, T-012.
**Definition of Done:**

- [ ] `POST /projects` creates Mongo doc + calls `registerProject(phi)`; tx hash persisted.
- [ ] Collision retry: if `projectExists(phi)` true, regenerate up to 3 times.
- [ ] `GET /projects` returns paginated list filtered by owner; `pageSize` capped at 100.
- [ ] `PATCH /projects/:phi` from non-owner returns 403.
- [ ] `DELETE /projects/:phi` is soft delete (`isDeleted: true`).
- [ ] `GET /projects/:phi` (anonymous) returns metadata only if `status ∈ {harvesting, finished}` AND `projectExists(phi)` true on-chain.
- [ ] Integration tests cover ≥ 8 scenarios; coverage ≥ 70% on this module.

---

### T-017 — Activities + Certifications nested CRUD

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Sub-resources under a project. Activities are nested subdocuments; certifications include PDF upload (PDF goes to IPFS in T-018).

**Files to create/modify:**

- `apps/coordination-hub/src/activities/activities.module.ts`, `activities.controller.ts`, `activities.service.ts`
- `apps/coordination-hub/src/activities/dto/cultivation-activity.dto.ts` (uses Zod schema from `@qr-bc/shared`)
- `apps/coordination-hub/src/certifications/certifications.module.ts`, `certifications.controller.ts`, `certifications.service.ts`
- `apps/coordination-hub/src/certifications/dto/certification.dto.ts`
- `apps/coordination-hub/test/integration/activities.spec.ts`
- `apps/coordination-hub/test/integration/certifications.spec.ts`

**Acceptance criteria refs:** AC-CH-3 (CRUD), AC-CH-4 (ownership)
**ADRs:** ADR-016 (Mongoose subdocs)
**Depends on:** T-016.
**Definition of Done:**

- [ ] `POST /projects/:phi/activities` adds subdocument; ownership enforced.
- [ ] `PATCH/DELETE /projects/:phi/activities/:id` work.
- [ ] Activity types match enum: `land_preparation | planting | fertilizing | pest_control | harvesting | other`.
- [ ] `POST /projects/:phi/certifications` accepts multipart with PDF (storage pinned in T-018).
- [ ] Integration tests cover happy + 403 + 404 paths.

---

### T-018 — Uploads module: IPFS local + Pinata adapters

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Adapter pattern for IPFS pinning; switch by `IPFS_PROVIDER` env. Used for product images + certification PDFs.

**Files to create/modify:**

- `apps/coordination-hub/src/uploads/uploads.module.ts`
- `apps/coordination-hub/src/uploads/uploads.service.ts` — `pinFile`, `pinJson`
- `apps/coordination-hub/src/uploads/ipfs-adapter.interface.ts`
- `apps/coordination-hub/src/uploads/kubo.adapter.ts` — `ipfs-http-client`
- `apps/coordination-hub/src/uploads/pinata.adapter.ts` — `@pinata/sdk`
- `apps/coordination-hub/src/uploads/uploads.controller.ts` — `POST /projects/:phi/images`
- MIME sniffing helper (`file-type` package)
- `apps/coordination-hub/test/integration/uploads.spec.ts` — uses local Kubo from compose; mock for CI

**Acceptance criteria refs:** AC-CH-9 (image upload pinned), EC-CH-9, EC-CH-10, EC-CH-11
**ADRs:** ADR-005 (IPFS dual provider)
**Depends on:** T-017.
**Definition of Done:**

- [ ] `POST /projects/:phi/images` accepts up to 10 files of ≤ 10 MB each; returns `{urls: ipfs://CID/...}`.
- [ ] PDF upload (in cert flow) returns CID URL.
- [ ] Non-image/PDF MIME → 415 `UNSUPPORTED_MEDIA_TYPE`.
- [ ] File > 10 MB → 413 `PAYLOAD_TOO_LARGE`.
- [ ] Both `IPFS_PROVIDER=local` and `IPFS_PROVIDER=pinata` selectable; no code changes to switch.
- [ ] Mock adapter (`uploads.adapter.mock.ts`) used in CI for hermetic tests.

---

### T-019 — Blockchain module: provider, contract, nonce manager

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Concentrate all `ethers.js` v6 usage in one module. Provider, contract instance, nonce manager for the system hot wallet.

**Files to create/modify:**

- `apps/coordination-hub/src/blockchain/blockchain.module.ts`
- `apps/coordination-hub/src/blockchain/provider.service.ts` — selects RPC URL by `NETWORK`
- `apps/coordination-hub/src/blockchain/contract.service.ts` — typed contract from `@qr-bc/shared` ABI; LRU cache for `view` calls (5s TTL)
- `apps/coordination-hub/src/blockchain/nonce-manager.service.ts` — wraps `ethers.NonceManager` for the system wallet
- `apps/coordination-hub/src/blockchain/system-wallet.service.ts` — loads private key from env (testnet only)
- `apps/coordination-hub/src/blockchain/exceptions.ts` — maps custom errors → domain exceptions per [system-design.md §3.4](../architecture/system-design.md#3-error-handling-strategy)
- `apps/coordination-hub/test/unit/contract.service.spec.ts`

**Acceptance criteria refs:** AC-CH-13 (RPC error metric), AC-CH-19, AC-CH-20
**ADRs:** ADR-014 (system wallet)
**SR/R mapping:** SR4 (system wallet cannot fabricate AUTHENTIC; contract recomputes hash)
**Depends on:** T-012, T-013.
**Definition of Done:**

- [ ] Hub boots with `NETWORK=hardhat | amoy | mainnet`; right RPC + contract address loaded.
- [ ] System hot wallet present and not zero balance (health check passes on Hardhat default).
- [ ] Custom error → domain exception mapping covered for all 8 contract errors.
- [ ] LRU cache hit rate > 80% in load test (read-heavy traffic).
- [ ] Nonce manager prevents nonce conflicts under concurrent redeems (test with 10 parallel calls).

---

### T-020 — Scan module: public + private with pre-check

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** The headline feature. `GET /scan/public/:phi` does projectExists + DB lookup. `POST /scan/private` follows Algorithm 3 phases.

**Files to create/modify:**

- `apps/coordination-hub/src/scan/scan.module.ts`
- `apps/coordination-hub/src/scan/scan.controller.ts`
- `apps/coordination-hub/src/scan/scan.service.ts` — Phase 1 pre-check, Phase 2 redeem, Phase 3 evidence
- `apps/coordination-hub/src/scan/dto/scan-private.dto.ts`
- `apps/coordination-hub/src/scan/verification-log.schema.ts` — per [database.md §3.3](../architecture/database.md#33-verification-logschemats)
- `apps/coordination-hub/src/scan/verification-log.service.ts`
- `apps/coordination-hub/test/integration/scan.spec.ts` — covers all 3 outcomes

**Acceptance criteria refs:** AC-CH-6, AC-CH-7, AC-CH-8, AC-CH-9, AC-CH-10, AC-CH-11
**ADRs:** ADR-006 (RPC direct event lookup), ADR-014
**SR/R mapping:** SR1 (COUNTERFEIT path), SR2 (ALREADY_VERIFIED path), SR3 (event in evidence), SR4 (hub doesn't determine outcome)
**Depends on:** T-019.
**Definition of Done:**

- [ ] `GET /scan/public/:phi` returns 404 if `projectExists(phi)` is false.
- [ ] `POST /scan/private` with unknown sid returns `COUNTERFEIT` in ≤ 5s (no tx submitted).
- [ ] `POST /scan/private` with redeemed sid returns `ALREADY_VERIFIED` with `previousTxHash`.
- [ ] `POST /scan/private` with valid sid returns `AUTHENTIC` with `txHash + eventArgs + verifiedAt` in ≤ 35s on Amoy / ≤ 5s on Hardhat.
- [ ] Race condition (pre-check OK, tx reverts) handled — returns `ALREADY_VERIFIED`.
- [ ] Throttler limits `/scan/private` to 60/min per IP.
- [ ] All 3 verification outcomes logged to `verificationLogs` collection.
- [ ] Mutation test: hub patched to lie still cannot deceive a reviewer who cross-checks Polygonscan.

---

### T-021 — Health, metrics, audit log

**Phase:** 3 · **Feature:** F3 · **Effort:** S

**Description.** Production-grade observability surface.

**Files to create/modify:**

- `apps/coordination-hub/src/observability/health.controller.ts` — `/health` per [system-design.md §7](../architecture/system-design.md#7-observability)
- `apps/coordination-hub/src/observability/metrics.controller.ts` — Prometheus exposition
- `apps/coordination-hub/src/observability/audit-log.service.ts`
- `apps/coordination-hub/src/observability/audit-log.schema.ts` per [database.md §3.4](../architecture/database.md#34-audit-logschemats)
- `apps/coordination-hub/test/integration/observability.spec.ts`

**Acceptance criteria refs:** AC-CH-13
**ADRs:** —
**Depends on:** T-019.
**Definition of Done:**

- [ ] `GET /health` returns full status with `mongo`, `rpc`, `ipfs`, `systemWallet.balanceMatic`.
- [ ] `GET /metrics` returns Prometheus text format with `http_requests_total`, `http_request_duration_seconds`, `blockchain_rpc_errors_total`, `tx_confirmation_seconds`.
- [ ] Audit log persists every `PROJECT_CREATE`, `BATCH_REGISTER`, `PRODUCT_REDEEM`, `LOGIN_FAILURE`.
- [ ] `/health` returns 503 if any check fails.

---

### T-022 — Seed script + batches endpoint + final integration

**Phase:** 3 · **Feature:** F3 · **Effort:** M

**Description.** Implement the batch generation endpoint (most complex) and the seed script for 3 demo HTX rau projects. Wire all modules together; final integration smoke.

**Files to create/modify:**

- `apps/coordination-hub/src/projects/batches/batches.controller.ts` — `POST /projects/:phi/batches`, `GET /projects/:phi/batches`
- `apps/coordination-hub/src/projects/batches/batches.service.ts` — generate sids → hashes → registerBatch → QR PNGs → ZIP
- `apps/coordination-hub/src/projects/batches/qr-generator.service.ts` — `qrcode` package
- `apps/coordination-hub/src/projects/batches/zip-builder.service.ts` — `archiver` package
- `apps/coordination-hub/src/seed/seed.script.ts` — invoked via `pnpm seed`
- `apps/coordination-hub/src/seed/fixtures/htx-van-noi.json`
- `apps/coordination-hub/src/seed/fixtures/htx-tan-duc.json`
- `apps/coordination-hub/src/seed/fixtures/htx-cu-chi.json`
- `apps/coordination-hub/src/seed/fixtures/images/*.jpg` — placeholder photos
- `apps/coordination-hub/test/e2e/full-flow.spec.ts` — register → create project → batch → scan public → scan private

**Acceptance criteria refs:** AC-CH-5, AC-CH-15, AC-CH-16, AC-SD-1, AC-SD-2, AC-SD-3, AC-SD-5
**ADRs:** ADR-014
**SR/R mapping:** R2 (batch performance), SR1 (registerBatch from owner only)
**Depends on:** T-016, T-018, T-020.
**Definition of Done:**

- [ ] `POST /projects/:phi/batches { n: 100 }` produces ZIP in ≤ 6s on Hardhat (≤ 6s on Amoy per Paper Table 3 row 1).
- [ ] ZIP contains: `public.png`, `private_001.png` … `private_100.png`, `manifest.json`.
- [ ] `manifest.json` lists `{filename, secretId}` pairs (so producer can recover sid if lost).
- [ ] sid_i values NEVER persisted server-side after ZIP delivered.
- [ ] `pnpm seed` populates 3 demo HTX with 5 cultivation activities each + 1 cert each + 3 images each; idempotent (re-run skips existing).
- [ ] E2E test passes the full flow: register producer → create project → batch 5 sids → scan public → scan one private (AUTHENTIC) → scan again (ALREADY_VERIFIED) → scan invalid sid (COUNTERFEIT).
- [ ] Hub coverage ≥ 70% lines.
