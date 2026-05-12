# Architecture Decision Log

ADRs (Architecture Decision Records) capturing notable technical choices and their rationale. Each ADR is **accepted** unless marked otherwise.

---

## ADR-001 — Use Hardhat **and** Foundry side-by-side

**Status:** Accepted (2026-05-05).
**Context:** The smart contract needs deploy scripts, JS-side integration tests, gas snapshots, fuzz tests, property-based tests, and Slither integration. No single tool covers all of these well.
**Options considered:**

1. Hardhat only — covers deploy + JS, but fuzz/invariant testing is weak.
2. Foundry only — fast tests + fuzz, but JS integration with hub requires manual ABI plumbing and ethers.js setup.
3. Both, with clear ownership boundaries.

**Decision:** Both, with this division:

| Concern                            | Owner                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Deploy scripts (multi-network)     | Foundry `script/Deploy.s.sol` (primary); Hardhat `deploy/01_deploy.ts` (alt) |
| JS-side E2E (integration with hub) | Hardhat (`test/hardhat/*.spec.ts`)                                           |
| Solidity unit tests                | Foundry (`test/unit/*.t.sol`)                                                |
| Property + invariant tests         | Foundry (`test/properties/*.t.sol`, `test/invariants/*.t.sol`)               |
| Gas snapshots                      | Foundry (`forge snapshot`)                                                   |
| Slither integration                | CI step against the source files (independent of test framework)             |

**Consequences:**

- Two `package.json` scripts (`test:forge` + `test:hardhat`) but each is fast.
- Reviewers familiar with either ecosystem can verify.
- Build pipeline produces ABI consumed by both.

**Alternatives rejected:**

- Foundry-only: forces JS code to manually parse ABIs; adds friction for hub developers.
- Hardhat-only: weak fuzz testing; can't reproduce paper §3 defensive bar without it.

---

## ADR-002 — Use **NestJS** for the Coordination Hub (over Express)

**Status:** Accepted (2026-05-05).
**Context:** Hub has ~20 endpoints, JWT auth, multi-module structure (auth/projects/scan/blockchain/uploads), and needs OpenAPI auto-generation for reviewer-friendly docs.
**Options considered:**

1. Express + custom middleware + manual OpenAPI maintenance.
2. Fastify (faster but smaller ecosystem).
3. NestJS (opinionated, DI, decorators).

**Decision:** NestJS 10.

**Rationale:**

- Module DI maps cleanly to paper §7.2 (Coordination Hub modules: Portal Gateway, Purchase Tx Executor, Blockchain Data Gateway).
- `@nestjs/swagger` auto-generates OpenAPI from controller decorators — zero drift between code and `/api/docs`.
- First-class testing utilities (`@nestjs/testing`).
- Strong TS integration; `class-validator` + `class-transformer` lower DTO boilerplate.

**Consequences:**

- Heavier dependency than Express.
- Steeper learning curve for contributors.
- Acceptable: paper-grade rigor pays off in reviewer experience.

---

## ADR-003 — Next.js App Router with `output: 'export'` for **dApp only**

**Status:** Accepted (2026-05-05).
**Context:** Two frontends with different deploy targets. Consumer dApp goes on IPFS (must be fully static). Management portal needs runtime auth and has authenticated APIs.

**Decision:**

| App                                          | Mode                                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Consumer dApp (`apps/dapp-portal`)           | `output: 'export'` (full static; pinned to IPFS)                  |
| Management Portal (`apps/management-portal`) | Standard Next.js (mix of SSR + SSG; deployable to Vercel or Node) |

**Rationale:**

- IPFS gateway can only serve static files — dynamic routes must be pre-built.
- Mgmt portal benefits from SSR for fast TTFB on dashboard with authenticated data.

**Consequences:**

- dApp uses locale folder routing (next-intl middleware would break static export).
- dApp must inline all API calls (no Next.js route handlers).
- Mgmt portal can use Next.js server actions and middleware freely.
- Code duplication between the two apps is acceptable; shared package handles cross-cutting concerns.

**Trade-offs:**

- dApp can't do dynamic routing without client-side fetch — fine for our routes (`/projects/[projectId]`, `/scan/[projectId]/[secretId]`).

---

## ADR-004 — Producer wallets **server-managed** (encrypted at rest)

