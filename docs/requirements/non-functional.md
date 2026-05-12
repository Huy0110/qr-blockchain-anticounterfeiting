# Non-Functional Requirements

Aggregated NFRs across all modules. Each NFR is testable and tied back to either a paper claim, a quality bar, or a defensive concern (Reviewer 1 inspection).

---

## 1. Performance

### Smart contract

| ID     | Requirement                                                            | Source       |
| ------ | ---------------------------------------------------------------------- | ------------ |
| NF-P-1 | `registerBatch(N=100)` completes within Polygon block gas limit (~30M) | scalability  |
| NF-P-2 | `redeemProduct` gas usage < 100k                                       | gas snapshot |
| NF-P-3 | `verifyProduct` and `projectExists` are pure `view` (0 gas)            | usability    |

### Coordination Hub

| ID     | Requirement                                                                                               | Source              |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------- |
| NF-P-4 | Read-only endpoints (`/scan/public/:phi`, project list, etc.) p95 latency ≤ 200 ms (excl. blockchain RTT) | usability           |
| NF-P-5 | `POST /projects/:phi/batches` for N=100 completes in ≤ 6 s on Amoy                                        | Paper Table 3 row 1 |
| NF-P-6 | `POST /scan/private` (valid product) completes in ≤ 35 s on Amoy                                          | Paper Table 3 row 3 |
| NF-P-7 | `POST /scan/private` (invalid/redeemed) completes in ≤ 5 s                                                | Paper Table 3 row 4 |
| NF-P-8 | Hub handles ≥ 50 concurrent requests without degradation (NestJS default cluster mode if needed)          | scalability         |

### Frontends (Lighthouse)

| ID      | Requirement                                          | Source              |
| ------- | ---------------------------------------------------- | ------------------- |
| NF-P-9  | dApp public scan: Lighthouse mobile performance ≥ 85 | NFR                 |
| NF-P-10 | dApp accessibility ≥ 90                              | NFR                 |
| NF-P-11 | Management portal dashboard: Lighthouse perf ≥ 80    | NFR                 |
| NF-P-12 | Management portal accessibility ≥ 90                 | NFR                 |
| NF-P-13 | Public scan page renders within 6 s on simulated 4G  | Paper Table 3 row 2 |

---

## 2. Security

| ID      | Requirement                                                                                 | Maps to      |
| ------- | ------------------------------------------------------------------------------------------- | ------------ |
| NF-S-1  | All state-changing contract functions have access control modifiers                         | SR1          |
| NF-S-2  | `redeemProduct` computes hash on-chain, never trusts client                                 | SR4          |
| NF-S-3  | No secrets committed to repo; `.env.example` only; `gitleaks` in CI + pre-commit            | repo hygiene |
| NF-S-4  | All hub endpoints HTTPS-only in any deployed environment                                    | NFR          |
| NF-S-5  | JWT secrets ≥ 32 bytes random; rotated per deployment                                       | NFR          |
| NF-S-6  | Producer wallet private keys encrypted at rest with AES-256-GCM                             | NFR          |
| NF-S-7  | bcrypt with ≥ 12 rounds for password hashing                                                | NFR          |
| NF-S-8  | Rate limiting on `/auth/login` (5/min per IP per email) and `/scan/private` (60/min per IP) | NFR          |
| NF-S-9  | CORS strictly configured (whitelist of dApp + management portal origins)                    | NFR          |
| NF-S-10 | Helmet headers configured (CSP, HSTS, X-Frame-Options)                                      | NFR          |
| NF-S-11 | Wallet private keys never logged (verified via CI grep test)                                | NFR          |
| NF-S-12 | File upload MIME type sniffed (magic bytes), not just trusted from header                   | NFR          |
| NF-S-13 | Slither in CI: 0 high-severity findings                                                     | §3 defensive |
| NF-S-14 | Property tests for SR1–SR4 with fuzz-runs ≥ 1000 in CI                                      | §3 defensive |
| NF-S-15 | Dependency audit (`pnpm audit --audit-level high`) in CI                                    | NFR          |
| NF-S-16 | Mainnet deploy gated behind manual approval; never auto-deployed                            | NFR          |

