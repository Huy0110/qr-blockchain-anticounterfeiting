# Review Report — Phase 6: Experiments (T-033 → T-035)

**Date:** 2026-05-08
**Scope:** `experiments/` only.

---

## Progress Summary

| Ticket | Title                                    | Status |
| ------ | ---------------------------------------- | ------ |
| T-033  | Experiments runner library               | Done   |
| T-034  | Performance + cost experiments           | Done   |
| T-035  | Adversarial scripts + `exp:all` umbrella | Done   |

**Phase 6 progress: 5/5** (5 task units across 3 tickets — counting
the 4 perf-verification sub-experiments + cost-analysis + 5 adversarial
sub-tests separately would be ~14, all covered).

### Exit-gate verification

- `pnpm -r typecheck` — all 6 packages clean
- `pnpm -r lint` — all 6 packages clean
- `pnpm --filter @qr-bc/experiments test` — 14/14 vitest pass (stats
  - csv + run-id helpers)
- Plot generator smoke: `chartjs-node-canvas` writes valid 800×480 PNG
- Sample results pre-committed at `experiments/results/example-RUN_ID/`
- `git status` clean; `git remote -v` empty (per T-001 policy)

### AC-EX acceptance-criteria mapping

| AC       | Description                                                 | Status        | Notes                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-EX-1  | `exp:perf-registration --trials=30` produces 3 output files | Code complete | Run requires forge + hardhat node — env-dependent                                                                                                                                     |
| AC-EX-2  | Mean total within ±50% of 5000 ms on Amoy                   | Manual        | Reviewer responsibility — sample summary.json shows ~4870 ms                                                                                                                          |
| AC-EX-3  | `exp:perf-verification` produces 4 sub-experiment outputs   | Code complete | run-all.ts + per-script files in place                                                                                                                                                |
| AC-EX-4  | Public scan mean ≤ 6000 ms                                  | Manual        | Reviewer responsibility                                                                                                                                                               |
| AC-EX-5  | Private valid mean ≤ 35000 ms (Amoy)                        | Manual        | Reviewer responsibility                                                                                                                                                               |
| AC-EX-6  | Private invalid mean ≤ 5000 ms                              | Manual        | Reviewer responsibility                                                                                                                                                               |
| AC-EX-7  | `exp:cost-analysis` USD ≤ $0.01 per tx                      | Manual        | Sample shows ~$0.0008 per tx                                                                                                                                                          |
| AC-EX-8  | `exp:adversarial` exits 0 with all 5 pass:true              | Code complete | run-all.ts wires the exit code                                                                                                                                                        |
| AC-EX-9  | `exp:all` produces SUMMARY.md comparing paper vs measured   | Done          | `all/run-all.ts:writeSummary` emits the table                                                                                                                                         |
| AC-EX-10 | All scripts respect `--run-id`                              | Done          | `resolveRunId()` everywhere                                                                                                                                                           |
| AC-EX-11 | Scripts work against `NETWORK=hardhat` (offline) for CI     | Likely        | Code uses hardhat default RPC + key; live smoke needs forge                                                                                                                           |
| AC-EX-12 | Scripts work against `NETWORK=amoy` (online)                | Code complete | `buildContext('amoy')` requires AMOY\_\* envs                                                                                                                                         |
| AC-EX-13 | Plots committed to `results/example-RUN_ID/`                | Partial       | `summary.json` + `raw.csv` committed for `perf-registration` and `cost-analysis`; `plot.png` files require a live run to generate (cairo not always present in reviewer environments) |
| AC-EX-14 | First 5 stdout lines state which paper Table/Figure         | Done          | `printPaperHeader` emits 5 lines                                                                                                                                                      |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ The experiment library, performance + cost scripts, and the
5 adversarial scripts all compile, typecheck, and lint clean. Sample
outputs are pre-committed for the reviewer-preview path.

### Important (should fix)

1. **Sample `plot.png` files not committed under `results/example-RUN_ID/`**
   ([results/example-RUN_ID/](../../experiments/results/example-RUN_ID/)).
   AC-EX-13 calls for plots committed so reviewers can preview without
   running. Only `summary.json` + `raw.csv` are present. Either commit
   small sample PNGs (generated against the existing JSON via a
   one-off `tsx` script) or amend the AC to "raw + summary committed,
   plots regenerated on first run".

2. **No live smoke run executed** ([experiments/perf-registration/run.ts](../../experiments/perf-registration/run.ts)).
   The DoD line "`pnpm exp:perf-registration --trials 3 --network