**Status:** Accepted (2026-05-05).
**Context:** Producers (HTX rau) are typically not crypto-savvy. Self-managed wallets via MetaMask add cognitive load and seed-phrase risk.

**Decision:** Hub generates a fresh Polygon wallet on producer registration. Private key encrypted with AES-256-GCM keyed by `WALLET_ENCRYPTION_KEK`. Decrypted in-memory for tx signing, then zeroized.

**Rationale:**

- Lower friction → higher adoption (paper §3 requirement R1 + R3).
- Keys never leave the hub server; no MetaMask popup; no seed phrases written down.

**Consequences:**

- Single point of failure: KEK leakage → all producer keys compromised.
- KEK rotation requires re-encrypting all `encryptedPrivateKey` documents (operational complexity, deferred to v2).
- For mainnet production: recommend AWS KMS / HSM (documented in `MAINNET_DEPLOY.md`).

**Alternatives rejected:**

- BYO-wallet (MetaMask in management portal): higher friction; out of scope per gathered-req.
- Smart contract wallets (account abstraction ERC-4337): adds infra; v2 candidate.

**Mitigation for v1:**

- KEK is required env var; missing → process exits 1.
- KEK ≥ 32 bytes random (validated at startup).
- Keys never logged (CI grep test).
- Producers can rotate their own wallet (via support flow in v2).

---

## ADR-005 — IPFS dual-provider (local Kubo **and** Pinata)

**Status:** Accepted (2026-05-05).
**Context:** Reproducer may not have a Pinata account. Author wants to test both paths. Production wants Pinata (paper §8).

**Decision:** Adapter pattern. `IPFS_PROVIDER` env var selects between:

- `local` → `KuboAdapter` calling `IPFS_API_URL` (default `http://ipfs:5001` in Docker compose).
- `pinata` → `PinataAdapter` using `PINATA_JWT`.

Both expose the same interface:

```typescript
interface IpfsAdapter {
  pinFile(
    buffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<{ cid: string; gatewayUrl: string }>;
  pinJson(json: unknown): Promise<{ cid: string; gatewayUrl: string }>;
  unpin(cid: string): Promise<void>; // optional; provider-dependent
}
```

**Consequences:**

- Reviewer with no Pinata account uses local provider via Docker.
- Production uses Pinata for SLA + global CDN.
- Tests use a `MockIpfsAdapter` (in-memory).

---

## ADR-006 — Direct RPC, **no The Graph** in v1

**Status:** Accepted (2026-05-05).
**Context:** Hub queries past `ProductRedeemed` events for `ALREADY_VERIFIED` previousTxHash lookup. Two options: direct RPC log filter vs subgraph indexing.

**Decision:** Direct RPC `contract.queryFilter(filters.ProductRedeemed(phi, h))`.

**Rationale:**

- Paper-scale data: ~100k products / year per producer (paper §8.3) ⇒ ~100k events. Direct RPC is fine.
- The Graph adds infra overhead, schema definition, deployment, and a separate service.
- Polygonscan also indexes events, available as fallback.

**Consequences:**

- Slow on RPC providers without full archival history (some free RPCs limit history).
- Document workaround: use Alchemy or QuickNode if dRPC limits hit.
- Migrate to The Graph in v2 if event volume crosses ~100k/month.

---

## ADR-007 — Use **SHA-256** (not `keccak256`) for `h_i = H(sid_i)`

**Status:** Accepted (2026-05-05).
**Context:** Paper §7.1 specifies SHA-256. EVM's native hash is `keccak256` (cheaper gas: ~30 vs ~90 for sha256 precompile call).

**Decision:** Match paper exactly. Use Solidity's `sha256()` precompile inside `redeemProduct`. Document the deviation from EVM default in NatSpec:

```solidity
/// @dev Uses SHA-256 (NOT keccak256). Required to match paper §7.1.
///      Cross-language consistency: the dApp computes sid → sha256(sid) → h
///      using @noble/hashes/sha256, which must produce identical bytes.
function redeemProduct(bytes32 phi, bytes calldata sid) external {
  bytes32 h = sha256(sid);
  // ...
}
```

**Rationale:**

- Reviewer 1 will likely diff code against paper; deviation = critique.
- Gas overhead (~60 per call) is acceptable at paper-scale costs (~$0.001/tx).
- Cryptographic strength of SHA-256 is equivalent to keccak256 for this use.

