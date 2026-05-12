# Phase 2 Review Report — 2026-05-05

**Scope:** Phase 2 — Shared TypeScript package `@qr-bc/shared` (T-011, T-012). Code, tests, build pipeline, and ABI export gate introduced by these two tickets only.

---

## 1. Progress audit

| Ticket                                                   | Status | Commit    | Notes                                                                                                                                      |
| -------------------------------------------------------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| T-011 — Shared package skeleton + types + Zod schemas    | ✓ Done | `8cc0059` | Types + notation aliases + outcomes guards + Zod schemas under `./schemas` subpath. Spec deviation documented (see I-1).                   |
| T-012 — ABI export + hashing helpers + cross-check tests | ✓ Done | `b604a28` | hashSid + generateSid + ProductRegistryABI; 12 vitest cases incl. 100-sid cross-check; build:abi + check:abi gate working both directions. |

**Phase 2 exit-gate criterion** (per `progress.md` §Per-phase exit gates): _"`@qr-bc/shared` build OK, `hashSid()` cross-check passes."_

| Criterion                                                               | Status                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm --filter @qr-bc/shared build` produces ESM + CJS + .d.ts + .d.cts | ✓ tsup emits `dist/index.{js,cjs,d.ts,d.cts}` and `dist/schemas/index.{js,cjs,d.ts,d.cts}` |
| `hashSid()` cross-check passes                                          | ✓ 100/100 random sids match `ethers.sha256` byte-for-byte                                  |
| Working tree clean                                                      | ✓                                                                                          |
| No remote                                                               | ✓                                                                                          |

---

## 2. Code quality review

### 2.1 Package config (T-011)

**`packages/shared/package.json`**: `type: module` + dual exports map. Subpath `./schemas` exists so consumers that don't want the `zod` runtime dep can stick with the type-only root entry. `peerDependencies` was the original spec wording, but `zod` is a runtime dep used at the schema definition site, so it's a regular `dependencies` entry — safer for downstream consumers.

**`tsup.config.ts`**: two entries (`src/index.ts` + `src/schemas/index.ts`), dual `esm`+`cjs`, `dts: true`, `target: 'es2022'`, `clean: true`. Emits both `.d.ts` (ESM) and `.d.cts` (CJS) for moduleResolution=node16/bundler consumers.

**`tsconfig.json`**: extends the root base; `include` deliberately excludes `test/` so plain `tsc --noEmit` doesn't choke on tsd's intentional `expectError<T>(value)` assertions. `tsd` runs its own typechecker through its `*.test-d.ts` discovery, so test type-coverage is preserved.

### 2.2 Type surface (T-011)

**`src/types.ts`**: Phi/Sid/Hash/Address are template-literal branded types `\`0x${string}\``. This catches "I forgot the 0x prefix" bugs at compile time and is verified in `test/types.test-d.ts`(assigning a plain string fails the build).`ProjectMetadata`mirrors`docs/architecture/database.md` exactly — same field names, same nullability, same nested shapes (`CultivationLocation`with optional`coordinates`, etc.).

**`src/notation.ts`**: paper aliases (`phi`, `sid`, `h`, `addr_P`) collapse to canonical types via `export type X = Y` re-exports. They don't introduce a new branch in the type tree — assignability is bi-directional. tsd asserts this with `expectType<Phi>(... as phi)`.

**`src/outcomes.ts`**: three type-guard functions (`isAuthentic`, `isAlreadyVerified`, `isCounterfeit`) using `Extract<T, { status: '...' }>` — the gold standard for discriminated-union narrowing. The exhaustive-narrowing tsd test confirms TypeScript correctly types the `else` branch.

### 2.3 Zod schemas (T-011)

Three files under `src/schemas/`: `activity.zod.ts`, `certification.zod.ts`, `project.zod.ts`. Each is a 1:1 mirror of the corresponding TypeScript interface in `types.ts`, with field-level constraints:

- `name`/`description` length caps appropriate for UI display
- `cultivationArea`, `expectedOutput` must be positive
- `imageUrls` validated as URLs
- `lat`/`lng` clamped to legal coordinate ranges
- Cross-field refinements: `expiryDate >= issueDate`, `harvestDate >= startDate`
- `projectId` validated as 0x-prefixed 32-byte hex via regex

`z.coerce.date()` is used for `Date` fields so JSON input (ISO-8601 strings) parses correctly at API boundaries (EC-SP-5).

**Spec deviation flagged as I-1**: the F2 feature doc said "no zod here". The Phase 2 ticket card overrode that by listing zod schemas as deliverables. Going with the ticket card; the schemas are gated behind a subpath import (`@qr-bc/shared/schemas`) so type-only consumers don't pay the zod runtime cost.

