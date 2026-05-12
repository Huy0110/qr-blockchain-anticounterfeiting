# Phase 0 — Bootstrap

**Goal:** Empty workspace ready for development. Lint/format/commit hooks installed. GitHub repo public.
**Effort:** ~0.5 day total (4 tickets).
**Prerequisites:** None.

---

### T-001 — Initialize local git + skeleton files

**Phase:** 0 · **Feature:** (bootstrap) · **Effort:** S

**Description.** Init git **locally** inside the new code folder. **No push, no GitHub repo creation.** Commit-as-we-go locally during all phases; remote setup + first push deferred to T-047 (Phase 12).

**Files to create/modify:**

- `qr-blockchain-anticounterfeiting/.gitignore` — paths from [folder-structure.md §Gitignored](../architecture/folder-structure.md#gitignored-paths)
- `qr-blockchain-anticounterfeiting/.editorconfig` — UTF-8, LF, 2-space indent for TS/JSON/MD, 4-space for Solidity
- `qr-blockchain-anticounterfeiting/.nvmrc` — `20`
- `qr-blockchain-anticounterfeiting/LICENSE` — MIT (placeholder; will be filled in T-045)
- `qr-blockchain-anticounterfeiting/README.md` — placeholder ("Coming soon" + repo title)

**Acceptance criteria refs:** AC-CT-2 (LICENSE SPDX matches `MIT`)
**ADRs:** ADR-010 (pnpm), ADR-012 (Conventional Commits)
**Depends on:** None.
**Definition of Done:**

- [ ] `git init` complete inside `qr-blockchain-anticounterfeiting/`.
- [ ] First commit created locally (`chore(bootstrap): scaffold repo skeleton`) with placeholder README + LICENSE + .gitignore + .editorconfig + .nvmrc.
- [ ] **NO** `git remote add origin` set yet. **NO** `gh repo create`. **NO** push.
- [ ] No accidental files from paper repo bleed into this repo (`git ls-files` shows clean state — verify the new folder has its own `.git/`, distinct from `journal_1/.git/`).

---

### T-002 — pnpm workspace + TypeScript base + lint/format/commit

**Phase:** 0 · **Feature:** (bootstrap) · **Effort:** M

**Description.** Set up the pnpm monorepo with shared lint/format/commit infrastructure.

**Files to create/modify:**

- `package.json` (root) — name, scripts (`format`, `lint`, `typecheck`), engines pinning Node 20 + pnpm 9, `preinstall: 'npx only-allow pnpm'`
- `pnpm-workspace.yaml` — packages: `apps/*`, `packages/*`, `experiments`, `contracts`
- `tsconfig.base.json` — `strict: true`, `noUncheckedIndexedAccess: true`, ES2022, moduleResolution `bundler`
- `.eslintrc.json` — flat-config-compatible base extending `@typescript-eslint/strict`
- `.eslintignore`
- `.prettierrc.json` — 2-space, single-quote, semicolons, trailing comma `all`
- `.prettierignore`
- `.commitlintrc.json` — `extends: ['@commitlint/config-conventional']`, scope-enum from [folder-structure.md §Naming](../architecture/folder-structure.md#naming-conventions)
- `.lintstagedrc.json` — run prettier + eslint on staged files
- `.husky/pre-commit` — `pnpm exec lint-staged && pnpm exec gitleaks protect --staged --redact`
- `.husky/commit-msg` — `pnpm exec commitlint --edit $1`
- `.gitleaks.toml` — extend default, allowlist test fixtures

**Acceptance criteria refs:** AC-CI-4, AC-CI-5
**ADRs:** ADR-010, ADR-012
**Depends on:** T-001.
**Definition of Done:**

- [ ] `pnpm install` succeeds in empty workspace.
- [ ] `pnpm format --check` passes on empty/formatted files.
- [ ] `pnpm lint` passes (zero rules violated since no code yet).
- [ ] `pnpm typecheck` passes.
- [ ] Husky hooks installed (`.husky/_/husky.sh` exists after `pnpm install`).
- [ ] Test commit with non-Conventional message fails commit-msg hook.
- [ ] Adding a fake `aws_secret = AKIA...` to a file is rejected by gitleaks pre-commit.

---

### T-003 — Foundry + Hardhat init in `contracts/`

**Phase:** 0 · **Feature:** F1 · **Effort:** M

**Description.** Bootstrap the contract workspace with both Foundry and Hardhat side-by-side per ADR-001.

**Files to create/modify:**

- `contracts/package.json` — name `@qr-bc/contracts`, devDeps: hardhat, `@nomicfoundation/hardhat-toolbox`, `@nomicfoundation/hardhat-foundry`, ethers v6, dotenv, solhint
- `contracts/tsconfig.json` — extends `tsconfig.base.json`
- `contracts/foundry.toml` — `src = 'src'`, `test = 'test'`, `out = 'out'`, `libs = ['lib']`, `solc_version = '0.8.24'`, `optimizer = true`, `optimizer_runs = 200`, `fuzz = { runs = 256 }`
- `contracts/remappings.txt` — `forge-std/=lib/forge-std/src/`
- `contracts/hardhat.config.ts` — networks: `hardhat`, `amoy`, `mainnet`; tasks for deploy
- `contracts/solhint.config.js` — recommended rules + custom for NatSpec required
- `contracts/lib/forge-std/` — added as git submodule
- `contracts/.env.example` — per [inter-service-contract.md §3](../architecture/inter-service-contract.md#3-environment-variables--per-service)
- `contracts/.gitignore` — `cache/`, `out/`, `broadcast/`

**Acceptance criteria refs:** (none direct; supports F1)
**ADRs:** ADR-001 (Hardhat + Foundry), ADR-007 (Solidity 0.8.24 + sha256 prep)
**Depends on:** T-002.
**Definition of Done:**

- [ ] `pnpm --filter @qr-bc/contracts install` succeeds.
- [ ] `forge build` succeeds (empty `src/`).
- [ ] `forge test` succeeds (no tests yet).
- [ ] `npx hardhat compile` succeeds.
- [ ] `pnpm --filter @qr-bc/contracts solhint 'src/**/*.sol'` passes.
- [ ] `forge-std` submodule present at `contracts/lib/forge-std/`.

---

### T-004 — Bootstrap meta-files + Makefile (commit locally only)

**Phase:** 0 · **Feature:** (bootstrap) · **Effort:** S

**Description.** Create GitHub-related skeleton files (workflows, PR template, CODEOWNERS, issue templates) and the `Makefile`. **Commit locally; do NOT push.** Workflows run later when repo is pushed in T-047.

**Files to create/modify:**

- `.github/workflows/ci-placeholder.yml` — minimal workflow that runs `pnpm install --frozen-lockfile`. Will be replaced by real workflows in Phase 8.
- `.github/PULL_REQUEST_TEMPLATE.md` — template per [folder-structure.md](../architecture/folder-structure.md#root)
- `.github/CODEOWNERS` — Huy0110 owns everything in v1
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `Makefile` — `setup`, `install`, `clean`, `lint`, `format`, `test`, `demo`, `review` targets (Note: `make review` will invoke `/06-review` skill manually; documented in Makefile comment)

**Acceptance criteria refs:** None (preparation).
**ADRs:** —
**Depends on:** T-001, T-002, T-003.
**Definition of Done:**

- [ ] Working tree clean; second commit `chore(bootstrap): add CI scaffolding + Makefile` created locally.
- [ ] `git log --oneline` shows ≥ 2 commits, all on local `main` branch.
- [ ] `git remote -v` shows NO remote configured.
- [ ] `make setup` succeeds locally (installs pnpm deps + foundry submodule).
- [ ] `make lint`, `make format`, `make typecheck` all pass on the empty workspace.
- [ ] **Phase exit gate:** invoke `/06-review` to audit Phase 0; resolve any findings before starting Phase 1.
