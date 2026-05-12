# Phase 6 — Reproducibility Experiments (`experiments/`)

**Goal:** Reviewer-runnable scripts that regenerate paper Tables 3 + 4 and demonstrate adversarial resilience. Sample results pre-committed.
**Effort:** ~1.5 days total (3 tickets).
**Prerequisites:** Phase 1 + Phase 3.

---

### T-033 — Experiments runner library

**Phase:** 6 · **Feature:** F6 · **Effort:** S

**Description.** Shared utility module: trial runner with N-iterations + retries, stats helpers, CSV emitter, Chart.js plot generator.

**Files to create/modify:**

- `experiments/package.json` — name `@qr-bc/experiments`, deps: tsx, ethers v6, `@noble/hashes`, `chartjs-node-canvas`, `csv-stringify`, `dotenv`
- `experiments/tsconfig.json`
- `experiments/.env.example`
- `experiments/lib/runner.ts` — `runTrials<T>(label, n, fn)`, retries
- `experiments/lib/stats.ts` — `summarize(values) → {mean, stdDev, ci95Low, ci95High, min, max, median}`
- `experiments/lib/csv.ts` — `writeCsv(path, rows)`
- `experiments/lib/plot.ts` — boxplot + bar + line generators
- `experiments/lib/network.ts` — chooses provider per `NETWORK` env
- `experiments/lib/run-id.ts` — generates / parses RUN_ID
- `experiments/test/stats.test.ts` — Vitest

**Acceptance criteria refs:** AC-EX-10, AC-EX-13
**ADRs:** —
**Depends on:** T-012.
**Definition of Done:**

- [ ] `pnpm --filter @qr-bc/experiments build` succeeds.
- [ ] `summarize([1,2,3,4,5])` returns correct mean/stdDev/CI95.
- [ ] CSV writer respects deterministic key order.
- [ ] Plot generator outputs valid PNG.

---

### T-034 — Performance + cost experiments

**Phase:** 6 · **Feature:** F6 · **Effort:** M

**Description.** Implement `perf-registration`, `perf-verification` (4 sub-experiments), and `cost-analysis`. Each writes raw CSV + summary JSON + plot PNG under `results/<RUN_ID>/`.

**Files to create/modify:**

- `experiments/perf-registration/run.ts` — N=30 trials; total + gen+hash + submit-confirm splits
- `experiments/perf-verification/run-public.ts`
- `experiments/perf-verification/run-private-valid.ts`
- `experiments/perf-verification/run-private-invalid.ts`
- `experiments/perf-verification/run-private-redeemed.ts`
- `experiments/cost-analysis/run.ts` — gas + USD cost from real receipt
- `experiments/perf-registration/README.md` (per-script README explaining what it reproduces)
- `experiments/perf-verification/README.md`
- `experiments/cost-analysis/README.md`
- Pre-computed sample outputs in `results/example-RUN_ID/perf-registration/{raw.csv, summary.json, plot.png}` (etc.)

**Acceptance criteria refs:** AC-EX-1, AC-EX-2, AC-EX-3, AC-EX-4, AC-EX-5, AC-EX-6, AC-EX-7, AC-EX-11, AC-EX-12, AC-EX-14
**ADRs:** —
**SR/R mapping:** R2 (performance reproduction), R1 (cost reproduction)
**Depends on:** T-022, T-033.
**Definition of Done:**

- [ ] `pnpm exp:perf-registration --trials 3 --network hardhat` succeeds in ≤ 60s.
- [ ] `pnpm exp:perf-registration --trials 30 --network amoy` produces real measurements (manual verify).
- [ ] All 4 perf-verification sub-scripts work.
- [ ] `pnpm exp:cost-analysis` reports per-tx USD cost; documents Polygon gas price source + timestamp.
- [ ] Each script first 5 lines of stdout state which paper Table/Figure it reproduces.
- [ ] Sample results committed under `results/example-RUN_ID/`.

---

### T-035 — Adversarial scripts + `exp:all` umbrella

**Phase:** 6 · **Feature:** F6 · **Effort:** M

**Description.** 5 adversarial scripts proving SR1–SR4 resilience. Plus `exp:all` orchestrator that runs everything and emits `SUMMARY.md`.

**Files to create/modify:**

- `experiments/adversarial/forge-unknown-sid.ts` — random sid → expect COUNTERFEIT
- `experiments/adversarial/replay-redeemed.ts` — redeem twice → expect ALREADY_VERIFIED
- `experiments/adversarial/unauthorized-batch.ts` — direct contract call from non-producer → expect revert UnauthorizedProducer
- `experiments/adversarial/tampered-hash.ts` — hub patched to lie; reviewer cross-checks Polygonscan → demonstrates SR4
- `experiments/adversarial/race-redeems.ts` — submit 2 redeems same block → exactly one succeeds
- `experiments/all/run-all.ts` — orchestrates F6.1–F6.4; writes `results/<RUN_ID>/SUMMARY.md` with paper-vs-measured table
- `experiments/README.md` — explains how to run all experiments

**Acceptance criteria refs:** AC-EX-8, AC-EX-9
**ADRs:** ADR-014
**SR/R mapping:** SR1, SR2, SR3, SR4
**Depends on:** T-022, T-034.
**Definition of Done:**

- [ ] `pnpm exp:adversarial` runs all 5 scripts; exits 0 only if all expected outcomes occur.
- [ ] `pnpm exp:all --network hardhat` runs everything in ≤ 10 min.
- [ ] `SUMMARY.md` lists every paper claim (Table 3 row 1..4, Table 4 cost) with measured value side-by-side.
- [ ] `tampered-hash.ts` proves SR4 by submitting a fake response from hub and showing Polygonscan independent verification fails.
- [ ] All scripts re-runnable with `--run-id <id>` flag.
