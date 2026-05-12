# `@qr-bc/experiments`

Reviewer-runnable scripts that regenerate the paper's measurement
tables (Tables 3 + 4) and exercise the SR1–SR4 security claims (§3.2).

## Quick start

```sh
# Hardhat (offline, deterministic). ~10 min for everything.
pnpm exp:all --network hardhat

# Polygon Amoy (real network, real numbers). Requires AMOY_RPC_URL
# + AMOY_PRIVATE_KEY + PRODUCT_REGISTRY_ADDRESS in env.
NETWORK=amoy pnpm exp:all --network amoy
```

Every script writes its outputs under `results/<RUN_ID>/<experiment>/`:

- `raw.csv` — one row per trial
- `summary.json` — descriptive stats with 95 % CI
- `plot.png` — Chart.js → PNG (800×480)

`exp:all` then walks every per-experiment `summary.json` and emits
`results/<RUN_ID>/SUMMARY.md` comparing each paper claim with the
measured value side-by-side (AC-EX-9).

## Catalogue

| Script                       | Reproduces             | Notes                       |
| ---------------------------- | ---------------------- | --------------------------- |
| `pnpm exp:perf-registration` | Paper Table 3 row 1    | 100-ID batch gen + register |
| `pnpm exp:perf-verification` | Paper Table 3 rows 2–4 | 4 sub-experiments           |
| `pnpm exp:cost-analysis`     | Paper Table 4          | gas + USD per op            |
| `pnpm exp:adversarial`       | Paper §3.2 SR1–SR4     | 5 sub-tests                 |
| `pnpm exp:all`               | All of the above       | + `SUMMARY.md`              |

## Prerequisites

- `pnpm install` (canvas needs cairo+pango — `brew install cairo pango`
  on macOS).
- **Foundry on PATH** (`forge` + `anvil`):

  ```sh
  curl -L https://foundry.paradigm.xyz | bash
  source ~/.zshenv && foundryup
  ```

- For `--network hardhat` (recommended fast local path uses `anvil`):

  ```sh
  # terminal 1: local in-memory chain
  anvil

  # terminal 2: deploy ProductRegistry to anvil's account #0
  cd contracts && forge script script/Deploy.s.sol \
    --rpc-url http://127.0.0.1:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast

  # terminal 3: run experiments (the deployer's nonce-0 address is
  # also the experiment producer)
  PRODUCT_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 \
    pnpm exp:perf-registration --trials 3 --network hardhat --batch 10
  ```

- For `--network amoy`: see `.env.example`.
- For perf-verification + adversarial scripts that talk to the hub:
  `pnpm --filter @qr-bc/coordination-hub start` in another terminal,
  with the hub pointed at the same RPC + contract.

## CI smoke

```sh
pnpm exp:all --trials 3 --network hardhat
```

Targets ~10 min on Amoy. Hardhat smoke is a few seconds: a 3-trial
`perf-registration --batch 10` ran in ~190 ms per trial (verified
during Phase 6 fix-bug pass).

## Seed helpers (for perf-verification)

The `private-valid` and `private-redeemed` sub-experiments need
pre-registered (project, sid) pairs. Generate them on whichever
network you're using:

```sh
# Mint 100 fresh pairs (default count) and save to
# results/<RUN_ID>/seed/valid-sids.txt
PRODUCT_REGISTRY_ADDRESS=… pnpm exp:seed:pairs --network hardhat

# Optionally redeem them all so the redeemed-sids.txt input is ready
VALID_SIDS_PATH=results/<RUN_ID>/seed/valid-sids.txt \
  pnpm exp:seed:redeem --network hardhat
```

## Re-runnability

Pass `--run-id <id>` to any script to bucket its outputs under an
existing run directory. `exp:all` does this automatically for every
sub-step it spawns.