**Consequences:**

- Slightly higher gas cost.
- Cross-language consistency confirmed by `packages/shared/test/hashing.test.ts` (cross-checks `@noble/hashes/sha256` vs Solidity `sha256()` for fuzz inputs).

---

## ADR-008 — **Immutable** smart contract (no proxy pattern)

**Status:** Accepted (2026-05-05).
**Context:** Two main upgrade patterns: UUPS proxy and Transparent proxy. Both add complexity (delegatecall semantics, storage layout fragility, owner key management).

**Decision:** Deploy `ProductRegistry` as immutable contract. No proxy.

**Rationale:**

- Paper §7.1 makes no upgradeability claim.
- Smaller attack surface (Slither rule "uups-vulnerabilities" never applies).
- Simpler semantics for reviewers to audit.
- If a critical bug is discovered: redeploy as `ProductRegistryV2`, document migration in `MAINNET_DEPLOY.md` rollback section, and have hub support both addresses temporarily.

**Consequences:**

- Cannot patch in-place if bug found post-deploy.
- v2 may revisit (e.g., add Pausable from OpenZeppelin if a CVE arises).

**Mitigations:**

- ≥ 90% line coverage + Slither + 4 SR property tests reduce bug risk.
- Migration playbook documented in `MAINNET_DEPLOY.md`.

---

## ADR-009 — Default UI locale = **Vietnamese** (vi); secondary English (en)

**Status:** Accepted (2026-05-05).
**Context:** Target market is Vietnamese vegetable cooperatives. Paper is English; reviewers are international.

**Decision:**

- Both portals default to `vi`; user can switch to `en` via toggle.
- All docs (README, ARCHITECTURE, etc.) are English (academic audience).
- All code, comments, commit messages, and API responses are English.

**Rationale:**

- End users are Vietnamese cooperatives.
- International reviewers can switch to English.
- Mixed-language docs/code would be confusing.

**Consequences:**

- Translation key parity must be enforced in CI (script fails if `vi.json` and `en.json` diverge).

---

## ADR-010 — **pnpm workspaces** for monorepo (over npm/yarn/Lerna)

**Status:** Accepted (2026-05-05).
**Context:** Multiple workspaces (`contracts`, `packages/shared`, `apps/*`, `experiments`) need shared deps.

**Decision:** pnpm 9 workspaces.

**Rationale:**

- Disk-efficient (content-addressable store).
- Strict by default (no phantom deps).
- Workspace protocol (`workspace:*`) avoids version drift.
- Active maintenance.

**Alternatives rejected:**

- npm workspaces: slower, looser strictness.
- yarn workspaces: more setup, fading ecosystem.
- Lerna: redundant on top of pnpm.

**Consequences:**

- Contributors must install pnpm.
- `engines.pnpm` and `preinstall` script with `only-allow pnpm` enforce this.

---

## ADR-011 — **Vitest** for all TS tests (over Jest)

**Status:** Accepted (2026-05-05).
**Context:** Need a TS-native test runner across hub, frontends, shared, experiments.

**Decision:** Vitest.

**Rationale:**

- 5–10× faster than Jest (esbuild-based).
- ESM-native.
- Drop-in API similar to Jest.
- Active development, strong watch mode.

**Consequences:**

- NestJS official examples often use Jest; we adapt with `nestjs-vitest` or use `vitest` directly.
- Coverage via `@vitest/coverage-v8` (native, no Istanbul setup).

---

## ADR-012 — **Conventional Commits** + commitlint + husky

**Status:** Accepted (2026-05-05).
**Context:** Need clean changelog generation + reviewer-readable commit history.

**Decision:** Conventional Commits enforced via `commitlint` + `husky` `commit-msg` hook + CI workflow.

**Format:**

```
type(scope): subject
```

Allowed types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `style`, `perf`, `ci`, `build`, `revert`.
Scopes: `contracts`, `hub`, `dapp`, `mp`, `shared`, `exp`, `docs`, `ci`, `release`.

**Consequences:**

- Slight friction during commits (offset by `cz-cli` interactive helper).
- Auto-changelog generation enabled.

---

## ADR-013 — **Soft-delete** for projects (no hard delete)

**Status:** Accepted (2026-05-05).
**Context:** Producer may want to delete a project. On-chain state can never be deleted. Off-chain MongoDB row could be hard-deleted.

