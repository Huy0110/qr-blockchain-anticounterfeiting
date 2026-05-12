# Mainnet Deployment Runbook

Operator-oriented runbook for promoting this artifact from
Polygon Amoy (testnet) to Polygon mainnet. **Status as of v1.0.0:
the system has NOT been deployed to mainnet.** The paper's
reproducibility scope is Amoy; mainnet is a v1.1+ exercise. The
runbook is included here so the deployment path is reviewable, not
because we plan to execute it before the paper's publication.

The reproducibility artifact (`pnpm exp:all --network amoy`) is the
canonical reference. Mainnet measurements would replicate the Amoy
flow with the variables below swapped in.

## Pre-deploy checklist

Run every item in order. Do not deploy until each box is checked.

- [ ] **Audit:** independent Solidity audit completed; report linked
      in `docs/security-audit-<vendor>.pdf`. (Not in v1.0.0 scope.)
- [ ] **Code freeze:** `main` branch at the exact commit being
      deployed; tag `v1.x.0-rc` exists and CI is green.
- [ ] **Secrets management:** `SYSTEM_WALLET_PRIVATE_KEY` is held by
      an HSM or cloud KMS (AWS KMS, GCP Cloud KMS, or Azure Key
      Vault); the deployment script signs via the KMS, never via a
      raw key on disk. See **KMS migration notes** below.
- [ ] **MATIC reserve:** deployment wallet holds **≥ 50 MATIC** —
      covers `Deploy.s.sol` (~3 MATIC), 30 days of operational
      `redeemProduct` gas, and a 10× safety margin.
- [ ] **Monitoring:** Grafana / Datadog dashboard provisioned with
      panels for: RPC error rate, hub p95 latency, MATIC balance,
      `ProductRedeemed` event lag, mongo CPU.
- [ ] **Pinata production tier:** account upgraded to Pinata Pro;
      `PINATA_JWT` rotated and stored in the secrets vault.
- [ ] **Custom domain:** `verify.<your-domain>` resolved to the
      dApp CID via a DNSLink TXT record; HTTPS via Cloudflare or
      Fastly.
- [ ] **Backups:** mongo running on Atlas with snapshot retention
      ≥ 30 days; hub configuration backed up to S3 with versioning.
- [ ] **Runbook drill:** operator on call has run the rollback
      procedure below against the Amoy deployment within the last
      90 days.
- [ ] **CHANGELOG:** `CHANGELOG.md` entry for this release written,
      including breaking changes and migration notes.

## Deploy steps

### 1. Dry-run against mainnet RPC

`forge script` supports a no-broadcast dry-run that hits the real
RPC, simulates the deploy locally, and prints the projected gas
cost. Do this **before** topping up the wallet — if the dry-run
fails (e.g. bad RPC, wrong chainid, contract bytecode mismatch), you
catch it without spending MATIC.

```sh
cd contracts
export MAINNET_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key

# No --broadcast, no --private-key → simulation only.
forge script script/Deploy.s.sol --rpc-url "$MAINNET_RPC_URL"
```

Expected output ends with `Estimated gas: <N>`. If you see anything
other than a clean `Script ran successfully`, stop and investigate.

### 2. Verify deployer balance ≥ 5 MATIC

The deployer wallet must hold **at least 5 MATIC** before broadcast.
The `Deploy.s.sol` script enforces this guard at runtime (see
[`Deploy.s.sol::MAINNET_MIN_BALANCE`](../contracts/script/Deploy.s.sol)),
but checking before broadcast lets you top up cleanly:

```sh
cast balance --rpc-url "$MAINNET_RPC_URL" $DEPLOYER_ADDRESS --ether
```

If under 5 MATIC, send more from your treasury or buy via the
official Polygon bridge before continuing.

### 3. Deploy the contract

The Foundry deploy script lives at
[`contracts/script/Deploy.s.sol`](../contracts/script/Deploy.s.sol).
For mainnet, sign via KMS — **never** a raw private key on disk:

