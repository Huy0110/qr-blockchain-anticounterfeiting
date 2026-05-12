<!-- Title format: <type>(<scope>): <short summary>
     e.g. feat(contracts): add registerBatch with N≤500 cap
     See docs/CONTRIBUTING.md for the allowed types + scopes. -->

## Summary

<!-- 1–3 sentences. What changed and why (not how). -->

## Linked tickets / issues

<!-- e.g. Closes T-006 · refs ADR-002 · resolves #12 -->

## Changes

- [ ]

## Acceptance criteria

<!-- Tick the ACs from docs/requirements/features/*.md this PR satisfies.
     Example:
     - [x] AC-SC-2 — Second registerProject(phi) for same phi reverts
     - [x] AC-SA-2 — Property test SR1 fuzz ≥ 1000 -->

- [ ]

## Tests

- [ ] `forge test` (if touching `contracts/`)
- [ ] `forge coverage` ≥ 90% line (if touching `contracts/src/`)
- [ ] `pnpm -r typecheck && pnpm -r lint && pnpm -r test`
- [ ] Playwright suite (`pnpm --filter <app> exec playwright test`)
      if touching app UI
- [ ] Manual verification described in **Test plan** below

## Test plan

<!-- Reproducible steps reviewers can run locally. -->

## Risk + rollback

<!-- Required for changes touching contracts/, release pipeline, or
     deployer/hub bootstrap. Reference the risk register entry if
     this PR materially changes a known risk.
     Examples:
     - Touches contracts/src/ProductRegistry.sol → risk R-001
       (Reviewer 1 finds contract gap); mitigated by added fuzz
       test in test/properties/SR1_Unforgeability.t.sol.
     - Touches .github/workflows/release.yml → risk R-002
       (Reproducer cannot run); rollback by reverting commit. -->

- Risk register ref: <!-- R-XXX or "n/a" -->
- Blast radius:
- Rollback procedure:

## Checklist

- [ ] Conventional Commits message (per [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md#conventional-commits))
- [ ] Scope from the [allowed list](../docs/CONTRIBUTING.md#allowed-scopes)
- [ ] Updated `docs/` if behavior or interface changed
- [ ] Updated `docs/architecture/decision-log.md` if a new ADR is
      introduced or an existing one is amended
- [ ] No secrets, private keys, or `.env` files committed
- [ ] Updated `docs/tasks/progress.md` if a ticket is now done
- [ ] No CI gates relaxed to make the build green
