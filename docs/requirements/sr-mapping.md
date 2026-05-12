# Traceability Matrix — Paper SR1–SR4 + R1–R3 → Acceptance Criteria

Every paper requirement is traceable to ≥ 1 acceptance criterion in the feature specs. This document is the centerpiece of `docs/SECURITY_ANALYSIS.md` (which will mature in Phase 9 with concrete file:line references after implementation).

---

## SR1 — Unforgeability

> _For any PPT adversary $\mathcal{A}$, the probability that $\mathcal{A}$ produces an identifier that the system accepts as valid for some product $p_i$, where no corresponding entry for $p_i$ exists in the registry $\mathcal{R}$, is negligible._
> — `frontiers.tex` lines 261–263

| Acceptance criterion | Feature | Mechanism                                                                                          |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| AC-SC-2              | F1      | Second `registerProject(phi)` for same `phi` reverts                                               |
| AC-SC-3              | F1      | `registerBatch` from non-producer reverts                                                          |
| AC-SC-5              | F1      | `registerBatch` with duplicate hash reverts                                                        |
| AC-SC-8              | F1      | `redeemProduct` with unregistered `sid` reverts with `ProductDoesNotExist`                         |
| AC-SC-12             | F1      | Contract uses SHA-256 (preimage-resistant) per paper                                               |
| AC-SA-2              | F7      | Property test SR1 — ∀ unregistered sid → revert (fuzz N≥1000)                                      |
| AC-CH-4              | F3      | Producer A cannot mutate B's projects (off-chain enforcement matches on-chain)                     |
| AC-CH-6              | F3      | `GET /scan/public/:phi` returns 404 for unregistered project (after `projectExists` returns false) |
| AC-CH-10             | F3      | `POST /scan/private` with unknown sid returns `COUNTERFEIT`                                        |

---

## SR2 — Non-replayability

> _For any product $p_i$, at most one verification query for $p_i$ may result in `AUTHENTIC`. All subsequent queries must return `ALREADY_VERIFIED`._
> — `frontiers.tex` lines 265

| Acceptance criterion | Feature | Mechanism                                                                                    |
| -------------------- | ------- | -------------------------------------------------------------------------------------------- |
| AC-SC-6              | F1      | `redeemProduct` flips `redeemed=true` atomically + emits event                               |
| AC-SC-7              | F1      | Second `redeemProduct` with same sid reverts with `ProductAlreadyRedeemed`                   |
| AC-SC-16             | F1      | Property test: after redeemProduct, verifyProduct.redeemed == true                           |
| AC-SC-17             | F1      | Property test: second redeemProduct always reverts                                           |
| AC-SA-3              | F7      | Property test SR2 — fuzz N≥1000                                                              |
| AC-SA-6              | F7      | Stateful invariant: redeemed count monotonic                                                 |
| AC-CH-9              | F3      | `POST /scan/private` with already-redeemed sid returns `ALREADY_VERIFIED` (no tx, fast path) |
| AC-DA-3              | F4      | Private scan ALREADY_VERIFIED renders within 5 s                                             |

---

## SR3 — Non-repudiation

> _For any product $p_i$, every verification that changes its registry state from unredeemed to redeemed must produce an immutable, timestamped, and publicly auditable record._
> — `frontiers.tex` lines 267–268

| Acceptance criterion | Feature | Mechanism                                                                  |
| -------------------- | ------- | -------------------------------------------------------------------------- |
| AC-SC-1              | F1      | `registerProject` emits `ProjectCreated`                                   |
| AC-SC-6              | F1      | `redeemProduct` emits `ProductRedeemed(phi, h, producer, block.timestamp)` |
| AC-SC-19             | F1      | Property test: timestamp == block.timestamp                                |
| AC-SA-4              | F7      | Property test SR3 — fuzz N≥1000 with `vm.expectEmit`                       |
| AC-CH-8              | F3      | `POST /scan/private` returns AUTHENTIC with txHash + event args            |
| AC-DA-5              | F4      | TX hash links to Polygonscan and resolves to real ProductRedeemed event    |
| AC-DOC-5             | F10     | SECURITY_ANALYSIS.md table SR3 → contract function:line → test:line        |

---

## SR4 — Trust independence

> _Verification correctness must not depend on the honesty of $\mathcal{I}$. Even if compromised, $\mathcal{I}$ cannot fabricate valid results, alter records, or prevent independent auditing._
> — `frontiers.tex` lines 270–271

