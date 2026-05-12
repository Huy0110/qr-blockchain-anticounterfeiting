# Reproducibility Guide

Step-by-step recipes that take a reviewer from `git clone` to every
numbered claim in the paper. The default path uses local Hardhat (no
testnet account needed); the Amoy path is documented for reviewers
who want measurements against a live PoS network.

## Prerequisites

| Tool     | Version             | Why                                        |
| -------- | ------------------- | ------------------------------------------ |
| Git      | 2.40+               | Clone                                      |
| Docker   | 24+ with Compose v2 | Local stack (mongo + ipfs + hardhat + …)   |
| Node.js  | 20.x LTS            | pnpm + experiments CLI                     |
| pnpm     | 10.x                | Workspace manager — install via `corepack` |
| Foundry  | 0.2.x               | `forge test`, `forge coverage`             |
| GNU make | any                 | `make demo`                                |

```sh
# One-line bootstrap on a clean Ubuntu 22.04 LTS / macOS 14
corepack enable
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

## Step 0 — Clone

```sh
git clone https://github.com/Huy0110/qr-blockchain-anticounterfeiting.git
cd qr-blockchain-anticounterfeiting
cp .env.example .env
# .env defaults are safe for the local-only profile. For Amoy
# measurements, see "Testnet profile" below.
```

## Step 1 — Bring up the local stack

```sh
make demo
```

This runs `docker compose up --wait` for the default profile
(mongo + ipfs + hardhat + contracts-deployer + coordination-hub +
both portals), then runs `scripts/smoke-test.sh` which:

1. Registers a producer through the hub.
2. Creates a project.
3. Calls `POST /batches` with `N=10`.
4. Calls `POST /scan/private` with one of the returned secret IDs.
5. Asserts the response is `AUTHENTIC` with a non-empty txHash.

A clean machine should reach the green smoke check in **≤ 15 minutes**
including the first Docker image pull (AC-DOC-1).

If `make demo` fails, the first place to look is `docker compose logs
coordination-hub` — the hub waits on the contracts-deployer service
to write `/contracts-out/address.txt`. See
[`docs/MAINNET_DEPLOY.md`](MAINNET_DEPLOY.md) for the operational
runbook.

## Step 2 — First verified scan, end-to-end UI

```sh
# Management portal — register, create, batch, download manifest
open http://localhost:3001        # macOS
xdg-open http://localhost:3001    # Linux
```

1. **Register** a producer (any email/password works in dev).
2. **Create** a project — fill the form; the on-chain
   `registerProject` happens server-side, you'll see a Polygonscan
   link (Hardhat: a local block explorer at
   `http://localhost:8545`).
3. **Batch wizard** — set `N=10`, confirm cost, click _Generate_. The
   browser downloads `batch-<phi>.zip` containing 10 QR PNGs and
   `manifest.json` mapping each public ID to its hidden `sid`.
4. **Consumer dApp** — open `http://localhost:3000` and paste any
   private-QR URL from the manifest (`/scan/<phi>/<sid>`). The page
   should land on **AUTHENTIC** with a txHash that resolves on the
   local block explorer.

### Demo seed (optional)

`make demo` does not seed by default. If you want the three example
HTX cooperatives (HTX Vân Nội, HTX Tân Đức, HTX Củ Chi — each with
5 cultivation activities, 1 certification, and a sample batch of 5
QR) populated automatically, run:

```sh
pnpm --filter @qr-bc/coordination-hub seed
```

The seed is idempotent; re-running it skips any HTX whose
`cooperativeName` already exists. The credentials baked into the
fixtures are:

| Cooperative | Email                        | Password               |
| ----------- | ---------------------------- | ---------------------- |
| HTX Vân Nội | `htx-vannoi@demo.qrbc.local` | `DemoSeed!Password123` |
| HTX Tân Đức | `htx-tanduc@demo.qrbc.local` | `DemoSeed!Password123` |
| HTX Củ Chi  | `htx-cuchi@demo.qrbc.local`  | `DemoSeed!Password123` |

> ⚠️ **Security warning.** These credentials exist only for the demo
> hub and **must not be used outside a local-only Docker stack**.
> They are intentionally weak so that a reviewer can log in without
> reading source. Do not export them, do not reuse them on Amoy or
> mainnet, and do not commit a real `.env` file derived from them.
> The `SEED_PASSWORD` env var (default
> `DemoSeed!Password123`) can be overridden at seed time if a
> reviewer needs to attach the demo to a non-local hub.