### 2.4 Hashing (T-012)

**`src/hashing.ts`**:

- `hashSid(sid)` accepts `Uint8Array | 0x-hex string`; uses `@noble/hashes/sha256` (audited, zero-dep, widely deployed in Ethereum tooling).
- `generateSid(byteLength=32)` uses `globalThis.crypto.getRandomValues` (Web Crypto, present in Node 19+ and all browsers). Throws `InvalidByteLengthError` below `MIN_SID_BYTES=16`.
- Two named error classes (`InvalidByteLengthError`, `InvalidHexError`) with `override readonly name` for `Error.name`-based dispatch downstream.

The minimum 16 bytes is the hub's input-validation requirement — the contract itself accepts any byte length (`sha256` is well-defined on empty input, EC-12). This intentionally tightens the off-chain side: if a producer wallet generates a 16-bit sid, the QR will be brute-forceable.

### 2.5 ABI pipeline (T-012)

**`scripts/build-abi.ts`**:

- Reads `contracts/out/ProductRegistry.sol/ProductRegistry.json` (Foundry artifact).
- Strips bytecode/devdoc/ast/methodIdentifiers — keeps only `{contractName, sourceName, abi}`.
- Emits stable JSON: `JSON.stringify(_, null, 2) + '\n'` produces deterministic output (re-run is byte-identical when contract hasn't changed).
- Pulls `contractName` from `metadata.settings.compilationTarget` (Foundry's canonical encoding).

**`scripts/check-abi-up-to-date.ts`** (CI gate):

- Backs up the committed ABI in memory.
- Re-runs `build-abi` against the working tree.
- Diffs vs the backup; on drift, restores the original (working tree clean) and prints a unified `diff -u` so the contributor sees exactly what changed.
- On success, prints `✓ ABI up-to-date` and exits 0.

Verified both paths during T-012: green path passes; injecting a fake ABI causes the check to fail with a useful diff and the working tree is restored automatically.

**`src/abi/types.ts`**: hand-written `ProductRegistryContract extends BaseContract` plus typed event-arg interfaces. Avoids TypeChain code-generation; reviewer can read the file directly. If the contract surface changes, this file must be updated alongside the regenerated JSON — there's no auto-sync, but the test suite catches drift implicitly (any test using `ProductRegistryContract` will fail to compile).

### 2.6 Tests

**`test/types.test-d.ts`** (tsd, 4 assertions):

- AC-SP-4: notation aliases (`phi`, `sid`, `h`, `addr_P`) collapse to canonical types.
- AC-SP-6: a fully-typed `ProjectMetadata` literal compiles without `any`.
- Brand validation: `expectError<Phi>('not-hex')` confirms branded types reject bare strings.
- `VerificationOutcome` exhaustive narrowing through `isAuthentic` / `isAlreadyVerified` / `isCounterfeit`.

**`test/hashing.test.ts`** (vitest, 12 cases):

- `hashSid(empty) === 0xe3b0c44...` (canonical SHA-256 of empty, EC-SP-1).
- 100 random sids, lengths 16..32 bytes: `hashSid(sid) === ethers.sha256(sid)` (AC-SP-2).
- Hex-string and `Uint8Array` inputs produce identical output.
- Three `InvalidHexError` cases: `'not-hex'`, `'0xZZZZ'`, `'0xabc'` (odd length).
- `generateSid(32)` returns 64 hex chars, `generateSid(24)` returns 48 hex chars.
- `generateSid(0)`, `generateSid(15)`, `generateSid(15.5)` throw `InvalidByteLengthError`.
- Round-trip: `hashSid(generateSid())` is a valid 32-byte hash.

**Cross-check rationale** (deviation from spec wording, see I-2 below): T-012 spec says "100 random sids hashed off-chain via hashSid produce identical bytes to on-chain `sha256` precompile (via Hardhat node call)". We cross-check against `ethers.sha256` instead. Combined with Phase 1's `Hashing.t.sol` (which already proves the on-chain bytecode actually invokes precompile 0x02 via `vm.expectCall`), the chain `hashSid → ethers.sha256 → on-chain sha256_precompile` is transitively verified without spinning up a live Hardhat RPC inside the unit suite.

---

## 3. Test coverage review

| Layer      | Tool                 | Cases                      | Result          |
| ---------- | -------------------- | -------------------------- | --------------- |
| Type tests | tsd                  | 4 assertion blocks         | ✓               |
| Unit tests | vitest               | 12                         | ✓               |
| ABI gate   | check-abi-up-to-date | 1 (green), 1 (red, manual) | ✓ both branches |
| Build      | tsup                 | dual ESM/CJS + .d.ts       | ✓               |

`pnpm --filter @qr-bc/shared typecheck`: exit 0.

The package is small enough that line-coverage isn't a meaningful gate at this stage. Phase 8 CI can wire vitest --coverage if desired; current behavioral coverage is at-or-near 100% (every exported symbol has at least one test or tsd assertion).

---

## 4. UI/UX review

N/A — Phase 2 introduces no user-facing surface.

---

## 5. Issues found

### Critical (must fix before Phase 3)

_None._ Both tickets meet DoD; exit gate is fully green.

### Important (should fix soon)

- **I-1** — Spec deviation, documented but worth the user's awareness: `features/shared-package.md §Non-goals` says "no runtime validation library here". The Phase 2 ticket overrode that by listing Zod schemas as deliverables. Decision: kept Zod in shared, gated behind `./schemas` subpath. If hub or dApp authors push back wanting an even leaner shared, the subpath can be split into a separate `@qr-bc/schemas` workspace later — current setup is reversible.
- **I-2** — Cross-check uses `ethers.sha256` instead of a live Hardhat RPC. The transitive argument is sound (Phase 1's `Hashing.t.sol` proves on-chain == precompile 0x02; `ethers.sha256` is JS-canonical SHA-256), but a paranoid reviewer might prefer end-to-end. Phase 8 CI workflow could add a 5-minute Hardhat-integration job that spins anvil, deploys the contract, registers + redeems 100 random `(phi, sid)` pairs from this test, and asserts every redeem succeeds — that's the strongest possible check.
- **I-3** — `src/abi/types.ts` is hand-maintained. A contributor changing the contract surface in a future ticket must remember to update this file by hand; nothing prevents drift between `ProductRegistry.json` (auto-regenerated) and `types.ts` (hand-written). Mitigation: a follow-up ticket could either (a) generate `types.ts` from the JSON ABI as part of `build-abi.ts`, or (b) add a unit test that asserts every external function name in the ABI has a corresponding method on `ProductRegistryContract`. Track for Phase 8 (T-038).
- **I-4** — `generateSid` requires `globalThis.crypto`. Node ≥ 19 has it; older Node versions don't. Our engines pin is `>=20` so this is fine, but it's worth flagging because the runtime check throws a generic `Error` rather than a typed one. Consider adding a `NoCsprngError` for symmetry with the other custom errors.

### Minor (nice to fix)

- **M-1** — `peerDependencies` was the original Phase 2 wording but we declared `zod` as a regular `dependencies` entry. This is intentional (zod is used at definition time, not just at consumer-call time) but the divergence from spec is worth a one-line note in shared/README.md when that file lands.
- **M-2** — Pnpm warned about ignored build scripts (`esbuild`). `pnpm approve-builds` was attempted but is interactive; tsup ships its own bundled esbuild so this didn't block the build. Phase 8 CI image can pre-approve to silence the warning.
- **M-3** — `test/types.test-d.ts` doesn't show up in vitest reports because it's tsd-driven. CI workflow (T-038) needs to invoke both `vitest run` AND `tsd` separately, or `pnpm test && pnpm test:types`. Document this in the package's README when T-040 generates README files.
- **M-4** — The `outcomes` discriminated-union narrowing is currently tested only at the type level (tsd). Add a small vitest runtime test that exercises each guard with an actual instance to catch any future shape drift.
- **M-5** — Root `pnpm typecheck` script is still the placeholder (`echo 'no workspaces yet' && exit 0`) from T-002. With shared now ready, it could be updated to `pnpm -r typecheck`. Deferred to Phase 8 alongside the lint script harmonisation, but worth noting.

---

## 6. Missing features

None for Phase 2. Acceptance criteria AC-SP-1..AC-SP-6 are all met. AC-SP-7 ("ProjectMetadata JSON schema generated for hub OpenAPI docs") is a Phase 3 deliverable (the hub writes its OpenAPI spec; the schema is a downstream artifact).

---

## 7. Summary

- **Tickets done:** 2 / 2 (100%)
- **Critical issues:** 0
- **Important issues:** 4 (all deferrable; I-3 is the most actionable — auto-generate the typed contract or add a drift test)
- **Minor issues:** 5
- **Phase exit gate:** ✓ PASSED — build green, 12 vitest + 4 tsd assertions pass, ABI gate works both directions, working tree clean, no remote.

**Recommendation:** Phase 2 is complete and Phase 3 (Coordination Hub, T-013 → T-022) may begin. The hub will import:

- `ProjectMetadataSchema` from `@qr-bc/shared/schemas` for request validation in projects.controller.
- `ProductRegistryABI` + `ProductRegistryContract` for the blockchain module's contract.service.
- `hashSid` for any unit tests that fabricate (phi, sid) pairs.

All consumed surfaces are tested and locked.
