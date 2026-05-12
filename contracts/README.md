# `@qr-bc/contracts`

Solidity ProductRegistry contract using a dual Foundry + Hardhat toolchain (ADR-001).

## Quick start

```bash
pnpm --filter @qr-bc/contracts install
forge build
forge test
```

## Layout

- `src/` — Solidity sources
- `test/` — Forge property + unit tests (`*.t.sol`); Hardhat E2E in `test/hardhat/`
- `script/` — Foundry deploy/verify scripts (`*.s.sol`)
- `deploy/` — Hardhat deploy scripts (TypeScript)
- `lib/` — Foundry submodules (forge-std, etc.)

## Networks

| Network                  | RPC                     | Chain ID |
| ------------------------ | ----------------------- | -------- |
| `hardhat` (local)        | `http://localhost:8545` | 31337    |
| `amoy` (Polygon testnet) | `RPC_URL_AMOY`          | 80002    |
| `mainnet` (Polygon)      | `RPC_URL_MAINNET`       | 137      |

See [`.env.example`](.env.example) for required environment variables.
