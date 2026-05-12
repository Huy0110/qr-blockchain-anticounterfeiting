# perf-registration

**Reproduces:** Paper Table 3 row 1 — "Batch private ID generation
(100 IDs) — ~5 s on Amoy".

## What it measures

For each trial:

1. Generate N (default 100) random sids client-side.
2. Compute `h_i = hashSid(sid_i)` for each.
3. Send `registerProject(phi)` (idempotent — fine on re-runs).
4. Send `registerBatch(phi, hashes[])`.
5. Wait for the batch confirmation.

Splits captured: `genHashMs`, `submitMs`, `confirmMs`, `totalMs`.

## Run

```sh
# Hardhat smoke (CI-fast, deterministic, no real cost)
pnpm exp:perf-registration --trials 3 --network hardhat

# Real reproduction against the paper's network
NETWORK=amoy AMOY_RPC_URL=… AMOY_PRIVATE_KEY=… PRODUCT_REGISTRY_ADDRESS=… \
  pnpm exp:perf-registration --trials 30 --network amoy
```

## Outputs

Under `results/<RUN_ID>/perf-registration/`:

- `raw.csv` — one row per trial (genHash + submit + confirm + total + tx hash)
- `summary.json` — descriptive stats with 95% CI for each split
- `plot.png` — pseudo-boxplot (min/mean/max bars per split)
