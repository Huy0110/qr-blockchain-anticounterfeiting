# Phase 0 Review Report — 2026-05-05

**Scope:** Phase 0 — Bootstrap (T-001 → T-004) only. Code, tooling, hooks, and meta-files introduced by these four tickets.

---

## 1. Progress audit

| Ticket                                                        | Status | Commit               | Notes                                                                                     |
| ------------------------------------------------------------- | ------ | -------------------- | ----------------------------------------------------------------------------------------- |
| T-001 — Initialize local git + skeleton files                 | ✓ Done | `9135232`, `c9dc4c2` | Skeleton files committed. `docs/` planning artifacts imported as separate commit.         |
| T-002 — pnpm workspace + TypeScript base + lint/format/commit | ✓ Done | `91f38a8`            | All DoD checks satisfied. One spec deviation documented (see I-1).                        |
| T-003 — Foundry + Hardhat init in `contracts/`                | ✓ Done | `5747a9f`            | Foundry installed mid-phase (`forge 1.6.0-v1.7.0`). Two deviations documented (P-1, I-3). |
| T-004 — Bootstrap meta-files + Makefile                       | ✓ Done | `8fd2b0e`            | All make targets verified.                                                                |

Phase 0 exit-gate criterion (per `progress.md` §Per-phase exit gates): _"Repo on GitHub, CI placeholder green, husky hooks block bad commits."_

| Criterion                         | Status                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repo on GitHub                    | **Deferred to T-047** (Phase 12) per repo policy. `git remote -v` empty.                                                                         |
| CI placeholder workflow committed | ✓ (`.github/workflows/ci-placeholder.yml`) — will run only after first push.                                                                     |
| Husky hooks block bad commits     | ✓ commit-msg rejects non-Conventional ('bad message no convention' → exit 1). pre-commit/gitleaks rejects fake GitHub PAT (verified end-to-end). |

---

## 2. Code quality review

### 2.1 Repo skeleton (T-001)

`.gitignore` mirrors `docs/architecture/folder-structure.md §Gitignored paths` exactly. `.editorconfig` enforces UTF-8/LF, 2-space TS, 4-space Solidity, tab Makefile. `.nvmrc=20` matches the spec. `LICENSE` is full MIT text with placeholder copyright; `T-045` (Phase 10) will finalize attribution.

No issues.

### 2.2 Workspace tooling (T-002)

`package.json`:

- `engines.node: ">=20"`, `pnpm: ">=9"` — **relaxed from spec** (which pinned `^20` and `^9`). Documented in commit body. Rationale: dev env runs Node 25 / pnpm 10. CI in T-038 should pin to a single supported version (Node 20 LTS) to keep reproducibility runs deterministic. See **I-2**.
- `preinstall: "npx only-allow pnpm"` ✓ enforces package manager.
- `prepare: "husky"` ✓ activates v9 hooks layout.
- `lint` uses `--no-error-on-unmatched-pattern` so the empty workspace passes; this remains correct once `apps/` and `packages/` get TS files.

`tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `verbatimModuleSyntax: false`, `moduleResolution: "bundler"`, ES2022. Conforms to spec. The combination is appropriately strict for backend (`coordination-hub`) and shared package code, and `bundler` resolution is correct for Next.js.

`.eslintrc.json` extends `eslint:recommended` + `@typescript-eslint/recommended` + `@typescript-eslint/strict`. ESLint 8.57.1 is on its **final-life branch**; ESLint 9 is current and uses flat config. See **I-1**.

`.prettierrc.json` per spec: 2-space, single-quote, semi, trailing-comma=all. Solidity override sets 4-space + double-quote + 120-col, matching `foundry.toml [fmt]` so the two formatters won't fight.

`.commitlintrc.json` — `scope-enum` lifted from `folder-structure.md §Naming` table (`bootstrap`, `contracts`, `shared`, `hub`, `dapp`, `mgmt`, `experiments`, `docker`, `ci`, `docs`, `branding`, `seed`, `release` + helpers `progress`, `review`, `deps`, `config`). All nine commits in this phase use scopes from this list — verified.

`.lintstagedrc.cjs` (migrated from `.json`): function-form filter that skips ESLint on dotfiles and `*.config.{js,ts}` because ESLint 8 lacks `--no-warn-ignored`. The filter is heuristic — see **I-4**.

`.gitleaks.toml` extends defaults; allowlists `*.example`, fixtures, docs, lockfile.

`.husky/pre-commit` runs `lint-staged` then a `command -v gitleaks` guard before invoking gitleaks — graceful degradation when contributors haven't installed it. `.husky/commit-msg` runs `commitlint --edit "$1"`.

### 2.3 Contract workspace (T-003)

`contracts/package.json` (`@qr-bc/contracts`): hardhat 2.22, ethers 6, hardhat-toolbox + hardhat-foundry, solhint 5, dotenv. ts-node + typescript pinned for hardhat config TS.

`foundry.toml`: `solc_version = "0.8.24"` matches ADR-007. Optimizer 200 runs (default), fuzz 256 (CI profile bumps to 1024), `via_ir = false`. `[fmt]` block matches Prettier's Solidity overrides. `[rpc_endpoints]` and `[etherscan]` use `${VAR}` interpolation — these will resolve at runtime from `.env`.

`hardhat.config.ts`: networks `hardhat`, `amoy` (chainId 80002), `mainnet` (chainId 137). `customChains` block teaches Hardhat about Polygon Amoy. `paths.tests = "test/hardhat"` matches the folder layout. `accounts` reads `DEPLOYER_PRIVATE_KEY` and falls back to `[]` to avoid Hardhat throwing at config load when the env is empty (correct for CI / fresh checkout).

`solhint.config.js`: extends `solhint:recommended`. `compiler-version: ['error', '^0.8.24']` enforces ADR-007. `gas-custom-errors: 'warn'` and `reason-string: ['warn', { maxLength: 64 }]` align with the contract's planned `Errors.sol` extraction in T-005. `comprehensive-interface: 'off'` because `IProductRegistry.sol` will be partial.

`.env.example`: fields verbatim from `inter-service-contract.md §3`.

`contracts/.gitignore`: includes `cache_hardhat/` (Hardhat 2.x changed cache dir name) — extension to spec, prevents the build-artifact directory from showing as untracked.

`contracts/lib/forge-std`: real submodule entry in `.gitmodules`. Submodule SHA recorded in tree (`160000` mode).

Deviations:

- **P-1** Added `contracts/src/Placeholder.sol` so the toolchain has a compilation target and `solhint` has a glob match. Replaced by `ProductRegistry.sol` in T-005. _Tracked as I-3 below._

### 2.4 Meta-files (T-004)

`.github/workflows/ci-placeholder.yml`: minimal install workflow on `push`/`pull_request` to `main`; uses `pnpm/action-setup@v4` (pinned major), `actions/setup-node@v4` (Node 20), `submodules: recursive` so forge-std is fetched. Replaced by Phase 8 workflows.

`.github/PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS` (`* @Huy0110`), `bug_report.md`, `feature_request.md`: all conform to the folder-structure spec.

`Makefile`: `setup`, `install`, `clean`, `lint`, `format`, `format-check`, `typecheck`, `test`, `demo`, `review` targets present. `make review` is a documentation-only reminder — it echoes that `/06-review` must be invoked manually inside Claude Code, since Makefiles cannot drive interactive AI skills. Spec note in T-004 acknowledges this.

---

## 3. Test coverage review

Phase 0 introduces **no application code**, so unit-test coverage in the conventional sense is N/A. However, the phase introduces _tooling_, and the tooling itself was exercised:

| Verification                                                         | Result                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm install --frozen-lockfile` (final run)                         | ✓ exit 0, no missing dependencies                     |
| `pnpm format:check`                                                  | ✓ exit 0, all 44 files prettier-conformant            |
| `pnpm lint`                                                          | ✓ exit 0 (no `.ts` files yet)                         |
| `pnpm typecheck` (placeholder)                                       | ✓ exit 0                                              |
| `forge build`                                                        | ✓ exit 0, compiles `Placeholder.sol` with Solc 0.8.24 |
| `forge test`                                                         | ✓ exit 0, no tests to run                             |
| `pnpm exec hardhat compile`                                          | ✓ exit 0, 1 typechain artifact                        |
| `pnpm exec solhint 'src/**/*.sol' 'test/**/*.sol' 'script/**/*.sol'` | ✓ exit 0                                              |
| Husky `commit-msg` hook                                              | ✓ rejects `'bad message no convention'`               |
| Husky `pre-commit` + gitleaks                                        | ✓ rejects fake GitHub PAT (`ghp_…`)                   |
| `make setup`                                                         | ✓ pnpm + submodule init                               |
| `make lint`, `make format`, `make format-check`, `make typecheck`    | ✓ all exit 0                                          |

