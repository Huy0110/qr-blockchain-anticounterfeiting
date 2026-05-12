# Contributing

This artifact accompanies an academic paper. Until the paper is
accepted at _Frontiers in Blockchain_, contributions are limited to
the paper's authors and explicitly invited reviewers. After
publication, we welcome bug reports, reproducibility fixes, and
mainnet-readiness PRs.

If you're a paper reviewer with a question, please open an Issue
rather than a PR — it's easier to triage and citable from the
journal's review system.

## Workflow

1. **Branch off `main`.** Never push directly to `main`; the branch
   is protected. Open a PR for every change.
2. **Use the per-phase ticket IDs.** Every change should reference
   one of the tickets in [`docs/tasks/progress.md`](tasks/progress.md)
   (`T-001` … `T-048`). If the change doesn't fit an existing ticket,
   open an Issue first to discuss whether it belongs in v1 or a
   future minor release.
3. **Keep PRs small and reviewable.** One ticket per PR; one
   conceptual change per commit. A 500-line PR is harder to review
   than five 100-line PRs.
4. **Run the full test suite locally** before opening the PR. CI
   will catch regressions, but each rerun is ~12 minutes of
   reviewer wait time.

## Branch naming

Pattern: `<type>/<scope>-<short-slug>`.

Examples:

- `feat/contracts-redeem-product` — implementing `redeemProduct`
- `fix/hub-jwt-refresh-loop` — fixing a hub bug
- `docs/threat-model-revision` — editing `THREAT_MODEL.md`
- `chore/deps-bump-next-14.2.18` — dependabot-style version bump

