# Feature F3 — Coordination Hub (`apps/coordination-hub/`)

**Module:** NestJS service + MongoDB
**Priority:** P0
**Depends on:** F1, F2
**Paper section:** §7.2 Mapping from Design (lines 828–842), §8 Experiments (lines 875–957).

---

## Purpose

Single off-chain service that:

1. Authenticates producers (email + JWT).
2. Stores project metadata, cultivation activities, certifications (off-chain MongoDB).
3. Manages producer wallets (encrypted at rest).
4. Submits `redeemProduct` transactions on behalf of consumers via a system hot wallet (testnet).
5. Provides read-only on-chain query endpoints to dApp + management portal.

Per paper §7.2 / SR4: the hub does NOT determine verification outcomes — the smart contract does. The hub is a transport / proxy layer.

---

## User stories

### Producer-facing

- **US-CH-1.** As a **producer**, I want to register an account with email + password so that I can manage my projects.
- **US-CH-2.** As a **producer**, I want to log in and receive a JWT so that subsequent API calls are authenticated.
- **US-CH-3.** As a **producer**, I want my Polygon wallet to be generated server-side and encrypted at rest so that I don't have to manage seed phrases.
- **US-CH-4.** As a **producer**, I want to CRUD my project metadata (cooperative, vegetable type, location, dates, area, output, description, cultivation activities, certifications, images) so that consumers see traceability info.
- **US-CH-5.** As a **producer**, I want to upload PDF certifications and JPG product images, which are pinned to IPFS so that they remain immutable + publicly accessible.
- **US-CH-6.** As a **producer**, I want to trigger a batch generation of N private secrets (N ≤ 500), have the hub: (a) generate N `sid_i`, (b) compute hashes locally, (c) submit `registerBatch` via my wallet, (d) return N private QR PNGs + 1 public QR PNG zipped.
- **US-CH-7.** As a **producer**, I want to mark a project status (`in_progress`, `harvesting`, `finished`) so that the dApp can render lifecycle.
- **US-CH-8.** As a **producer**, I want to soft-delete a project so that it disappears from the management UI but remains in audit logs.

### Consumer-facing (anonymous)

- **US-CH-9.** As a **consumer dApp**, I want to call `GET /scan/public/:phi` to retrieve project metadata (with on-chain `projectExists` precheck) so that I render the public-QR page.
- **US-CH-10.** As a **consumer dApp**, I want to call `POST /scan/private` with `{phi, sid}` and receive `(outcome, txHash, eventArgs)` so that I render the private-QR result. The hub MUST do an on-chain pre-check before submitting tx (saves gas if invalid/redeemed).

### Reviewer

- **US-CH-11.** As a **reviewer**, I want a healthcheck `GET /health` so that I can verify the hub is responding.
- **US-CH-12.** As a **reviewer**, I want a metrics endpoint `GET /metrics` (Prometheus format) so that I can confirm the system can be observed.
- **US-CH-13.** As a **reviewer**, I want OpenAPI/Swagger docs at `/api/docs` so that I can explore endpoints.

---

## Detailed requirements

### Tech stack

- **NestJS 10.x** with TypeScript strict mode.
- **MongoDB** via Mongoose, switchable between local docker and Atlas via `MONGO_URI`.
- **ethers.js v6** for blockchain interaction.
- **bcrypt** for password hashing (12 rounds).
- **jsonwebtoken** for JWT (HS256, 24h expiry, refresh token 30d).
- **multer** for file uploads → pinned to IPFS via `ipfs-http-client` (local node) or **Pinata SDK** (switch via `IPFS_PROVIDER`).
- **class-validator** + Zod for DTO validation.
- **Helmet**, **rate-limit** for HTTP hardening.
- **Pino** logger, structured JSON.
- **Swagger** (`@nestjs/swagger`) auto-generated OpenAPI 3.

### Module structure