```sh
cd contracts

# Sign via AWS KMS. Equivalent flags exist for GCP Cloud KMS and
# Ledger; see `forge script --help` for the matrix.
forge script script/Deploy.s.sol \
  --rpc-url "$MAINNET_RPC_URL" \
  --aws --aws-kms-key-id "$KMS_KEY_ARN" \
  --broadcast --verify \
  --etherscan-api-key "$POLYGONSCAN_API_KEY"
```

On success the script writes
`contracts/out/address.mainnet.json` with `{contractAddress,
chainId, network}`. Capture this file into
`contracts/deployments/mainnet.json` alongside the deployer txHash
and the verified-on-Polygonscan URL.

### 4. Verify the contract on Polygonscan

`forge verify-contract` does the upload; the included
[`Verify.s.sol`](../contracts/script/Verify.s.sol) helper prints the
exact one-line command using the address already in
`out/address.mainnet.json`:

```sh
forge script script/Verify.s.sol --rpc-url "$MAINNET_RPC_URL"
# Copy the printed `forge verify-contract …` command and run it.
```

Successful verification turns the green-check tick on the contract's
Polygonscan page within ~30 s.

### 5. Update operational config

The hub reads its production config from environment variables. The
canonical template is
[`apps/coordination-hub/.env.production.example`](../apps/coordination-hub/.env.production.example);
copy it into your secrets vault and fill the empty values:

```sh
# Required for mainnet operation (set in the secrets vault, NOT in the repo):
NETWORK=mainnet
RPC_URL=$MAINNET_RPC_URL                  # paid provider with SLA
CONTRACT_ADDRESS=0x...                    # from step 3
SYSTEM_WALLET_KMS_KEY_ID=$KMS_KEY_ARN     # the producer-sign hot wallet
JWT_SECRET, REFRESH_SECRET                # ≥ 32 chars each, rotate quarterly
WALLET_ENCRYPTION_KEK                     # 32 raw bytes base64-encoded
MONGO_URI=mongodb+srv://...               # Atlas replica set
PINATA_JWT=...                            # production tier
DAILY_SALT_SECRET=...
```

**Do not** edit `.env` in the repo; production secrets come from the
operator's secrets store. The full list of variables — including the
`SYSTEM_WALLET_KMS_KEY_ID` slot for the post-v1 KMS migration — is in
the `.env.production.example` template referenced above.

The 28 production variables, grouped by responsibility:

