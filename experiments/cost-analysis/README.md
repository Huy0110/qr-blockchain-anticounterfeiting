# cost-analysis

**Reproduces:** Paper Table 4 — gas + USD cost per operation.

## What it measures

One full lifecycle (registerProject → registerBatch → redeemProduct)
on the chosen network. Captures the actual `gasUsed` from each receipt
and multiplies by `GAS_PRICE_GWEI × MATIC_USD` to land at a per-tx
USD figure.

## Inputs (env)

| Var                   | Default   | Notes                                                 |
| --------------------- | --------- | ----------------------------------------------------- |
| `GAS_PRICE_GWEI`      | `30`      | Polygon Amoy typical at paper-time                    |
| `MATIC_USD`           | `0.55`    | USD/MATIC rate at paper-time                          |
| `GAS_PRICE_TIMESTAMP` | now (UTC) | Snapshot timestamp recorded in summary.json           |
| `NETWORK`             | `hardhat` | `hardhat` (free) or `amoy` (real receipts, real cost) |

## Run

```sh
# Hardhat smoke
pnpm exp:cost-analysis --network hardhat

# Real Polygon Amoy
GAS_PRICE_GWEI=30 MATIC_USD=0.55 \
  GAS_PRICE_TIMESTAMP=2026-04-01T00:00:00Z \
  pnpm exp:cost-analysis --network amoy
```

## Outputs

Under `results/<RUN_ID>/cost-analysis/`:

- `raw.csv` — one row per operation
- `summary.json` — operations + gas-price provenance
- `plot.png` — bar chart of USD cost per operation
