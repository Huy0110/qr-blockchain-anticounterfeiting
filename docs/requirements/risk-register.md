# Risk Register

Risks ordered by impact × likelihood. Each risk has a likelihood (L1–L5), impact (I1–I5), score (L×I), trigger, mitigation, owner phase, and contingency.

Likelihood scale: L1=Rare, L2=Unlikely, L3=Possible, L4=Likely, L5=Almost certain.
Impact scale: I1=Negligible, I2=Minor, I3=Moderate, I4=Major, I5=Severe.

---

## High-priority (score ≥ 12)

### R-001 — Reviewer 1 inspects code, finds smart contract gap

| Field       | Value                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood  | L4 (advisor explicitly warned about Reviewer 1)                                                                                                                                                                                                                                                                                                               |
| Impact      | I5 (paper rejection, blocks publication)                                                                                                                                                                                                                                                                                                                      |
| Score       | 20                                                                                                                                                                                                                                                                                                                                                            |
| Trigger     | Reviewer 1 reads `contracts/src/ProductRegistry.sol` and finds: missing access control, deviation from paper, incorrect hash function, untested branch, unsafe arithmetic, etc.                                                                                                                                                                               |
| Mitigation  | (a) NatSpec maps every function to paper Algorithm + line. (b) ≥ 90% line coverage. (c) Slither high-severity 0. (d) Property tests for SR1–SR4 with fuzz-runs ≥ 1000. (e) `docs/SECURITY_ANALYSIS.md` cross-references SR # → contract function → test file:line. (f) Manual checklist against SWC registry. (g) Gas snapshot to prevent silent regressions. |
| Owner phase | F1 implementation, F7 tests, F10 docs                                                                                                                                                                                                                                                                                                                         |
| Contingency | If a finding is identified post-DOI, ship v1.0.1 with Zenodo new version (DOI versioning). Frontiers re-review pipeline allows code updates as long as paper text references the latest DOI.                                                                                                                                                                  |

### R-002 — Reproducer cannot run on first try

| Field       | Value                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood  | L4                                                                                                                                                                                                                                                                                                                                                                                       |
| Impact      | I4 (Reviewer 1 / future researcher abandons; "code didn't work" is a fatal critique)                                                                                                                                                                                                                                                                                                     |
| Score       | 16                                                                                                                                                                                                                                                                                                                                                                                       |
| Trigger     | Missing `.env.example` field, undocumented prerequisite, port conflict, broken pin in `pnpm-lock.yaml`, region-specific IPFS gateway block.                                                                                                                                                                                                                                              |
| Mitigation  | (a) Test quickstart on a clean Linux VM before tagging v1.0.0. (b) `docker compose up` brings up everything including local Hardhat node. (c) CI runs the same quickstart in matrix on `ubuntu-latest`. (d) README has troubleshooting section + "common errors". (e) `--profile testnet` available if reviewer prefers Amoy directly. (f) Health endpoint reports per-component status. |
| Owner phase | F8, F9, F10                                                                                                                                                                                                                                                                                                                                                                              |
| Contingency | Open a public Issue, fix on a hotfix branch, ship v1.0.1 within 24h.                                                                                                                                                                                                                                                                                                                     |

### R-003 — Performance numbers diverge from paper Table 3

| Field       | Value                                                                                                                                                                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood  | L4 (Amoy testnet has different finality + congestion patterns vs the Polygon mainnet implied in §8)                                                                                                                                                                                                                         |
| Impact      | I3 (Reviewer 1 questions credibility, but explainable)                                                                                                                                                                                                                                                                      |
| Score       | 12                                                                                                                                                                                                                                                                                                                          |
| Trigger     | Mean latency on Amoy is significantly higher (or wildly different) from paper's 5/30/4 s.                                                                                                                                                                                                                                   |
| Mitigation  | (a) `docs/REPRODUCIBILITY.md` explains testnet vs mainnet variance. (b) Each experiment script reports observed mean ± std and links to paper claim explicitly. (c) Fall-back to Hardhat in-process for deterministic baseline. (d) Document RPC provider used (`https://rpc-amoy.polygon.technology`) for reproducibility. |
| Owner phase | F6, F10                                                                                                                                                                                                                                                                                                                     |
| Contingency | If divergence is large, run a sample on mainnet to validate, then update paper §8 numbers in a future revision.                                                                                                                                                                                                             |