| Group         | Variable                          | Role                                                                 |
| ------------- | --------------------------------- | -------------------------------------------------------------------- |
| App           | `NODE_ENV`                        | `production` — gates Swagger, error verbosity, logging defaults      |
| App           | `PORT`                            | Container port (3000 by default; LB targets this)                    |
| App           | `LOG_LEVEL`                       | `warn` recommended for prod; `info` for the first 48 h post-cutover  |
| App           | `EXPOSE_SWAGGER`                  | `false` in prod (avoid leaking endpoint metadata)                    |
| App           | `CORS_ORIGINS`                    | Comma-separated list of allowed origins; **no** wildcard             |
| Auth          | `JWT_SECRET`                      | ≥ 32 chars, rotated quarterly                                        |
| Auth          | `JWT_EXPIRES_IN`                  | Access-token lifetime (default `24h`)                                |
| Auth          | `REFRESH_SECRET`                  | Separate secret from `JWT_SECRET`                                    |
| Auth          | `REFRESH_EXPIRES_IN`              | Refresh-token lifetime (default `30d`)                               |
| Wallet crypto | `WALLET_ENCRYPTION_KEK`           | 32 raw bytes base64-encoded; key-encryption key for producer wallets |
| Database      | `MONGO_URI`                       | Atlas replica set with TLS — never single-instance Mongo in prod     |
| Blockchain    | `NETWORK`                         | `mainnet`                                                            |
| Blockchain    | `RPC_URL`                         | Paid provider with SLA (Alchemy / Infura / dRPC / QuickNode)         |
| Blockchain    | `CONTRACT_ADDRESS`                | From step 3                                                          |
| Blockchain    | `SYSTEM_WALLET_PRIVATE_KEY`       | **Empty in prod** — leave blank, use KMS instead                     |
| Blockchain    | `SYSTEM_WALLET_KMS_KEY_ID`        | KMS key for the producer-redemption signer (post-v1 migration)       |
| Blockchain    | `TX_CONFIRMATIONS`                | `3` for mainnet (settles past 30-s checkpoint window)                |
| Blockchain    | `TX_TIMEOUT_SECONDS`              | `120` for mainnet (reorg + congestion headroom)                      |
| IPFS          | `IPFS_PROVIDER`                   | `pinata` for prod                                                    |
| IPFS          | `PINATA_JWT`                      | Production-tier Pinata JWT                                           |
| IPFS          | `IPFS_GATEWAY_URL`                | DNSLink-resolved domain or `gateway.pinata.cloud`                    |
| IPFS          | `IPFS_API_URL`                    | Pinata API endpoint (`https://api.pinata.cloud`)                     |
| Rate limit    | `RATE_LIMIT_LOGIN_PER_15M`        | Tune up if you see legit users tripping it                           |
| Rate limit    | `RATE_LIMIT_REGISTER_PER_HOUR`    | Producer registration cap                                            |
| Rate limit    | `RATE_LIMIT_SCAN_PRIVATE_PER_MIN` | Anti-grinding cap for `/scan/private`                                |
| Rate limit    | `RATE_LIMIT_AUTH_GENERIC_PER_MIN` | Catch-all for refresh + check-status endpoints                       |
| Observability | `DAILY_SALT_ROTATE_HOUR_UTC`      | UTC hour the verification-log IP-hash salt rotates                   |
| Observability | `DAILY_SALT_SECRET`               | 32-byte base64 secret combined with the date to hash IPs             |
| Observability | `LOG_PUBLIC_SCANS`                | `true` so the verification analytics page has data                   |

### 6. Roll the hub

```sh
# Blue/green: stand up a second hub instance against mainnet
docker compose -f docker-compose.yml -f docker-compose.prod.override.yml up -d hub
# Verify health
curl https://api.<your-domain>/health
# Cut over the load balancer; keep the old instance running for 24h
```

### 7. Publish the dApp

```sh
# From a clean repo checkout at the same tag as the contract:
apps/dapp-portal/ipfs-deploy.sh         # pins to Pinata production
# Update the DNSLink TXT record to the new CID; old CID stays pinned
# for 90 days as a rollback target.
```

### 8. Smoke-test through the production path

End-to-end with a real but valueless test product:

1. Register a producer through the management portal at
   `https://producer.<your-domain>`.
2. Create one project, generate a batch of `N=1`.
3. Scan the resulting private QR; verify the dApp lands on
   AUTHENTIC and the txHash resolves on Polygonscan mainnet.

If any step fails, **do not announce the deployment** — execute the
rollback procedure below.

## Post-deploy verification

Within the first hour of mainnet operation:

- [ ] `eth_getLogs` for the contract address returns the deployer's
      first `ProjectCreated` event.
- [ ] Polygonscan contract page shows the source verified and the
      ABI matches `packages/shared/src/abi/ProductRegistry.json`.
- [ ] Grafana dashboard is receiving metrics; no panel is grey.
- [ ] The dApp loads under 3 s from the production CID via the
      DNSLink-resolved domain.
- [ ] Sentry / error tracking has captured zero unhandled exceptions
      from the hub in the post-cutover hour.

## Rollback plan