## Step 3 — Reproduce paper measurements

Every measurement in the paper's Tables 3 and 4 corresponds to one
of the experiment scripts in [`experiments/`](../experiments). The
shared library at [`experiments/lib/`](../experiments/lib) handles
trial running, statistics (mean / stddev / 95% CI), CSV emission, and
plot rendering. Each script writes to
`experiments/results/<RUN_ID>/<experiment-name>/{raw.csv, summary.json, plot.png}`.

The umbrella runner `pnpm exp:all` orchestrates everything and emits
`SUMMARY.md` comparing each paper claim with the measured value.

### Paper → command mapping

| Paper artifact                            | What it reports                                                                    | Command                                                                        | Network                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| **Table 3 row 1** — Registration latency  | Time for `registerBatch` to confirm (split into gen+hash + submit-confirm)         | `pnpm exp:perf-registration --trials 30 --network amoy`                        | Amoy (or hardhat for offline) |
| **Table 3 row 2** — Public scan latency   | End-to-end time for `GET /scan/public/:phi`                                        | `pnpm exp:perf-verification --case public --trials 30 --network amoy`          | Amoy                          |
| **Table 3 row 3** — Private scan, valid   | End-to-end time for `POST /scan/private` returning AUTHENTIC                       | `pnpm exp:perf-verification --case private-valid --trials 30 --network amoy`   | Amoy                          |
| **Table 3 row 4** — Private scan, invalid | End-to-end time for `POST /scan/private` returning COUNTERFEIT                     | `pnpm exp:perf-verification --case private-invalid --trials 30 --network amoy` | Amoy                          |
| **Table 4** — Gas + USD cost per op       | Real receipt gas × Polygon gas-price × MATIC/USD                                   | `pnpm exp:cost-analysis --network amoy`                                        | Amoy                          |
| **SR1 — Unforgeability proof**            | Random `sid` → `redeemProduct` reverts                                             | `pnpm exp:adversarial` (runs `forge-unknown-sid.ts`)                           | hardhat / amoy                |
| **SR2 — Non-replayability proof**         | Double redeem → second reverts                                                     | `pnpm exp:adversarial` (runs `replay-redeemed.ts` + `race-redeems.ts`)         | hardhat / amoy                |
| **SR3 — Non-repudiation proof**           | `ProductRedeemed` event observable via Polygonscan                                 | `pnpm exp:adversarial` (proven by the txHash output of the redeem scripts)     | hardhat / amoy                |
| **SR4 — Trust independence proof**        | Hub lying about hash → reviewer's independent Polygonscan check fails              | `pnpm exp:adversarial` (runs `tampered-hash.ts`)                               | hardhat / amoy                |
| **All of the above + SUMMARY.md**         | Paper-vs-measured side-by-side; lists every claim with its measured value and CI95 | `pnpm exp:all --network amoy`                                                  | Amoy                          |

Each script's first five stdout lines name the paper Table/Figure it
reproduces, the network in use, the trial count, and the RUN_ID (so a
reviewer can spot-check the right script ran).

### Quick offline path

If you only have a local machine without an Amoy faucet credit, every
adversarial script and every performance script can run against the
Hardhat node spun up by `make demo`:

```sh
pnpm exp:all --network hardhat
```

The numbers won't match the paper exactly (Hardhat finality is
sub-second; the paper measures Polygon Amoy ≈ 30s). The Hardhat path
proves _correctness_ (SR1–SR4 hold); the Amoy path proves
_performance_ (R2, Table 3).

## Testnet profile (Amoy)

For paper-grade measurements:

```sh
# 1. Fund a wallet via the official faucet
#    https://faucet.polygon.technology/  (Amoy network)

# 2. Set the three Amoy variables in .env
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
SYSTEM_WALLET_PRIVATE_KEY=0x...                  # the funded wallet
CONTRACT_ADDRESS=0x...                           # see step 3

# 3. Deploy ProductRegistry to Amoy
forge script contracts/script/Deploy.s.sol \
  --rpc-url "$AMOY_RPC_URL" \
  --private-key "$SYSTEM_WALLET_PRIVATE_KEY" \
  --broadcast --verify
# Copy the deployed address into CONTRACT_ADDRESS

# 4. Re-run any experiment with --network amoy
pnpm exp:perf-registration --trials 30 --network amoy
```