### R-005 — Secret leaked to public repo

| Field       | Value                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood  | L3                                                                                                                                                                                                                                                                                                                                                                  |
| Impact      | I5 (loss of producer wallet funds, reputational damage)                                                                                                                                                                                                                                                                                                             |
| Score       | 15                                                                                                                                                                                                                                                                                                                                                                  |
| Trigger     | Author copies `.env` instead of `.env.example`, or accidentally commits a JWT/wallet key.                                                                                                                                                                                                                                                                           |
| Mitigation  | (a) `gitleaks` in CI on every push + pre-commit hook (husky). (b) `.gitignore` for `.env`, `.env.*`, `*.token`, `*.pem`, `*.key`. (c) `.env.example` is the only env file in repo. (d) `github_token.txt` already excluded at parent level (paper repo). (e) Wallet keys in repo only ever zeroed-out test keys, never real ones. (f) CODEOWNERS for `.env*` files. |
| Owner phase | F8, F9 (CI), F13                                                                                                                                                                                                                                                                                                                                                    |
| Contingency | If detected, rotate immediately, force-push history with cleaned secret (`git filter-repo`), notify GitHub for token revocation.                                                                                                                                                                                                                                    |

---

## Medium-priority (score 6–11)

### R-004 — Polygon Amoy testnet downtime

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Likelihood  | L3                                                                                 |
| Impact      | I3                                                                                 |
| Score       | 9                                                                                  |
| Trigger     | Amoy RPC outage during reviewer's reproduce attempt.                               |
| Mitigation  | Hardhat in-process fallback (`NETWORK=hardhat`); documented in REPRODUCIBILITY.md. |
| Owner phase | F8, F10                                                                            |
| Contingency | Document multi-RPC fallback (dRPC, Alchemy, Infura) for future.                    |

### R-006 — Pinata free tier exhaustion or T&C change

| Field       | Value                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood  | L2                                                                                                                                                                  |
| Impact      | I3                                                                                                                                                                  |
| Score       | 6                                                                                                                                                                   |
| Trigger     | dApp pin removed from Pinata; CID still valid but unreachable on Pinata gateway.                                                                                    |
| Mitigation  | (a) Reproducer can use local IPFS via `IPFS_PROVIDER=local`. (b) Document alternative gateways (`ipfs.io`, `dweb.link`). (c) Future: pin to web3.storage as backup. |
| Owner phase | F4, F8, F10                                                                                                                                                         |

### R-007 — IPFS gateway rate limits during demo

| Field       | Value                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Likelihood  | L3                                                                         |
| Impact      | I2                                                                         |
| Score       | 6                                                                          |
| Trigger     | `ipfs.io` rate-limits during a Lighthouse run or live demo.                |
| Mitigation  | Document multiple gateway URLs; allow override `NEXT_PUBLIC_IPFS_GATEWAY`. |
| Owner phase | F4, F10                                                                    |

### R-008 — Conflicting NPM / pnpm versions across dev machines

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Likelihood  | L3                                                                                 |
| Impact      | I2                                                                                 |
| Score       | 6                                                                                  |
| Trigger     | Developer uses npm instead of pnpm and breaks workspaces.                          |
| Mitigation  | `engines.pnpm` in root `package.json`; `preinstall` script with `only-allow pnpm`. |
| Owner phase | Bootstrap                                                                          |

### R-009 — Reviewer 1 demands full Q1 §3 defensive coverage (Mythril + fuzz + baselines)

