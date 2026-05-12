# Threat Model

This document mirrors §3.2 of the paper _"A Dual-QR Blockchain-Based
Authentication Mechanism for Agricultural Anti-Counterfeiting"_ and
maps each adversarial capability to the code-level mechanism that
neutralizes it. Reviewer 1 can use this as the index into
[`docs/SECURITY_ANALYSIS.md`](SECURITY_ANALYSIS.md).

## Paper §3.2 — verbatim

The block below is reproduced from `frontiers.tex` lines 209–229
without modification. Any deviation between this text and the LaTeX
source is a bug; the LaTeX is canonical.

> ### Threat Model and Assumptions
>
> We consider an adversary $\mathcal{A}$ operating in a partially
> trusted environment. The adversary is modeled as a probabilistic
> polynomial-time (PPT) entity with the following capabilities.
>
> _Capabilities._
>
> - $\mathcal{A}$ can observe and duplicate any identifier that is
>   publicly visible on product packaging.
> - $\mathcal{A}$ can manufacture counterfeit packaging and attach
>   copied or fabricated identifiers.
> - $\mathcal{A}$ can compromise the intermediary $\mathcal{I}$,
>   gaining the ability to intercept, delay, or fabricate responses
>   to consumer queries.
> - $\mathcal{A}$ can read all public records stored in the system
>   registry.
>
> _Assumptions._
>
> - Standard cryptographic primitives are secure, i.e., $\mathcal{A}$
>   cannot invert one-way hash functions or forge digital signatures
>   in polynomial time.
> - The registry, once updated, is immutable and cannot be altered
>   retroactively.
> - Certain identifiers may be physically concealed within product
>   packaging and are inaccessible prior to package opening.
>
> The final assumption is physical rather than cryptographic. It may
> be violated if an adversary can open and reseal packaging without
> detection, for example during supply chain interception. This
> limitation is discussed further in Section 5 (Discussion).

## Trust boundaries

| Boundary                               | Trusted                | Untrusted                                                |
| -------------------------------------- | ---------------------- | -------------------------------------------------------- |
| On-chain `ProductRegistry` state       | Polygon validator set  | The intermediary $\mathcal{I}$ (coordination hub)        |
| `block.timestamp` and `msg.sender`     | EVM consensus          | Anything the hub returns to the consumer dApp            |
| `sha256(sid)` precompile (address 0x2) | EVM consensus          | Any hash claimed by the hub or any off-chain code path   |
| The producer's signed transaction      | Producer's private key | The plaintext fields a producer types into the portal UI |

The implementation's load-bearing rule: **the smart contract is the
oracle of truth for SR1–SR4**. The hub can lie, the dApp can be served
from a malicious gateway, the producer's portal can be phished — none
of those changes which (`phi`, `h`) pairs the contract considers
`exists=true` or `redeemed=true`. A reviewer following the
verification flow on Polygonscan against a `ProductRedeemed` event
log gets the canonical answer.

## Capability → mitigation map

The table below maps each capability the paper grants to
$\mathcal{A}$ to the specific code-level mechanism that defeats it.
Concrete file/line references live in
[`docs/SECURITY_ANALYSIS.md`](SECURITY_ANALYSIS.md).

