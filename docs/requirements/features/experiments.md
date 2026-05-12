# Feature F6 — Reproducibility Experiments (`experiments/`)

**Module:** TypeScript scripts under `experiments/`
**Priority:** P0
**Depends on:** F1, F3
**Paper section:** §8 (lines 875–957) — drives every experiment.

---

## Purpose

Reviewer-runnable scripts that regenerate paper Tables 3 + 4 from scratch. Each script:

- Takes a deterministic `RUN_ID` (default = ISO timestamp).
- Runs N≥30 trials per metric.
- Writes raw observations to `results/<RUN_ID>/<experiment>/raw.csv`.
- Computes mean / std / 95% CI; writes to `results/<RUN_ID>/<experiment>/summary.json`.
- Plots to `results/<RUN_ID>/<experiment>/plot.png`.
- Prints to stdout: which paper Table/Figure it reproduces.

---

## User stories

- **US-EX-1.** As a **reviewer**, I want to run `pnpm exp:perf-registration` and within 5 minutes get a CSV + plot reproducing paper Table 3 row 1 so that I can compare to claimed numbers.
- **US-EX-2.** As a **reviewer**, I want to run `pnpm exp:perf-verification` and get CSV + plot reproducing paper Table 3 rows 2–4.
- **US-EX-3.** As a **reviewer**, I want to run `pnpm exp:cost-analysis` and get a snapshot of actual gas + USD cost per operation reproducing paper Table 4.
- **US-EX-4.** As a **reviewer**, I want to run `pnpm exp:adversarial` and see scripted attempts at forge / replay / unauthorized batch all rejected by the contract.
- **US-EX-5.** As a **reviewer**, I want one umbrella command `pnpm exp:all` that runs all experiments and produces a single `results/<RUN_ID>/SUMMARY.md`.

---

## Detailed requirements

### Common framework

- All scripts in TypeScript, run via `tsx` (or `bun` if simpler).
- Shared utility module `experiments/lib/runner.ts`:
  - `runTrials<T>(label: string, trials: number, fn: () => Promise<T>): Promise<TrialResult<T>[]>`
  - `summarize(values: number[]) → { mean, stdDev, ci95Low, ci95High, min, max, median }`
  - `writeCsv(path, rows)`, `writePlot(path, data, opts)` (uses `chartjs-node-canvas` or `nodeplotlib`).
- Default network: Amoy testnet via `NETWORK=amoy`. Override to `hardhat` for offline CI runs.
- Default trials: N=30. Override via `--trials=50`.
- Each script accepts `--run-id <id>` for deterministic paths.

### F6.1 — `perf-registration/`

Reproduces **Paper Table 3 row 1: "Batch private ID generation (100 IDs) — ~5 s"**.

Procedure:

1. Deploy fresh `ProductRegistry` contract (or reuse if `--contract <addr>` provided).
2. Register a fresh project `phi`.
3. For each trial (N=30):
   - Generate 100 random `sid_i` (CSPRNG, 32 bytes).
   - Compute 100 `h_i` (SHA-256).
   - Submit `registerBatch(phi, [h_1..h_100])`.
   - Measure: total wall-clock time from `Generate` to `tx confirmed (1 conf)`.
   - Sub-measurements: `gen+hash` time, `submit-to-confirmed` time.
4. Output: `raw.csv` with columns `trial,total_ms,gen_hash_ms,submit_confirm_ms,gas_used,tx_hash`.
5. Output: `summary.json` with mean/std/CI for all three metrics.
6. Output: `plot.png` boxplot of `total_ms`.

Acceptance: mean `total_ms` is within ±50% of paper's 5000 ms (testnet variance is wider than mainnet — document this).

### F6.2 — `perf-verification/`

Reproduces **Paper Table 3 rows 2–4: "Public scan ~5 s, Private valid ~30 s, Private invalid ~4 s"**.

Sub-experiments:

**(a) Public scan latency**

1. Pre-register 1 project + 1 batch of 100 products (via `perf-registration` setup).
2. For each trial: hit hub `GET /scan/public/:phi`. Measure end-to-end ms.
3. Output: `raw_public.csv`, `summary_public.json`, `plot_public.png`.

**(b) Private scan — valid product**

1. Reserve N=30 unredeemed `sid_i` from setup.
2. For each trial: hit hub `POST /scan/private` with one `sid_i`. Measure end-to-end ms (includes block confirmation).
3. Output: `raw_private_valid.csv`, etc.

**(c) Private scan — invalid sid**

1. For each trial: hit hub `POST /scan/private` with a random invalid sid (never registered). Measure end-to-end ms (no tx, only `verifyProduct`).
2. Output: `raw_private_invalid.csv`.

**(d) Private scan — already redeemed**

1. Pre-redeem 30 `sid_i`.
2. For each trial: hit hub `POST /scan/private` with a redeemed sid. Measure end-to-end.
3. Output: `raw_private_redeemed.csv`.

Combined plot: bar chart with mean ± std for all 4 sub-experiments.

### F6.3 — `cost-analysis/`

Reproduces **Paper Table 4: cost summary**.

Procedure:

1. Run 1 representative `registerProject`, `registerBatch(N=100)`, `redeemProduct` on Amoy.
2. Capture each tx's `gas_used`, `effective_gas_price` (from receipt).
3. Compute `cost_native = gas_used * gas_price` (in MATIC wei → MATIC).
4. Convert to USD using a hard-coded conversion or live API (CoinGecko free) — note the timestamp + price.
5. Output `summary.json` with: per-op gas, MATIC cost, USD cost.
6. Cross-check against paper Table 4 numbers (~$0.001/tx).
7. Compute: cost per 100,000 products (paper §8.3 claim: ~$1 for registration, ~$100 for verification).