---

## 3. Scalability

| ID      | Requirement                                                                       | Maps to |
| ------- | --------------------------------------------------------------------------------- | ------- |
| NF-Sc-1 | `registerBatch` cap N ≤ 500 to stay under block gas limit                         | NFR     |
| NF-Sc-2 | MongoDB indexes on `projectId`, `ownerProducerId`, `email`                        | NFR     |
| NF-Sc-3 | Hub stateless; horizontally scalable behind load balancer (no in-memory sessions) | NFR     |
| NF-Sc-4 | IPFS pinning batched (one CID per file, not one per upload chunk)                 | NFR     |
| NF-Sc-5 | RPC provider configurable; rate-limit handling with exponential backoff           | NFR     |
| NF-Sc-6 | dApp static assets cacheable indefinitely (CID-addressed)                         | NFR     |
| NF-Sc-7 | `verification_logs` collection has TTL or partitioning strategy documented        | NFR     |

---

## 4. Reliability

| ID     | Requirement                                                                                                                              | Maps to       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| NF-R-1 | Hub auto-recovers from RPC failures with exponential backoff (3 retries)                                                                 | NFR           |
| NF-R-2 | Hub `/health` returns blockchain connectivity status                                                                                     | observability |
| NF-R-3 | Failed transactions are surfaced in logs with full context (no swallowed errors)                                                         | NFR           |
| NF-R-4 | Idempotent operations: `POST /scan/private` for already-redeemed → returns `ALREADY_VERIFIED` instead of error                           | UX            |
| NF-R-5 | Idempotent seed: re-running `pnpm seed` doesn't duplicate                                                                                | NFR           |
| NF-R-6 | Block reorg handling documented (Polygon finality ~12 blocks); user-facing copy clarifies "verified" means 1-conf, "final" after 12-conf | NFR           |

---

## 5. Reproducibility (Q1-grade requirement)

| ID      | Requirement                                                                                                  | Maps to |
| ------- | ------------------------------------------------------------------------------------------------------------ | ------- |
| NF-Rp-1 | One-command bring-up: `docker compose up` brings all services healthy in ≤ 60 s                              | NFR     |
| NF-Rp-2 | Pinned dependencies: `pnpm-lock.yaml`, `foundry.lock` (if present), Docker base image SHA                    | NFR     |
| NF-Rp-3 | Each experiment script logs deterministic `RUN_ID` and writes under `results/<RUN_ID>/`                      | NFR     |
| NF-Rp-4 | README quickstart leads to first verified product in ≤ 15 min on a clean Linux VM                            | NFR     |
| NF-Rp-5 | All paper Tables 3, 4 + Figure 1 mapped to a reproduction command in `docs/REPRODUCIBILITY.md`               | NFR     |
| NF-Rp-6 | Pre-computed sample results committed under `results/example-RUN_ID/` so reviewer can browse without running | NFR     |
| NF-Rp-7 | Default network = Amoy testnet (no mainnet deployment required by author)                                    | NFR     |
| NF-Rp-8 | All scripts work offline against `NETWORK=hardhat` for CI                                                    | CI      |

---

## 6. Maintainability

| ID     | Requirement                                                                       | Maps to         |
| ------ | --------------------------------------------------------------------------------- | --------------- |
| NF-M-1 | TypeScript `strict: true` + `noUncheckedIndexedAccess: true` across all TS code   | code quality    |
| NF-M-2 | ESLint config consistent across workspaces (`@typescript-eslint/strict`)          | code quality    |
| NF-M-3 | Prettier with shared config                                                       | code quality    |
| NF-M-4 | Solhint for Solidity                                                              | code quality    |
| NF-M-5 | Conventional Commits enforced via commitlint + husky                              | code quality    |
| NF-M-6 | No file > 400 lines (refactor at threshold)                                       | code quality    |
| NF-M-7 | NatSpec on every external contract function with paper Algorithm + line reference | maintainability |
| NF-M-8 | OpenAPI auto-generated from NestJS decorators; CI fails if mismatch               | maintainability |