The contract itself is immutable
([ADR-008](architecture/decision-log.md#adr-008--immutable-smart-contract-no-proxy-pattern)),
so "rollback" means three different things depending on the layer
that broke:

### Hub / API rollback (most common)

```sh
# The old hub container is still running on the secondary host
# from step 3. Re-point the LB to it:
<your-lb-tool> set-target old-hub-instance
# Investigate, fix, re-deploy. Old hub keeps serving in the meantime.
```

### dApp rollback

```sh
# Old CID is still pinned. Update the DNSLink TXT record:
dig _dnslink.verify.<your-domain> TXT
# Set the value back to the previous CID; TTL is usually ≤ 60 s.
```

### Contract rollback

The contract cannot be rolled back. If a critical bug is identified
post-deploy, the procedure is:

1. **Stop new redemptions** at the hub layer: deploy a hub revision
   that returns `503 service unavailable` for `POST /scan/private`.
   This is procedural — the contract still accepts redemptions, but
   no legitimate user can reach it.
2. **Deploy V2:** ship a `ProductRegistryV2` to a new address; update
   the hub config; re-run the producer onboarding for every active
   producer (registers existing `phi`s on the new contract).
3. **Burn the old address** in the CHANGELOG and the README so future
   reviewers don't mistake V1 for the canonical artifact.
4. **Update the paper:** if the V2 schema diverges from V1's,
   coordinate with the journal for a corrigendum.

This path is intentionally painful; that's why
[ADR-008](architecture/decision-log.md#adr-008--immutable-smart-contract-no-proxy-pattern)
preferred immutability over a proxy pattern.

## KMS migration notes

The Amoy reproducibility flow uses a raw private key set via the
`SYSTEM_WALLET_PRIVATE_KEY` env var. This is **acceptable for testnet**
because the wallet only holds free MATIC; it is **not acceptable for
mainnet**.

The mainnet migration replaces the env var with one of:

| Provider                 | What to set                                        | Foundry flag                                                 |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| AWS KMS                  | `KMS_KEY_ARN` (the key's full ARN)                 | `--aws --aws-kms-key-id $KMS_KEY_ARN`                        |
| GCP Cloud KMS            | `GCP_KMS_KEY_PATH`                                 | `--gcp --gcp-kms-key $GCP_KMS_KEY_PATH`                      |
| Hardware wallet (Ledger) | n/a (uses the device)                              | `--ledger`                                                   |
| HashiCorp Vault transit  | `VAULT_TRANSIT_KEY` + `VAULT_ADDR` + `VAULT_TOKEN` | Custom signer (see `contracts/script/lib/VaultSigner.s.sol`) |

The hub's runtime signer (the address that calls `redeemProduct` for
gasless verification per
[ADR-014](architecture/decision-log.md#adr-014--system-hot-wallet-not-producer-wallet-signs-redeemproduct))
follows the same migration: replace `SYSTEM_WALLET_PRIVATE_KEY` in
the hub config with `SYSTEM_WALLET_KMS_KEY_ID` and use the
ethers.js KMS signer adapter (e.g. `@aws-sdk/client-kms` +
`ethers-aws-kms-signer`).

**Why we didn't ship KMS in v1:** the artifact's primary audience is
a paper reviewer who wants `pnpm exp:all` to work. Requiring KMS
credentials would add a per-reviewer onboarding step that
contradicts the "15-minute clean machine" goal of
[`docs/REPRODUCIBILITY.md`](REPRODUCIBILITY.md). Reviewers running
against Amoy use a throwaway wallet funded via the public faucet.

## v1.0.0 explicit non-deployment

This release **has not been deployed to Polygon mainnet**. The
reproducer runs against Amoy (PoS testnet) with the deployed
`ProductRegistry` contract at the address committed in
`contracts/deployments/amoy.json` once T-046 + T-047 land. Mainnet
deployment will follow the procedure above and is tracked under
Phase 11 ([T-046](tasks/phase-11-mainnet-path.md)).