The Foundry script + `.env.example` are documented in
[`docs/MAINNET_DEPLOY.md`](MAINNET_DEPLOY.md).

## Testnet vs mainnet variance

The paper's §8 numbers correspond to Polygon **mainnet** measurements.
This artifact ships with **Amoy** (Polygon's PoS testnet) as the
default because mainnet requires real MATIC, which a reviewer
shouldn't have to spend to reproduce the paper. We document the
expected variance below.

| Quantity                             | Mainnet (paper) | Amoy (this repo, typical) | Why they differ                                                                                                                    |
| ------------------------------------ | --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Block time                           | ~2 s            | ~2 s                      | Same target                                                                                                                        |
| Finality (Heimdall checkpoint)       | ~30 s           | ~60 s                     | Amoy validator set is sparser, checkpoints fire less frequently                                                                    |
| Gas price (gwei)                     | 30–100          | 25–35                     | Less demand → cheaper, but the **per-op gas cost is identical** (same opcodes); the USD cost diverges only with the MATIC/USD rate |
| Verification latency (private valid) | ~30 s           | ~35–45 s                  | Mostly waiting on finality; bounded by Amoy's slower checkpoint rate                                                               |
| Verification latency (public)        | ~5 s            | ~5–8 s                    | Read-only call, no block needed                                                                                                    |
| Adversarial test outcomes            | Identical       | Identical                 | SR1–SR4 are properties of the contract logic, not network performance                                                              |

Each experiment script reports the observed mean ± stddev and an
exact reference to the paper claim. The `SUMMARY.md` written by
`pnpm exp:all` flags any row that diverges by more than ±50% from the
paper for reviewer attention.

### About Polygon Amoy

Polygon Amoy is the PoS testnet that succeeded Mumbai (deprecated
April 2024). All measurements in this artifact were captured on Amoy
with the RPC endpoint `https://rpc-amoy.polygon.technology` and the
canonical `ProductRegistry` deployment whose address is committed in
`contracts/deployments/amoy.json` after Step 3 above.

## Smart-contract suite

Independent of the application-level experiments, the property tests
that back SR1–SR4 (and the unit + invariant suite) run entirely
offline:

```sh
cd contracts
forge test -vvv
forge coverage --report summary                      # expects ≥ 90% line coverage
forge snapshot --check --tolerance 5                 # gas budget gate
slither . --config-file slither.config.json --fail-on high
```

The CI workflow [`.github/workflows/contracts-ci.yml`](../.github/workflows/contracts-ci.yml)
runs the same commands on every push.

## Table 5 — Why it's not in v1 scope { #table-5 }

The paper's Table 5 is a qualitative comparison against three prior
anti-counterfeiting systems. Reproducing it requires implementing or
fetching reference data from each of those external systems, which is
out of scope for an in-repository reproducibility artifact (none of
the three has a public, reviewable codebase). The paper-side
narrative does not depend on a re-measurement of those numbers.

If a reviewer wants the Table 5 numbers re-derived from primary
sources, the citations are listed in §7 of the paper.

## Troubleshooting

| Symptom                                                             | Most likely cause                                          | Fix                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `make demo` hangs at `qr-bc-coordination-hub: waiting`              | Hardhat node startup slow on first pull                    | Wait up to 90 s; `docker compose logs hardhat` to confirm           |
| Hub returns 500 on `POST /batches`                                  | `CONTRACT_ADDRESS` not set; the deployer service missed it | `docker compose logs contracts-deployer` and re-run `make demo`     |
| `pnpm exp:perf-registration` "insufficient funds for intrinsic gas" | Empty Amoy wallet                                          | Top up via <https://faucet.polygon.technology/>                     |
| Lighthouse run fails on `localhost:8765`                            | dApp `out/` not built yet                                  | `pnpm --filter @qr-bc/dapp-portal build`                            |
| `forge test` "command not found"                                    | Foundry not on PATH                                        | `foundryup` then re-source your shell                               |
| Numbers diverge > ±50% from paper                                   | Amoy congestion or stale MATIC/USD rate                    | Re-run; if persistent, file an Issue with the `SUMMARY.md` attached |

For anything not in the table, open an Issue at
<https://github.com/Huy0110/qr-blockchain-anticounterfeiting/issues>
including the output of `pnpm exp:all` and `docker compose ps`.