---

## 7. Accessibility (WCAG 2.1 AA)

| ID     | Requirement                                                  | Maps to    |
| ------ | ------------------------------------------------------------ | ---------- |
| NF-A-1 | Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text | WCAG 1.4.3 |
| NF-A-2 | All images have meaningful `alt` text                        | WCAG 1.1.1 |
| NF-A-3 | Forms keyboard-navigable; visible focus indicators           | WCAG 2.1.1 |
| NF-A-4 | Tap targets ≥ 44×44 px on mobile                             | WCAG 2.5.5 |
| NF-A-5 | Page language declared via `<html lang>`                     | WCAG 3.1.1 |
| NF-A-6 | Lighthouse a11y score ≥ 90 on key pages                      | NFR        |
| NF-A-7 | axe-core scan in CI for critical violations                  | NFR        |
| NF-A-8 | Dark mode supported (Tailwind `dark:` variants)              | UX         |

---

## 8. Internationalization

| ID     | Requirement                                                  | Maps to |
| ------ | ------------------------------------------------------------ | ------- |
| NF-I-1 | Default locale `vi`; secondary `en`; both apps               | NFR     |
| NF-I-2 | All user-visible strings keyed (no hard-coded JSX)           | NFR     |
| NF-I-3 | Date / number formatting via `Intl` + locale                 | NFR     |
| NF-I-4 | Locale persisted in localStorage / cookie                    | NFR     |
| NF-I-5 | Key parity script in CI: missing key in either locale → fail | NFR     |
| NF-I-6 | RTL support not required (VI + EN only)                      | scope   |

---

## 9. Privacy

| ID      | Requirement                                                                            | Maps to       |
| ------- | -------------------------------------------------------------------------------------- | ------------- |
| NF-Pv-1 | Consumer flow has zero PII collection                                                  | paper §5.3    |
| NF-Pv-2 | No analytics tracker on dApp                                                           | paper §5.3    |
| NF-Pv-3 | Producer email + name stored; no other PII                                             | minimization  |
| NF-Pv-4 | `verification_logs` contains only `phi`, `h`, outcome, timestamp — no IP / consumer ID | paper §5.3    |
| NF-Pv-5 | Producer can delete their account; soft-delete projects (audit retained)               | GDPR-friendly |

---

## 10. Observability

| ID     | Requirement                                                                                   | Maps to |
| ------ | --------------------------------------------------------------------------------------------- | ------- |
| NF-O-1 | Structured JSON logs (Pino) with request ID propagation                                       | NFR     |
| NF-O-2 | `/metrics` exposes: HTTP req count + latency, blockchain RPC errors, batch tx success/failure | NFR     |
| NF-O-3 | `/health` reports: hub status, MongoDB connectivity, RPC connectivity, IPFS connectivity      | NFR     |
| NF-O-4 | Audit log persists actor, action, target, timestamp, IP for compliance                        | NFR     |
| NF-O-5 | Slow query log (Mongo > 100ms)                                                                | NFR     |

---

## 11. Compliance

| ID      | Requirement                                                                                 | Maps to |
| ------- | ------------------------------------------------------------------------------------------- | ------- |
| NF-Co-1 | License: MIT (SPDX)                                                                         | F13     |
| NF-Co-2 | All third-party deps are MIT/Apache-2.0/BSD-compatible                                      | NFR     |
| NF-Co-3 | No GPL / AGPL transitive deps                                                               | NFR     |
| NF-Co-4 | Dependency license inventory in `docs/THIRD_PARTY.md` (auto-generated by `license-checker`) | NFR     |