```
src/
  main.ts
  app.module.ts
  config/                  # ConfigModule (env vars, validated)
  auth/                    # producer registration/login + JWT guard
  producers/               # producer profile, wallet management
  projects/                # project metadata CRUD
  cultivation-activities/  # nested under project
  certifications/          # nested under project
  uploads/                 # IPFS pinning service
  blockchain/              # ethers provider, contract service, wallet service
  scan/                    # public + private scan endpoints
  observability/           # /health, /metrics, structured logging
  seed/                    # 3 demo HTX rau seed data
```

### REST endpoints (initial — final contract in `/03-design-architecture`)

| Method   | Path                            | Auth        | Purpose                                                            |
| -------- | ------------------------------- | ----------- | ------------------------------------------------------------------ |
| `POST`   | `/auth/register`                | none        | Create producer account                                            |
| `POST`   | `/auth/login`                   | none        | Returns access + refresh JWTs                                      |
| `POST`   | `/auth/refresh`                 | refresh JWT | New access JWT                                                     |
| `GET`    | `/producers/me`                 | JWT         | Own profile + wallet address                                       |
| `POST`   | `/projects`                     | JWT         | Create project (off-chain metadata + on-chain `registerProject`)   |
| `GET`    | `/projects`                     | JWT         | List own projects                                                  |
| `GET`    | `/projects/:phi`                | JWT or none | Project detail (public if status=`harvesting` or `finished`)       |
| `PATCH`  | `/projects/:phi`                | JWT (owner) | Update metadata                                                    |
| `DELETE` | `/projects/:phi`                | JWT (owner) | Soft delete                                                        |
| `POST`   | `/projects/:phi/activities`     | JWT (owner) | Add cultivation activity                                           |
| `PATCH`  | `/projects/:phi/activities/:id` | JWT (owner) | Edit activity                                                      |
| `DELETE` | `/projects/:phi/activities/:id` | JWT (owner) | Remove activity                                                    |
| `POST`   | `/projects/:phi/certifications` | JWT (owner) | Add certification (with PDF upload)                                |
| `POST`   | `/projects/:phi/images`         | JWT (owner) | Upload product images (multipart)                                  |
| `POST`   | `/projects/:phi/batches`        | JWT (owner) | Generate N QR codes; on-chain `registerBatch`; returns ZIP of PNGs |
| `GET`    | `/scan/public/:phi`             | none        | Project metadata after `projectExists` precheck                    |
| `POST`   | `/scan/private`                 | none        | Body `{phi, sid}`; returns `VerificationOutcome`                   |
| `GET`    | `/health`                       | none        | `{status: 'ok', uptime, blockchain: 'connected'}`                  |
| `GET`    | `/metrics`                      | none        | Prometheus exposition                                              |
| `GET`    | `/api/docs`                     | none        | Swagger UI                                                         |

### Key business logic

**Wallet management** (`blockchain/wallet.service.ts`):

- On producer registration, generate a fresh `ethers.Wallet`, encrypt private key with AES-256-GCM keyed by an env-derived KEK, store ciphertext in MongoDB.
- On `POST /projects/:phi/batches`, decrypt to a in-memory `Wallet`, sign tx, zero the buffer immediately after.
- NEVER log private keys.

**Scan private logic** (`scan/scan.service.ts`):

1. Validate `phi`, `sid` shape (Zod).
2. Compute `h = sha256(sid)` locally (using `@qr-bc/shared`).
3. Pre-check: `verifyProduct(phi, h)` — if `!exists` → return `COUNTERFEIT`; if `redeemed` → return `ALREADY_VERIFIED` with previous txHash from event log query.
4. Else: submit `redeemProduct(phi, sid)` via system hot wallet (NOT producer wallet — paper §5.3).
5. Wait for 1 confirmation (Polygon block ~2s).
6. Return `{status: AUTHENTIC, txHash, eventArgs, verifiedAt}`.

**Batch generation**:

1. Producer requests N (1 ≤ N ≤ 500).
2. Hub generates N CSPRNG `sid_i` (32 bytes each).
3. Compute `h_i = sha256(sid_i)`.
4. Decrypt producer wallet, submit `registerBatch(phi, [h_1..h_n])`, wait 1 conf.
5. Generate N private QR PNGs (URL: `https://ipfs.io/ipfs/{CID}/scan/{phi}/{sid}`).
6. Generate 1 public QR PNG (URL: `https://ipfs.io/ipfs/{CID}/projects/{phi}`).
7. Bundle as ZIP, return as download.
8. NEVER store `sid_i` server-side after ZIP delivered (privacy: producer is responsible for safeguarding the printed QRs).

**IPFS upload** (`uploads/uploads.service.ts`):

- If `IPFS_PROVIDER=pinata` → call Pinata SDK with `PINATA_JWT`.
- If `IPFS_PROVIDER=local` → use `ipfs-http-client` against `IPFS_API_URL` (default `http://localhost:5001`).
- Return `{cid, gatewayUrl: 'https://ipfs.io/ipfs/{cid}'}`.

### Configuration (.env.example)

```
NODE_ENV=development
PORT=3000

NETWORK=amoy            # amoy | mainnet | hardhat
RPC_URL_AMOY=https://rpc-amoy.polygon.technology
RPC_URL_MAINNET=https://polygon-rpc.com
RPC_URL_HARDHAT=http://localhost:8545
CONTRACT_ADDRESS_AMOY=0x...
CONTRACT_ADDRESS_MAINNET=
SYSTEM_WALLET_PRIVATE_KEY=0x...   # hub's hot wallet (testnet only!)

MONGO_URI=mongodb://localhost:27017/qr_bc

JWT_SECRET=replace-me-in-prod-with-32-bytes-random
JWT_EXPIRES_IN=24h
REFRESH_SECRET=replace-me-in-prod
REFRESH_EXPIRES_IN=30d

WALLET_ENCRYPTION_KEK=replace-me-in-prod-with-32-bytes-random

IPFS_PROVIDER=local      # local | pinata
IPFS_API_URL=http://localhost:5001
PINATA_JWT=

LOG_LEVEL=info
```

### Database collections (Mongoose)

- `producers` — `{_id, email, passwordHash, walletAddress, encryptedPrivateKey, createdAt}`
- `projects` — schema per `gathered-requirements.md` §5.1
- `verification_logs` — `{_id, phi, h, outcome, txHash, scannedAt}` (off-chain log; can be cross-checked against on-chain events)
- `audit_logs` — `{_id, actor, action, target, timestamp, ip}` for compliance / debugging

### Indexes

- `producers.email` unique.
- `projects.projectId` unique.
- `projects.ownerProducerId` for list-own queries.
- `verification_logs.phi + scannedAt` compound for analytics.

---

## Edge cases

| #        | Scenario                                                      | Expected behavior                                                                                                        |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| EC-CH-1  | Register email already exists                                 | `409 Conflict` with `{code: 'EMAIL_EXISTS'}`                                                                             |
| EC-CH-2  | Login with wrong password 5x                                  | Account lockout 15 min (rate-limit IP + account)                                                                         |
| EC-CH-3  | JWT expired                                                   | `401`, client refreshes                                                                                                  |
| EC-CH-4  | Producer A tries to PATCH project owned by B                  | `403 Forbidden`                                                                                                          |
| EC-CH-5  | `phi` collision on `POST /projects`                           | Hub generates a new `phi` automatically (random bytes32) and retries up to 3 times; on persistent collision return `500` |
| EC-CH-6  | Batch tx reverted on-chain (e.g., gas spike)                  | Rollback off-chain "batch generated" state; return `503` with retry hint                                                 |
| EC-CH-7  | `redeemProduct` fails after pre-check passes (race condition) | Detect by `tx.wait()` revert; return `{outcome: 'ALREADY_VERIFIED'}` (someone else redeemed it first)                    |
| EC-CH-8  | RPC provider down                                             | Health check returns `{blockchain: 'disconnected'}`; scan endpoints return `503`                                         |
| EC-CH-9  | IPFS pinning fails                                            | Project save proceeds with empty imageUrls; user gets a warning toast                                                    |
| EC-CH-10 | File upload > 10 MB                                           | `413 Payload Too Large`                                                                                                  |
| EC-CH-11 | File upload non-image/non-pdf                                 | `415 Unsupported Media Type`                                                                                             |
| EC-CH-12 | Wallet encryption key rotated                                 | All ciphertexts re-encrypted via migration script (out-of-scope; documented)                                             |
| EC-CH-13 | System hot wallet runs out of MATIC                           | `/health` reports balance; `/scan/private` returns `503` with refill-needed message                                      |