Cost is deterministic per opcode; one trial is enough (no N=30 needed).

### F6.4 — `adversarial/`

Reproduces **§3 defensive — basic adversarial scripts**.

Sub-tests (each must result in expected revert or rejection):

**(a) Forge unknown sid.** Generate random sid never registered → call `POST /scan/private` → expect `COUNTERFEIT`.

**(b) Replay redeemed sid.** Redeem once, then call again → expect `ALREADY_VERIFIED`.

**(c) Unauthorized `registerBatch`.** From producer A's wallet, attempt `registerBatch` for project owned by B → expect on-chain revert `UnauthorizedProducer`.

**(d) Tampered hash submission.** Bypass hub: directly call `redeemProduct(phi, randomSid)` where `sha256(randomSid)` not in registry → expect revert `ProductDoesNotExist`. (This proves SR4: hub cannot fabricate `AUTHENTIC`.)

**(e) Race two redeems on same sid in same block.** Submit two txs in one block → exactly one succeeds, one reverts. (Polygon serial execution, but verify behavior.)

Output: `summary.json` with pass/fail for each sub-test + tx hashes.

### F6.5 — `exp:all` umbrella

A bash/zx script that runs F6.1–F6.4 in sequence, copies all outputs into `results/<RUN_ID>/`, and produces `results/<RUN_ID>/SUMMARY.md` — a markdown table comparing paper claims vs measured values.

---

## Edge cases

| #       | Scenario                             | Expected behavior                                                                                  |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| EC-EX-1 | Amoy faucet empty / RPC rate-limited | Script retries 3× with exponential backoff; logs warning; on persistent failure, exits 1 with hint |
| EC-EX-2 | User runs without funded wallet      | Script checks balance up-front; if < 1 MATIC for full run, exits 1 with faucet link                |
| EC-EX-3 | Trial fails mid-run (RPC timeout)    | Records as `failed=true` in CSV; continues remaining trials; reports failure rate in summary       |
| EC-EX-4 | RUN_ID directory already exists      | Refuse to overwrite; suggest `--run-id <new>`                                                      |
| EC-EX-5 | `NETWORK=hardhat` in-process node    | All scripts work but cost analysis returns 0 (Hardhat ignores gas pricing); document               |
| EC-EX-6 | Plot lib not installed               | `pnpm install` fails fast, not at runtime                                                          |
| EC-EX-7 | Concurrent runs on same network      | Use unique nonce; tolerate replacements via ethers.js auto-nonce                                   |

---

## Acceptance criteria

| #        | Criterion                                                                                  | Maps to                | Verified by                     |
| -------- | ------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------- |
| AC-EX-1  | `pnpm exp:perf-registration --trials=30` produces all 3 output files                       | Paper Table 3 row 1    | CI smoke (--trials=3 for speed) |
| AC-EX-2  | Mean total ms is within ±50% of paper's 5000 ms on Amoy                                    | Paper Table 3          | Manual review of summary        |
| AC-EX-3  | `pnpm exp:perf-verification --trials=30` produces 4 sub-experiment outputs                 | Paper Table 3 rows 2–4 | CI smoke                        |
| AC-EX-4  | Public scan mean ≤ 6000 ms                                                                 | Paper Table 3 row 2    | Manual review                   |
| AC-EX-5  | Private valid mean ≤ 35000 ms (Amoy)                                                       | Paper Table 3 row 3    | Manual review                   |
| AC-EX-6  | Private invalid mean ≤ 5000 ms                                                             | Paper Table 3 row 4    | Manual review                   |
| AC-EX-7  | `pnpm exp:cost-analysis` produces summary with USD cost ≤ $0.01 per tx                     | Paper Table 4          | Manual review                   |
| AC-EX-8  | `pnpm exp:adversarial` exits 0 with all 5 sub-tests "pass: true"                           | Paper §3.2, SR1–SR4    | CI                              |
| AC-EX-9  | `pnpm exp:all` produces `SUMMARY.md` comparing paper vs measured                           | reproducibility        | CI artifact                     |
| AC-EX-10 | All scripts respect `--run-id` and write under `results/<RUN_ID>/`                         | reproducibility        | CI                              |
| AC-EX-11 | Scripts work against `NETWORK=hardhat` (offline) for CI                                    | CI                     | CI                              |
| AC-EX-12 | Scripts work against `NETWORK=amoy` (online) for human runs                                | reproducibility        | Manual                          |
| AC-EX-13 | Plots are committed to `results/<example-RUN_ID>/` so reviewer can preview without running | reproducibility        | Repo state                      |
| AC-EX-14 | Each script prints, in stdout first 5 lines, exact paper Table/Figure being reproduced     | reproducibility        | CI grep                         |

---

## Sample baseline `results/example-RUN_ID/`

Pre-computed CSVs + plots committed to the repo (from a real Amoy run by the author) so a reviewer who can't run scripts still sees concrete numbers.

---

## Non-goals

- No N=30 for cost (deterministic by opcode).
- No comparative baseline (centralized SQL / single-QR) — deferred per gathered-req §6.
- No k6 / Locust stress test (deferred).
- No regression tracking over time (one-shot per run, not historical dashboard).