| Field       | Value                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Likelihood  | L3 (he might)                                                                                                                                                                                                            |
| Impact      | I3 (delays publication; needs scope expansion)                                                                                                                                                                           |
| Score       | 9                                                                                                                                                                                                                        |
| Trigger     | Reviewer 1's next-round comment specifically requests baseline comparison or Mythril.                                                                                                                                    |
| Mitigation  | (a) `docs/SECURITY_ANALYSIS.md` explicitly addresses scope cut: "Mythril, fuzz, baseline comparison deferred to v2; rationale: Slither + property tests cover 95% of reachable findings". (b) Roadmap section in README. |
| Owner phase | F10                                                                                                                                                                                                                      |
| Contingency | Build the missing piece in v1.1 (effort estimate: +1 week per item).                                                                                                                                                     |

### R-010 — Producer wallet generation collisions or weak entropy

| Field       | Value                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Likelihood  | L1                                                                                                                      |
| Impact      | I5                                                                                                                      |
| Score       | 5                                                                                                                       |
| Trigger     | Hub uses `Math.random()` or weak source.                                                                                |
| Mitigation  | Use `ethers.Wallet.createRandom()` which uses Node `crypto.randomBytes`; verified by code review + Vitest entropy test. |
| Owner phase | F3                                                                                                                      |

---

## Low-priority (score < 6)

### R-011 — License compatibility issue with a transitive dep

| Score | 4 |
| Mitigation | `license-checker` in CI; documented in `docs/THIRD_PARTY.md`. |

### R-012 — Translation drift between VI and EN

| Score | 4 |
| Mitigation | Key-parity script in CI; missing key fails build. |

### R-013 — Lighthouse CI flakiness

| Score | 4 |
| Mitigation | Run 3× and take median; thresholds with margin (perf ≥ 80 not 90). |

### R-014 — `forge snapshot` flake on different OS

| Score | 4 |
| Mitigation | Standardize on `ubuntu-latest` for snapshot baseline; document in `docs/CONTRIBUTING.md`. |

### R-015 — Author OS differences (macOS vs Linux Docker)

| Score | 3 |
| Mitigation | All commands tested on macOS (author) + Ubuntu (CI); documented prereqs include Docker Desktop / Docker Engine. |

### R-016 — Zenodo deposit fails on tag push

| Score | 4 |
| Mitigation | Manual Zenodo deposit fallback documented; first run on test repo (`-test` tag) before real `v1.0.0`. |

### R-017 — Reviewer 1 detects deviation from paper notation

| Score | 6 (now medium — moving up) |
| Mitigation | Glossary locks notation; PR template asks "did you change a notation symbol?"; CI grep test fails if NatSpec mentions `keccak256`. |
| Owner phase | F1, F2, F10 |

---

## Risk-mitigation responsibility matrix

| Risk  | Mitigated by feature/phase                                       |
| ----- | ---------------------------------------------------------------- |
| R-001 | F1 (NatSpec, code), F7 (tests, Slither), F10 (SECURITY_ANALYSIS) |
| R-002 | F8 (Docker), F9 (CI quickstart), F10 (README)                    |
| R-003 | F6 (experiment scripts with reporting), F10 (REPRODUCIBILITY.md) |
| R-004 | F8 (Hardhat fallback), F10 (docs)                                |
| R-005 | F9 (gitleaks), Bootstrap (.gitignore), F13                       |
| R-006 | F4 (provider switch), F10 (docs)                                 |
| R-007 | F4 (gateway override)                                            |
| R-008 | Bootstrap (`only-allow pnpm`)                                    |
| R-009 | F10 (rationale + roadmap)                                        |
| R-010 | F3 (use ethers wallet random + entropy test)                     |
| R-011 | F9 (license-checker)                                             |
| R-012 | F11 + F9 (key parity in CI)                                      |
| R-013 | F9 (median of 3)                                                 |
| R-014 | F9 (Ubuntu snapshot baseline)                                    |
| R-015 | Bootstrap (cross-OS test)                                        |
| R-016 | F9 (test tag first)                                              |
| R-017 | F2 (notation aliases), F10 (glossary), F9 (grep test)            |
