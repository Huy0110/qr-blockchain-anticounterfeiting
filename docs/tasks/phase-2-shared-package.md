# Phase 2 — Shared TypeScript Package `@qr-bc/shared`

**Goal:** A consumable `@qr-bc/shared` package with types, ABI export, hashing helpers, and runtime Zod schemas. Used by hub + frontends + experiments.
**Effort:** ~0.5 day total (2 tickets).
**Prerequisites:** Phase 1 (needs ABI to export).

---

### T-011 — Shared package skeleton + types + Zod schemas

**Phase:** 2 · **Feature:** F2 · **Effort:** M

**Description.** Create the package, define TypeScript types matching paper notation, and emit Zod schemas usable by hub + frontends.

**Files to create/modify:**

- `packages/shared/package.json` — name `@qr-bc/shared`, type module, peer dep `zod`
- `packages/shared/tsconfig.json` — extends base
- `packages/shared/tsup.config.ts` — dual ESM + CJS + d.ts emission
- `packages/shared/src/index.ts` — public surface
- `packages/shared/src/types.ts` — `Phi`, `Sid`, `Hash`, `Address`, `ProjectMetadata`, `CultivationActivity`, `Certification`, `VerificationOutcome` union, `ProductRedeemedEvent`
- `packages/shared/src/notation.ts` — paper symbol aliases (`φ`, `sid`, `h`, `addr_P`)
- `packages/shared/src/outcomes.ts` — `VerificationOutcome` discriminated union per [api-design.md](../architecture/api-design.md#components)
- `packages/shared/src/schemas/project.zod.ts` — Zod schema for `ProjectMetadata` matching [database.md](../architecture/database.md)
- `packages/shared/src/schemas/activity.zod.ts`
- `packages/shared/src/schemas/certification.zod.ts`
- `packages/shared/src/schemas/index.ts` — re-export
- `packages/shared/test/types.test-d.ts` — tsd type tests

**Acceptance criteria refs:** AC-SP-4, AC-SP-6
**ADRs:** —
**Depends on:** T-002 (workspace).
**Definition of Done:**

- [ ] `pnpm --filter @qr-bc/shared build` produces ESM + CJS + .d.ts files.
- [ ] All notation aliases (`φ`, `sid`, `h`, `addr_P`) resolve to canonical types.
- [ ] Zod schemas mirror Mongoose schema field-for-field (manual review checklist).
- [ ] Public API has zero `any`.
- [ ] `tsd` type tests pass.

---

### T-012 — ABI export + hashing helpers + cross-check tests

**Phase:** 2 · **Feature:** F2 · **Effort:** S

**Description.** Auto-export the contract ABI from Foundry build output. Implement `hashSid()` and `generateSid()`. Cross-check `hashSid()` matches Solidity `sha256()` output.

**Files to create/modify:**

- `packages/shared/src/hashing.ts` — `hashSid(sid)`, `generateSid(byteLength=32)`
- `packages/shared/src/abi/ProductRegistry.json` — committed ABI (auto-generated)
- `packages/shared/src/abi/types.ts` — TypeChain-style typed contract interface
- `packages/shared/scripts/build-abi.ts` — reads `contracts/out/ProductRegistry.sol/ProductRegistry.json`, strips bytecode, writes to `src/abi/`
- `packages/shared/test/hashing.test.ts` — Vitest. Generates 100 random sids, compares `hashSid(sid)` against on-chain `sha256(sid)` (via Hardhat node call)
- `packages/shared/scripts/check-abi-up-to-date.ts` — CI gate: re-runs build-abi, fails if diff vs committed

**Acceptance criteria refs:** AC-SP-1, AC-SP-2, AC-SP-3, AC-SP-5, AC-SP-7
**ADRs:** ADR-007 (SHA-256 cross-check)
**SR/R mapping:** SR1, SR4 (hash consistency between off-chain and on-chain is critical)
**Depends on:** T-007 (contract has `redeemProduct` callable for cross-check), T-011.
**Definition of Done:**

- [ ] `pnpm --filter @qr-bc/shared build:abi` regenerates `src/abi/ProductRegistry.json` deterministically.
- [ ] `hashSid('')` returns the canonical SHA-256 of empty: `0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- [ ] Cross-check test: 100 random sids hashed off-chain via `hashSid` produce identical bytes to on-chain `sha256` precompile.
- [ ] `generateSid(0)` throws `InvalidByteLengthError`.
- [ ] CI gate `check-abi-up-to-date` passes (or fails explicitly with a useful diff if ABI drifts).