A formal _negative_ test for each forbidden case (broken commit message, secret in staged file, secret in committed file) is satisfied by the husky hook tests above. The fake-AKIA case from T-002 DoD did not trigger in gitleaks 8.30 default rules; the equivalent assertion was satisfied with a GitHub PAT pattern. See **I-5**.

---

## 4. UI/UX review

N/A — Phase 0 introduces no user-facing surface. The first frontend appears in Phase 4 (T-023+).

---

## 5. Issues found

### Critical (must fix before Phase 1)

_None._ All four tickets meet their Definition of Done. Phase exit gate is fully green.

### Important (should fix soon — track but don't block Phase 1)

- **I-1** ESLint pinned at 8.57.1 (deprecated branch). ESLint 9 + flat config is the current standard; `@typescript-eslint` plugin v8 supports both. Recommendation: bump in Phase 8 (`T-038` apps-ci) when CI workflows land — at that point flat-config migration won't churn many files because no `.ts` source exists yet.
- **I-2** `engines` relaxed (`>=20` / `>=9`) to accommodate local Node 25 / pnpm 10. Reproducibility risk: contributors on different majors may produce drift. CI in `T-038` must pin to specific versions (recommend Node 20 LTS, pnpm 9.x) and make the workflow the source of truth for "supported environment" while keeping `engines` permissive locally.
- **I-3** `contracts/src/Placeholder.sol` is a toolchain stub. T-005 must delete it when introducing `ProductRegistry.sol`. If forgotten, `forge build` will succeed silently and shipped artifacts will include a 0-byte contract. Add to T-005 acceptance criteria as a checkbox.
- **I-4** `.lintstagedrc.cjs` heuristically skips ESLint on _all_ dotfiles. If a contributor adds e.g. `.tooling-rc.ts` with project source code, it would silently bypass lint. Acceptable for current set but worth replacing with an explicit allowlist once `apps/*` workspaces add their own configs.
- **I-5** Gitleaks v8.30 default AWS rule did not flag synthesized AKIA values without surrounding context (verified across three patterns). Recommend adding a stricter custom rule to `.gitleaks.toml` covering bare AKIA + 16 alphanumeric chars, since AWS keys are realistic risks for the experiments + IPFS pinning workflows.

### Minor (nice to fix — opportunistic)

- **M-1** `docs/tasks/progress.md` lines 154 and 169 trip MD040 (fenced code blocks without language). Pre-existing in the planning skill output; not introduced by Phase 0. One-line fix per block (` ```text `).
- **M-2** `pnpm install` warns 6 deprecated subdependencies (`@humanwhocodes/*`, `git-raw-commits`, `glob@7`, `inflight`, `rimraf@3`). Transitive — upstream maintainers' problem. Accept and re-evaluate at Phase 8.
- **M-3** Hardhat emits "Node v25.4.0 not supported" warning. Aligns with **I-2**; will disappear when CI pins Node 20.
- **M-4** Solhint announces "v6.2.1 available" on every run. Major version bump worth pulling in T-010 when contract analysis is being hardened.
- **M-5** pnpm reports "Ignored build scripts: keccak, secp256k1". These are optional native modules used by ethers/web3 libs. Approve via `pnpm approve-builds` only if performance regressions surface.
- **M-6** Phase 0 introduces husky + gitleaks but Phase 0 is nominally "no JS code", so the hook chain has not been exercised against any TS file yet. First real exercise will be T-005.

---

## 6. Missing features

None for Phase 0. All four tickets implemented; folder-structure entries scheduled for later phases (root `.env.example`, `docker-compose.yml`, `CHANGELOG.md`, `CITATION.cff`, `.zenodo.json`) appear in the correct future tickets (`T-036`, `T-045`, `T-042`, etc.).

---

## 7. Summary

- **Tickets done:** 4 / 4 (100%)
- **Critical issues:** 0
- **Important issues:** 5 (all deferrable to Phase 8 except I-3 which must be checked in T-005)
- **Minor issues:** 6
- **Phase exit gate:** ✓ PASSED — clean working tree, no remote, husky hooks verified end-to-end.

**Recommendation:** Phase 0 is complete. Before T-005, add the I-3 deletion check (remove `Placeholder.sol`) to that ticket's acceptance criteria. Phase 1 may begin.