---

## Acceptance criteria

| #        | Criterion                                                                                                                                    | Maps to                       | Verified by                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| AC-CH-1  | Producer can register, login, get JWT                                                                                                        | usability                     | Integration test              |
| AC-CH-2  | JWT-protected routes reject missing/expired tokens with `401`                                                                                | security                      | Integration test              |
| AC-CH-3  | Producer can CRUD own project metadata                                                                                                       | usability                     | Integration test              |
| AC-CH-4  | Producer cannot mutate other producers' projects                                                                                             | SR1 (off-chain)               | Integration test              |
| AC-CH-5  | `POST /projects/:phi/batches` with N=100 completes in ≤ 6 s on Amoy                                                                          | Paper Table 3 row 1           | E2E test against Hardhat node |
| AC-CH-6  | `GET /scan/public/:phi` for unregistered project returns `404` (after `projectExists` returns false)                                         | SR1                           | Integration test              |
| AC-CH-7  | `GET /scan/public/:phi` for registered project returns metadata in ≤ 6 s                                                                     | Paper Table 3 row 2           | E2E test                      |
| AC-CH-8  | `POST /scan/private` with valid (phi, sid) returns `AUTHENTIC` with txHash + event in ≤ 35 s on Amoy                                         | Paper Table 3 row 3, SR2, SR3 | E2E test                      |
| AC-CH-9  | `POST /scan/private` with already-redeemed sid returns `ALREADY_VERIFIED` in ≤ 5 s (no tx)                                                   | Paper Table 3 row 4, SR2      | E2E test                      |
| AC-CH-10 | `POST /scan/private` with unknown sid returns `COUNTERFEIT` in ≤ 5 s (no tx)                                                                 | SR1                           | E2E test                      |
| AC-CH-11 | Hub never returns `AUTHENTIC` for a (phi, h) not actually registered on-chain (mutation test: monkey-patch hub to lie → contract still wins) | SR4                           | Adversarial test              |
| AC-CH-12 | Producer wallet private key never appears in logs (verified by log scraping in CI)                                                           | security                      | CI grep test                  |
| AC-CH-13 | `GET /metrics` exposes Prometheus metrics: request count, latency histogram, blockchain RPC errors                                           | NFR                           | Manual + smoke test           |
| AC-CH-14 | OpenAPI spec auto-generated and pinned via snapshot test                                                                                     | reproducibility               | CI                            |
| AC-CH-15 | `pnpm seed` populates 3 demo HTX rau projects with cultivation activities                                                                    | demo                          | Integration test              |
| AC-CH-16 | Unit + integration test coverage ≥ 70%                                                                                                       | quality                       | CI                            |
| AC-CH-17 | All endpoints documented in Swagger; CI fails if undocumented endpoint added                                                                 | quality                       | CI                            |
| AC-CH-18 | Helmet + rate-limit + CORS configured per environment                                                                                        | security                      | CI smoke                      |
| AC-CH-19 | `gitleaks` scan passes (no secrets)                                                                                                          | security                      | CI                            |
| AC-CH-20 | Hub recovers gracefully if RPC URL temporarily unreachable (retries with exponential backoff)                                                | resilience                    | Chaos test                    |

---

## Non-goals

- No payment / billing (paper §8.3 cost-sharing is documented but not implemented as automated billing).
- No real-time WebSocket updates (REST polling is enough for paper).
- No internationalization of error messages (English only in API; UI does i18n).
- No GraphQL.
- No microservice split (single NestJS service).