| Acceptance criterion | Feature | Mechanism                                                                                              |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| AC-SC-10             | F1      | `verifyProduct` returns canonical state regardless of caller                                           |
| AC-SC-12             | F1      | Contract computes `h = sha256(sid)` internally — never trusts client/hub-supplied hash                 |
| AC-SC-18             | F1      | Property test: malicious caller cannot fabricate `verifyProduct(phi, h).redeemed = true`               |
| AC-SA-5              | F7      | Property test SR4 — hub-impersonator with mismatched `(phi, sid)` always reverts                       |
| AC-CH-11             | F3      | Mutation test: hub patched to lie still cannot make reviewer believe AUTHENTIC (contract is canonical) |
| AC-DA-9              | F4      | dApp on IPFS — content-addressed; can't be tampered without changing CID                               |
| AC-DOC-4             | F10     | THREAT_MODEL.md quotes paper §3.2 and explains how `I` is constrained                                  |

---

## R1 — Cost-effectiveness and Deployability

> _The mechanism must minimize manufacturing and operational costs by relying on widely available, low-cost components. It should integrate seamlessly into existing production and distribution workflows without requiring specialized hardware or significant process modifications._
> — `frontiers.tex` lines 279–280

| Acceptance criterion | Feature | Mechanism                                                       |
| -------------------- | ------- | --------------------------------------------------------------- |
| AC-EX-7              | F6      | `cost-analysis` script reproduces Paper Table 4 (~$0.001/tx)    |
| AC-DOC-6             | F10     | REPRODUCIBILITY.md cites Paper Table 4                          |
| AC-DA-12             | F4      | dApp works from `ipfs.io/ipfs/<CID>/` — no specialized hosting  |
| AC-DA-6, AC-DA-7     | F4      | dApp usable on common smartphone viewports (iPhone SE, Pixel 5) |
| AC-MP-5              | F5      | Batch wizard generates QR for printing on standard packaging    |
| AC-DO-1              | F8      | `docker compose up` — single command brings up infrastructure   |

---

## R2 — Performance and Scalability

> _The mechanism must support high volumes of product registration and verification requests with low latency. In particular, it should enable efficient batch registration for producers while maintaining responsive verification for end users._
> — `frontiers.tex` lines 281–282

| Acceptance criterion | Feature | Mechanism                                                               |
| -------------------- | ------- | ----------------------------------------------------------------------- |
| AC-SC-4              | F1      | `registerBatch` cap N ≤ 500 (block-gas-limit safe)                      |
| AC-SC-20             | F1      | Gas snapshot: registerBatch(N=100) within 30M gas                       |
| AC-EX-1, AC-EX-2     | F6      | Performance experiments reproduce Paper Table 3 row 1 (5 s for 100 IDs) |
| AC-EX-4..AC-EX-6     | F6      | Performance experiments reproduce Paper Table 3 rows 2–4                |
| AC-CH-5              | F3      | Hub batch endpoint completes in ≤ 6 s on Amoy                           |
| AC-CH-7..AC-CH-10    | F3      | Hub scan endpoints meet latency targets                                 |
| NF-P-4               | NFR     | Read-only endpoints p95 ≤ 200 ms                                        |
| NF-P-8               | NFR     | Hub handles ≥ 50 concurrent reqs                                        |
| NF-Sc-1..NF-Sc-7     | NFR     | Scalability constraints documented and enforced                         |

---

## R3 — User-oriented Accessibility

> _The authentication process must be simple and accessible to end users. Consumers should be able to verify product authenticity through standard interactions, such as scanning a QR code, without requiring specialized devices, dedicated applications, or technical expertise._
> — `frontiers.tex` lines 283

| Acceptance criterion | Feature | Mechanism                                   |
| -------------------- | ------- | ------------------------------------------- |
| AC-DA-1              | F4      | Public scan within 6 s on 4G                |
| AC-DA-2              | F4      | Private scan AUTHENTIC within 35 s          |
| AC-DA-6, AC-DA-7     | F4      | Mobile-first; iPhone SE + Pixel 5 viewports |
| AC-DA-8              | F4      | Language toggle (VI/EN) without round-trip  |
| AC-DA-10             | F4      | Lighthouse mobile perf ≥ 85                 |
| AC-DA-11             | F4      | Lighthouse a11y ≥ 90                        |
| NF-A-1..NF-A-7       | NFR     | WCAG 2.1 AA                                 |
| NF-A-4               | NFR     | Tap targets ≥ 44×44 px                      |

---

## Summary table — coverage

| Paper requirement                       | # of acceptance criteria mapped | Coverage |
| --------------------------------------- | ------------------------------- | -------- |
| SR1 — Unforgeability                    | 9                               | ✅       |
| SR2 — Non-replayability                 | 8                               | ✅       |
| SR3 — Non-repudiation                   | 7                               | ✅       |
| SR4 — Trust independence                | 7                               | ✅       |
| R1 — Cost-effectiveness & Deployability | 6                               | ✅       |
| R2 — Performance & Scalability          | 9                               | ✅       |
| R3 — User-oriented Accessibility        | 8                               | ✅       |

Every paper requirement has multiple acceptance criteria backing it across smart contract, hub, frontends, experiments, and tests. This is the audit trail Reviewer 1 will follow.