The `<type>` prefix must match one of the Conventional Commit types
below; `<scope>` must match one of the
[allowed scopes](#allowed-scopes); `<short-slug>` is kebab-case,
≤ 50 characters.

## Conventional Commits

Every commit message must match the
[Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/)
specification. This is enforced by `commitlint` in
[`.commitlintrc.json`](../.commitlintrc.json), via both a Husky
`commit-msg` hook locally and the
[`commitlint` GitHub Action](../.github/workflows/commitlint.yml) on
every PR.

Format:

```text
<type>(<scope>): <short summary in imperative mood>

<optional body — what + why, not how>

<optional footer — Closes T-XXX, Refs ADR-NNN, BREAKING CHANGE: …>
```

### Allowed types

| Type       | Use for                                                         |
| ---------- | --------------------------------------------------------------- |
| `feat`     | A new feature visible to a producer, consumer, or reviewer      |
| `fix`      | A bug fix                                                       |
| `docs`     | Documentation-only changes (`docs/`, `README.md`, NatSpec)      |
| `style`    | Formatting, whitespace, prettier — no behavior change           |
| `refactor` | Code change that neither fixes a bug nor adds a feature         |
| `perf`     | Performance improvement                                         |
| `test`     | Adding or fixing tests                                          |
| `build`    | Build system, package manager, Dockerfile changes               |
| `ci`       | CI configuration (`.github/workflows/`)                         |
| `chore`    | Maintenance: dependency bumps, progress updates, review reports |
| `revert`   | Reverting a previous commit                                     |

### Allowed scopes

The scope is **mandatory** per
[`.commitlintrc.json`](../.commitlintrc.json). One of:

- `bootstrap` — root tooling (`pnpm-workspace.yaml`, `package.json`,
  `tsconfig.base.json`)
- `contracts` — `contracts/`
- `shared` — `packages/shared/`
- `hub` — `apps/coordination-hub/`
- `dapp` — `apps/dapp-portal/`
- `mgmt` — `apps/management-portal/`
- `experiments` — `experiments/`
- `docker` — `docker-compose*.yml`, `Dockerfile`s
- `ci` — `.github/workflows/`
- `docs` — `docs/`, `README.md`
- `branding` — logo, i18n strings, og-image
- `seed` — demo seed data
- `release` — release-pipeline changes (`release.yml`, `ipfs-deploy.sh`)
- `progress` — `docs/tasks/progress.md`
- `review` — `docs/review-reports/*`
- `deps` — dependency updates (typical for dependabot PRs)
- `config` — environment / config schema changes

### Examples

```text
feat(contracts): add registerBatch with N≤500 cap

Caps batch size so a producer cannot brick a tx with a 30M-gas
batch. Per ADR-008 the cap is constant-time, not configurable.

Closes T-006
Refs ADR-008
```

```text
fix(hub): debounce JWT refresh on 401 burst

Concurrent requests during refresh now share a single refresh
promise instead of each triggering a fresh `/auth/refresh` call.

Closes T-014
```

```text
chore(progress): mark T-039 done
```

## Code style

The project is opinionated about formatting; style is mechanically
enforced so reviewers can focus on substance.

| Layer      | Tool                    | Config                                                      | Enforced by                             |
| ---------- | ----------------------- | ----------------------------------------------------------- | --------------------------------------- |
| TypeScript | ESLint + Prettier       | per-app `eslint.config.mjs`, root `.prettierrc.json`        | `pnpm -r lint`, `lint-staged` on commit |
| Solidity   | `forge fmt` + `solhint` | `contracts/.solhint.json`, `contracts/.solhint.sample.json` | `forge fmt --check`, `solhint` in CI    |
| Markdown   | Prettier                | `.prettierrc.json`                                          | `lint-staged` on commit                 |
| Shell      | `bash -n` only          | —                                                           | `pre-commit` smoke; reviewer eyeball    |

Prettier runs automatically on staged files via Husky. If a commit
fails the `commit-msg` hook because of formatting, run
`pnpm lint --fix` and re-commit; do not bypass hooks
(`--no-verify`).

## Test requirements

Every code change must keep these gates green:

| Gate                                   | When it runs                                  | Threshold                                                                       |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `forge test`                           | Every push touching `contracts/`              | Pass                                                                            |
| `forge coverage`                       | Same                                          | ≥ 90% line coverage                                                             |
| `forge snapshot --check --tolerance 5` | Same                                          | Pass (no silent gas regression)                                                 |
| `slither --fail-on high`               | Same                                          | 0 high findings                                                                 |
| `pnpm -r typecheck`                    | Every push                                    | Pass                                                                            |
| `pnpm -r lint`                         | Every push                                    | 0 warnings (per per-app config)                                                 |
| `pnpm test` (Vitest)                   | Every push touching `apps/` or `packages/`    | Pass                                                                            |
| hub Vitest coverage                    | Every push touching `apps/coordination-hub/`  | ≥ 70% line                                                                      |
| mgmt-portal Vitest coverage            | Every push touching `apps/management-portal/` | ≥ 20% (Vitest-only floor; combined Vitest+Playwright is a Phase 12 polish item) |
| Playwright dapp + mgmt                 | Every push touching the respective app        | Pass                                                                            |
| `gitleaks`                             | Every push                                    | 0 leaks                                                                         |
| `commitlint`                           | Every PR                                      | Every commit on the branch matches Conventional Commits                         |

If a gate fails on your PR, fix the underlying issue. Do not raise
the threshold to make the failure go away.

## Pull request template

Every PR is opened against the template at
[`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md).
Fill every section. The risk + rollback section is mandatory for
changes touching the contracts, the release pipeline, or the
deployer/hub bootstrap path.

## Pre-publication contribution policy

Until the paper is accepted, the following changes are **not
accepted**, even from co-authors:

- **Changes to `ProductRegistry.sol`** that alter externally
  observable behavior (function signatures, event topics, revert
  reasons). These would invalidate prior measurements.
- **Changes to the experiments output schema.** Reviewers comparing
  re-runs against the committed `experiments/results/example-RUN_ID/`
  artifacts need a stable schema.
- **Force-pushes to `main`** or to any tag prefixed `v`.

After publication, all of the above relax; only the `v1.x.y` tags
remain immutable.

## Reviewing your own work

Before opening a PR, run:

```sh
pnpm -r typecheck && pnpm -r lint && pnpm -r test
pnpm --filter contracts forge test
# Then re-read your own diff in `git diff main…HEAD` and ask:
# - Does each commit do one thing?
# - Does the commit message say *why*, not just *what*?
# - Did I touch any docs that should have been updated alongside?
```

A green local run + a clean self-review usually means CI will be
green too.

## Reporting security issues

**Do not open a public Issue** for a security finding in
`ProductRegistry.sol` or in the hub's wallet handling. Email
`pham.duc.huy@sun-asterisk.com` with the finding; we'll respond
within 72 hours and coordinate disclosure.

Non-security bugs and reproducibility issues are welcome as public
Issues.
