# Security Analysis

The traceability matrix from the paper's security requirements
(SR1–SR4) down to a specific contract function, a specific test, and
a specific Architecture Decision Record. Reviewer 1 should be able to
spot-check any cell in the table below and find a passing test plus
documented rationale.

The paper text for each SR is repeated verbatim from the LaTeX source
([`requirements/sr-mapping.md`](requirements/sr-mapping.md) holds the
line ranges). The mitigation column lists the contract location, the
property test, and the ADR codifying any non-trivial choice.

## SR1 — Unforgeability

> _For any PPT adversary $\mathcal{A}$, the probability that
> $\mathcal{A}$ produces an identifier that the system accepts as
> valid for some product $p_i$, where no corresponding entry for
> $p_i$ exists in the registry $\mathcal{R}$, is negligible._
> — `frontiers.tex` lines 261–263

| Adversary attempt                            | Contract enforcement                                                                                                                  | Property / unit test                                                                                                | ADR                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Register the same `phi` twice                | [`ProductRegistry.sol:81`](../contracts/src/ProductRegistry.sol#L81) — `revert ProjectAlreadyExists(phi)`                             | [`RegisterProject.t.sol:29`](../contracts/test/unit/RegisterProject.t.sol#L29)                                      | —                                                                                          |
| Register a batch under a `phi` you don't own | [`ProductRegistry.sol:90-92`](../contracts/src/ProductRegistry.sol#L90-L92) — `revert UnauthorizedProducer`                           | [`RegisterBatch.t.sol:40`](../contracts/test/unit/RegisterBatch.t.sol#L40)                                          | —                                                                                          |
| Reuse a hash inside one batch                | [`ProductRegistry.sol:101`](../contracts/src/ProductRegistry.sol#L101) — `revert DuplicateProductHash`                                | [`RegisterBatch.t.sol:96, 110`](../contracts/test/unit/RegisterBatch.t.sol#L96)                                     | —                                                                                          |
| Forge a `sid` that maps to an existing `h`   | Impossible by SHA-256 preimage resistance; [`ProductRegistry.sol:121`](../contracts/src/ProductRegistry.sol#L121) computes `h` in-EVM | [`Hashing.t.sol:22, 68`](../contracts/test/unit/Hashing.t.sol#L22) — cross-checks against EVM precompile `0x02`     | [ADR-007](architecture/decision-log.md#adr-007--use-sha-256-not-keccak256-for-h_i--hsid_i) |
| Fuzz unregistered `sid`                      | [`ProductRegistry.sol:124`](../contracts/src/ProductRegistry.sol#L124) — `revert ProductDoesNotExist`                                 | [`SR1_Unforgeability.t.sol:32, 49`](../contracts/test/properties/SR1_Unforgeability.t.sol#L32) — fuzz `runs = 1024` | —                                                                                          |

## SR2 — Non-replayability

> _For any product $p_i$, at most one verification query for $p_i$
> may result in `AUTHENTIC`. All subsequent queries must return
> `ALREADY_VERIFIED`._
> — `frontiers.tex` line 265

| Adversary attempt              | Contract enforcement                                                                                                                  | Property / unit test                                                                                                   | ADR                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Redeem twice                   | [`ProductRegistry.sol:125`](../contracts/src/ProductRegistry.sol#L125) — `revert ProductAlreadyRedeemed`                              | [`RedeemProduct.t.sol:40`](../contracts/test/unit/RedeemProduct.t.sol#L40)                                             | —                                                                                                                                  |
| Atomically check + flip        | [`ProductRegistry.sol:124-127`](../contracts/src/ProductRegistry.sol#L124-L127) — single SSTORE inside the same tx                    | [`SR2_NonReplayability.t.sol:26`](../contracts/test/properties/SR2_NonReplayability.t.sol#L26) — fuzz `runs = 1024`    | —                                                                                                                                  |
| Race two redeems in one block  | EVM serializes calls; second tx in the same block reverts                                                                             | [`experiments/adversarial/race-redeems.ts`](../experiments/adversarial/race-redeems.ts) — runtime adversarial proof    | —                                                                                                                                  |
| Replay a transaction off-chain | Stateless — the second on-chain call still hits the `redeemed==true` branch                                                           | [`SR2_NonReplayability.t.sol:26`](../contracts/test/properties/SR2_NonReplayability.t.sol#L26) covers via state walker | [ADR-014](architecture/decision-log.md#adr-014--system-hot-wallet-not-producer-wallet-signs-redeemproduct) — redemption is gasless |
| Invariant: monotonic counter   | [`ProductRegistry.sol:128-132`](../contracts/src/ProductRegistry.sol#L128-L132) — `++totalRedeemed` unchecked but bounded by mappings | [`RegistryInvariants.t.sol:146, 154`](../contracts/test/invariants/RegistryInvariants.t.sol#L146)                      | —                                                                                                                                  |

## SR3 — Non-repudiation

> _For any product $p_i$, every verification that changes its
> registry state from unredeemed to redeemed must produce an
> immutable, timestamped, and publicly auditable record._
> — `frontiers.tex` lines 267–268

| Adversary attempt               | Contract enforcement                                                                                                     | Property / unit test                                                                                                       | ADR                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Suppress event emission         | `emit` is unconditional inside `redeemProduct`: [`ProductRegistry.sol:134`](../contracts/src/ProductRegistry.sol#L134)   | [`SR3_NonRepudiation.t.sol:29`](../contracts/test/properties/SR3_NonRepudiation.t.sol#L29) — fuzz with `vm.expectEmit`     | —                                                                                                          |
| Backdate the timestamp          | Uses `block.timestamp`, which is consensus-determined; the only freedom is `±15 s` allowed by Polygon's clock-drift rule | `SR3_NonRepudiation.t.sol` warps via `vm.warp` and asserts the event arg matches                                           | —                                                                                                          |
| Spoof the producer field        | Producer address is read from `proj.producerAddress` at emit time, not from `msg.sender`                                 | [`RedeemProduct.t.sol:17`](../contracts/test/unit/RedeemProduct.t.sol#L17) checks producer in event matches the registrant | [ADR-014](architecture/decision-log.md#adr-014--system-hot-wallet-not-producer-wallet-signs-redeemproduct) |
| Delete the event from the chain | Impossible — Polygon checkpoints to Ethereum; `eth_getLogs` is canonical                                                 | Out-of-band: reviewer queries Polygonscan directly to confirm                                                              | [ADR-008](architecture/decision-log.md#adr-008--immutable-smart-contract-no-proxy-pattern)                 |

## SR4 — Trust independence

> _Verification correctness must not depend on the honesty of
> $\mathcal{I}$. Even if compromised, $\mathcal{I}$ cannot fabricate
> valid results, alter records, or prevent independent auditing._
> — `frontiers.tex` lines 270–271

| Adversary attempt                              | Contract enforcement                                                                                                                                         | Property / unit test                                                                                                              | ADR                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Hub supplies a pre-computed hash               | The contract _ignores_ any caller-supplied hash and re-computes `sha256(sid)` itself: [`ProductRegistry.sol:121`](../contracts/src/ProductRegistry.sol#L121) | [`RedeemProduct.t.sol:78`](../contracts/test/unit/RedeemProduct.t.sol#L78) — `test_redeemProduct_hubCannotFakeHash`               | [ADR-007](architecture/decision-log.md#adr-007--use-sha-256-not-keccak256-for-h_i--hsid_i) |
| Hub returns "AUTHENTIC" without an on-chain tx | dApp links txHash to Polygonscan; reviewer can verify the event exists                                                                                       | [`experiments/adversarial/tampered-hash.ts`](../experiments/adversarial/tampered-hash.ts) — runtime proof                         | —                                                                                          |
| Hub claims a product belongs to wrong producer | `verifyProduct` returns the canonical producer from on-chain state                                                                                           | [`VerifyProduct.t.sol:35`](../contracts/test/unit/VerifyProduct.t.sol#L35) — `test_verifyProduct_afterRedeem_returnsRedeemedTrue` | —                                                                                          |
| Hub-impersonator with mismatched (phi, sid)    | Contract reverts `ProductDoesNotExist` because the SHA-256 of the wrong `sid` does not exist in `products[phi]`                                              | [`SR4_TrustIndependence.t.sol:26`](../contracts/test/properties/SR4_TrustIndependence.t.sol#L26) — fuzz with `runs = 1024`        | —                                                                                          |
| Hub serves a tampered dApp build               | dApp pinned by CID; tampering changes the CID, breaking the link in the GitHub Release notes                                                                 | Out-of-band: reviewer compares the IPFS CID in the release notes with their own `ipfs add` of the source                          | [ADR-005](architecture/decision-log.md#adr-005--ipfs-dual-provider-local-kubo-and-pinata)  |

## Slither finding allowlist

The Slither configuration ([`contracts/slither.config.json`](../contracts/slither.config.json))
excludes the following detector families:

| Detector family     | Why excluded                                                                                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `naming-convention` | The contract uses the paper's variable names verbatim (`phi`, `sid`, `h`, $\mathcal{P}$). NatSpec mirrors the paper exactly so a reviewer sees the same symbols on both sides. Mass-renaming to Slither's preferred casing would obscure the audit trail. |
| `solc-version`      | Solidity is pinned at `0.8.24` per [ADR-008](architecture/decision-log.md#adr-008--immutable-smart-contract-no-proxy-pattern); Slither warns on any non-`^0.8.0` pin but the strict pin is intentional for reproducibility.                               |
| `pragma`            | Same pin reason as above.                                                                                                                                                                                                                                 |
| `assembly`          | No assembly is used in the contract itself; the detector occasionally fires false-positives inside `forge-std` test helpers, which are filtered via `filter_paths`.                                                                                       |

The CI job rejects on `--fail-on high` ([`.github/workflows/contracts-ci.yml`](../.github/workflows/contracts-ci.yml));
the configuration also excludes `low` and `informational` findings so
the gate is calibrated to severity that matters for SR1–SR4. The last
clean Slither report is committed at [`contracts/slither-report.json`](../contracts/slither-report.json).

## Coverage and fuzz numbers

| Metric                   | Tool             | Threshold                                        | Actual (last CI run)                                                                                   |
| ------------------------ | ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Line coverage (contract) | `forge coverage` | ≥ 90% (enforced by `scripts/check-coverage.cjs`) | Reported in [`docs/review-reports/phase-1.md`](review-reports/phase-1.md)                              |
| SR1–SR4 fuzz runs        | Foundry          | 1024 per property                                | Configured via `foundry.toml [fuzz] runs = 1024`                                                       |
| Invariant runs           | Foundry          | 256 runs × 16 calls                              | Configured via `foundry.toml [invariant]`                                                              |
| Gas snapshot drift       | `forge snapshot` | ±5% tolerance                                    | Snapshot committed at [`contracts/.gas-snapshot`](../contracts/.gas-snapshot); CI fails on `>5%` drift |
| Slither severity         | Slither          | 0 high                                           | Asserted by `slither . --fail-on high` in CI                                                           |

## How to reproduce

```sh
# Smart-contract suite
cd contracts
forge test -vvv
forge coverage --report summary
forge snapshot --check --tolerance 5
slither . --config-file slither.config.json --fail-on high

# Adversarial SR1–SR4 against a running stack
pnpm exp:adversarial      # 5 scripts; non-zero exit on any expected outcome violated
```

See [`docs/REPRODUCIBILITY.md`](REPRODUCIBILITY.md) for the full
environment setup.