| Capability                                                    | Defeated by                                                                                                                                                       | SR    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Duplicate publicly-visible identifier (the project ID `phi`)  | `phi` is metadata only. Verification requires the inner `sid`, which is concealed until the consumer opens the package.                                           | SR1   |
| Fabricate a counterfeit identifier                            | `redeemProduct` looks up `sha256(sid)` in `products[phi]`; a fabricated `sid` produces a hash not in the mapping and reverts `ProductDoesNotExist`.               | SR1   |
| Reuse a once-valid identifier                                 | First successful `redeemProduct` flips `redeemed=true` atomically inside the same transaction. The second call reverts `ProductAlreadyRedeemed`.                  | SR2   |
| Compromise the intermediary $\mathcal{I}$ to fake "AUTHENTIC" | The contract never trusts a hub-supplied hash — it computes `sha256(sid)` in-EVM via precompile `0x02`. Reviewers cross-check the txHash on Polygonscan directly. | SR4   |
| Compromise $\mathcal{I}$ to suppress "ALREADY_VERIFIED"       | The `ProductRedeemed` event is emitted on-chain; any reviewer (or future re-scanner) sees it independently via Polygonscan.                                       | SR4   |
| Read all public registry records                              | The registry exposes only `(exists, redeemed, producer)` per `(phi, h)`. The plaintext `sid` is never on-chain; without `sid` you can't construct a valid scan.   | SR1   |
| Replay an old transaction                                     | Each `redeemProduct` mutates state idempotent-once; a replay re-enters the `redeemed==true` branch and reverts.                                                   | SR2   |
| Forge a `ProductRedeemed` event                               | Events are emitted by the contract, signed by the validator set. Only `redeemProduct` (callable by anyone but state-guarded) can produce one.                     | SR2/3 |
| Tamper with the dApp build                                    | The dApp is pinned to IPFS with the CID published in the GitHub Release notes; tampering changes the CID.                                                         | R3    |

## Assumptions, restated and code-enforced

| Assumption                  | Code-level realization                                                                                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crypto primitives secure    | `sha256` via EVM precompile `0x02`; ECDSA on secp256k1 via standard `ethers.js v6` signers. No custom crypto.                                                                                                                                                                             |
| Registry is immutable       | `ProductRegistry` is deployed as a regular (non-proxy) contract per [ADR-008](architecture/decision-log.md#adr-008--immutable-smart-contract-no-proxy-pattern); no `selfdestruct`, no upgrade path; all state-mutating functions are append-only except for the boolean `redeemed` flag.  |
| Some identifiers are hidden | `sid` is generated inside the management portal's batch wizard ([`apps/management-portal/src/components/batches/BatchWizard.tsx`](../apps/management-portal/src/components/batches/BatchWizard.tsx)), printed under the package seal, and never transmitted to the contract until redeem. |

## Limitations explicitly accepted

The paper acknowledges (final paragraph of §3.2) that the **physical
seal assumption** is the threat model's load-bearing weakness — an
adversary who can open and reseal packaging without detection can
read the inner `sid` and redeem before the legitimate consumer. The
implementation does not attempt to detect this scenario; the mitigation
is procedural (tamper-evident packaging, supply chain custody
controls), discussed in §5 of the paper.

## Out of scope

The following are intentionally **not** part of this threat model:

- **Denial of service** against the hub or against the Polygon RPC
  provider. The protocol is designed to recover gracefully (reviewers
  can fall back to Polygonscan directly), but availability is not a
  paper-tracked security requirement.
- **Producer-key compromise.** If a producer's wallet key leaks, the
  attacker can register fake batches under that producer's `phi`s.
  Mitigated by server-managed wallets encrypted with AES-256-GCM per
  [ADR-004](architecture/decision-log.md#adr-004--producer-wallets-server-managed-encrypted-at-rest);
  not modeled as $\mathcal{A}$.
- **MEV / transaction reordering.** `redeemProduct` is single-write;
  the `race-redeems` adversarial experiment
  ([`experiments/adversarial/race-redeems.ts`](../experiments/adversarial/race-redeems.ts))
  demonstrates that even with two redeems in the same block exactly
  one succeeds, which is the SR2 property.

## Risk register cross-references

Project-level risks (R-001 … R-014) live in
[`docs/requirements/risk-register.md`](requirements/risk-register.md).
The risks most directly tied to this threat model are:

- **R-001** (Reviewer 1 finds a smart-contract gap) — mitigated by SR
  fuzz tests, NatSpec, Slither, and the table in
  [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md).
- **R-003** (Performance numbers diverge from Table 3) — not a
  security risk per se, tracked in
  [REPRODUCIBILITY.md](REPRODUCIBILITY.md).
- **R-005** (Secret leaked to public repo) — mitigated by gitleaks +
  husky + `.gitignore` rules; never granted as an $\mathcal{A}$
  capability because the producer's wallet is server-side and not in
  the repo.