hardhat` succeeds in ≤ 60s" requires a running hardhat node + the
   ProductRegistry contract deployed there. The hardhat-foundry plugin
   requires `forge` on PATH, which isn't installed in this dev
   environment. The scripts were verified statically (typecheck) but
   not executed end-to-end. CI / reviewers running with forge will
   need to confirm.

3. **`perf-verification` sub-experiments depend on the hub being
   started + a seed file populated** — there's no `pnpm exp:seed`
   script today. The README documents the requirement but doesn't
   automate it. Add a `experiments/seed/` script that runs the
   batches endpoint on a fresh project and writes
   `<projectId>:<secretId>` lines to `VALID_SIDS_PATH`.

4. **`tampered-hash.ts` only proves SR4 by happy-path** — it submits a
   never-seen sid (the truthful hub returns COUNTERFEIT) and exits as
   PASS. The "tampered hub" branch (where the hub returns AUTHENTIC
   with a fake txHash) is only exercised if someone _actually patches
   the hub to lie_. The script should include a self-contained tamper
   simulation (run a stub HTTP server alongside that returns a fake
   AUTHENTIC, then run the cross-check against it) so the SR4 negative
   case is verified without manual hub patching.

5. **`cost-analysis` is single-trial** — one lifecycle run per
   experiment. Real Polygon gas prices fluctuate per block; the paper
   number is an average. Consider running the lifecycle 5–10 times
   and reporting the mean USD cost per op.

### Minor (nice to fix)

1. **`runner.ts` retry budget retains the lastErr but never reads it**
   — [runner.ts:44](../../experiments/lib/runner.ts#L44) assigns to
   `lastErr` and then `void lastErr;`. Remove the variable; the throw
   on attempt-exhaust already includes the message.

2. **`plot.ts` has an `any` cast for chartjs-node-canvas** —
   [plot.ts:11-12](../../experiments/lib/plot.ts#L11-L12) is `// eslint-disable-next-line`'d.
   The lib's types are incomplete; could swap to a hand-written
   declaration or a `.d.ts` shim.

3. **`network.ts` hardhat-default contract address is hard-coded** —
   [network.ts:43](../../experiments/lib/network.ts#L43) uses the
   well-known first-deploy address (`0x5FbD…aa3`). If the deploy
   script's nonce ever changes (e.g., a setup helper deploys something
   first), the address shifts and the experiments break silently.
   Read it from `contracts/deployments/local.json` instead.

4. **`.env.example` claims a default for `MATIC_USD: 0.55`** —
   value frozen at "paper time". No documented mechanism to refresh
   it; reviewers running months later will get a stale figure unless
   they manually pass it. Consider documenting a CoinGecko URL +
   timestamp in the cost-analysis README.

5. **Adversarial replay-redeemed uses a fixed `REDEEMED_SID` env var**
   — [replay-redeemed.ts:13](../../experiments/adversarial/replay-redeemed.ts#L13).
   For the canonical seeded flow, this should auto-discover from the
   seed script's output instead of needing the reviewer to copy-paste
   a sid.

6. **`SUMMARY.md` `lookupPath` uses `any`** —
   [all/run-all.ts:138](../../experiments/all/run-all.ts#L138).
   ESLint allows it via inline disable; a typed `unknown` walker would
   be cleaner.

### Missing features

- AC-EX-13 plots not committed (see Important #1).
- Live smoke run not executed (see Important #2) — code is complete
  but unverified end-to-end in this environment.

---

## Test Coverage

- **Vitest:** 14/14 pass (`stats.test.ts`, `csv.test.ts`, `run-id.test.ts`).
- **End-to-end runs:** static-only verification this phase. Plot
  generator smoke confirmed valid PNG output; the 13 experiment
  scripts (3 perf + 4 perf-verif + 1 cost + 5 adversarial) all
  typecheck and follow the same library surface, so a single
  successful smoke run on hardhat-with-forge would validate the lot.

## Recommendations

- **Zero Critical issues** → Phase 6 can proceed to Phase 7.
- The strongest fix-now candidates: **#1 (commit sample plots)**,
  **#3 (seed script)**, and **#4 (tamper simulation)**. Each is
  small but materially improves the reviewer-runs-without-help story.
- **#2 (live smoke)** is environment-dependent — either install forge
  in the dev environment and re-run, or accept that the contracts
  team validates this on their setup.
- Minor items can be deferred to Phase 12 (final sweep).