**Decision:** Soft delete via `isDeleted: true` + `deletedAt` timestamp. Hard delete deferred (manual ops procedure for GDPR).

**Rationale:**

- On-chain `projectExists(phi)` will always return true after `registerProject`. Hub presents off-chain "deleted" projects as 404 to consumers but retains data for audit.
- Deleted projects don't appear in producer dashboard.
- Allows undelete in v2.

**Consequences:**

- Mongo index includes `isDeleted: 1` for filtering.
- Public `/scan/public/{phi}` returns 404 for soft-deleted projects (even if `projectExists` returns true on-chain) — this is an explicit choice prioritizing producer agency over on-chain truth for consumer-facing display.

---

## ADR-014 — **System hot wallet** (not producer wallet) signs `redeemProduct`

**Status:** Accepted (2026-05-05).
**Context:** Per paper §5.3, consumers don't have wallets. Some entity has to pay gas for `redeemProduct`. Two options:

1. Producer's wallet pays for verifications of their own products.
2. A system-wide hot wallet operated by the hub pays for all verifications.

**Decision:** Option 2 — system hot wallet, scoped to testnet only in v1.

**Rationale:**

- Paper §8.3 cost-sharing model: system operator covers verification costs (~$100/year per 100k products).
- Producers don't want surprise gas charges.
- One wallet = simpler observability and topup workflow.

**Consequences:**

- The system wallet's only privilege is paying gas; it cannot fabricate `AUTHENTIC` because the contract recomputes `sha256(sid)` (SR4 holds).
- For production: AWS KMS or threshold signing (documented in `MAINNET_DEPLOY.md`); not in v1.
- `/health` reports system wallet balance; alerts if low.

---

## ADR-015 — **No GraphQL**, REST + OpenAPI

**Status:** Accepted (2026-05-05).
**Context:** Frontend has 3 distinct views (consumer dApp, mgmt portal). GraphQL would let each pick its fields; REST gives standard interfaces.

**Decision:** REST.

**Rationale:**

- Schema is small (~20 endpoints).
- OpenAPI auto-generated from NestJS decorators is reviewer-friendly.
- GraphQL adds resolver complexity, N+1 risk mitigations, etc.
- Frontends are different concerns; data envelopes are not heavy.

**Consequences:**

- If v2 needs flexible data fetching, can layer GraphQL on top without breaking existing REST.

---

## ADR-016 — **Mongoose** over Prisma for MongoDB ODM

**Status:** Accepted (2026-05-05).
**Context:** Two main options for MongoDB in TypeScript: Mongoose (mature, native) and Prisma (newer, type-first).

**Decision:** Mongoose.

**Rationale:**

- Mongoose has first-class support for nested subdocuments (cultivation activities, certifications) — Prisma's nested embedded types are weaker.
- Mature tooling: discriminators, virtuals, hooks.
- Reference Agritech-treexuat schema (gathered-req §C1) is Mongoose, easier to align.

**Consequences:**

- Type safety via Mongoose typed schemas (TS 5.x improvements).
- Prisma considered for v2 if relational migrations become necessary.

---

## ADR-017 — Default network is **Polygon Amoy testnet**, mainnet gated

**Status:** Accepted (2026-05-05).
**Context:** Need a default network that doesn't cost the author money but lets reviewers reproduce.

**Decision:** Default `NETWORK=amoy`. Mainnet support via `NETWORK=mainnet` + explicit `MAINNET_DEPLOY.md` procedure.

**Rationale:**

- Free MATIC from Polygon faucet.
- Reviewer-friendly.
- Author has no MATIC at v1 release time.
- Code paths exist for mainnet so future operator can adopt.

**Consequences:**

- Performance numbers in paper Table 3 (Polygon mainnet) may differ from Amoy reproductions; documented in `REPRODUCIBILITY.md`.

---

## Future ADRs (not made yet)

- ADR-?? Account abstraction (ERC-4337) instead of system wallet.
- ADR-?? Subgraph indexer for production scale.
- ADR-?? Multi-chain (Arbitrum, Base) support.
- ADR-?? Server-side rendering (SSR) for the dApp via IPFS-friendly static framework (e.g., Astro).
- ADR-?? Payment integration for producer subscriptions ($500/year per paper §8.3).

These will be opened when needed.
