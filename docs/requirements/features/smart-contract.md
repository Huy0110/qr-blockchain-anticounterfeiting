# Feature F1+F7 — Smart Contract `ProductRegistry.sol`

**Module:** `contracts/`
**Priority:** P0 (blocks every other module)
**Paper section:** §7.1 (lines 846–872), Algorithms 1–3 (lines 509–689), Notation table (lines 1346–1409).

---

## User stories

- **US-SC-1.** As the **producer's wallet**, I want to register a unique project identifier `phi` so that I become the only address authorized to add product hashes to that project. _Algorithm 1 line 5._
- **US-SC-2.** As the **producer's wallet**, I want to register a batch of up to 500 hashed identifiers `[h_1..h_n]` for one of my projects so that consumers can later verify products against immutable on-chain records. _Algorithm 1 line 14._
- **US-SC-3.** As the **Coordination Hub `I`**, I want to call `redeemProduct(phi, sid)` so that the smart contract — not me — verifies the product. _Algorithm 3 phase 2._
- **US-SC-4.** As a **consumer dApp**, I want to read `verifyProduct(phi, h)` cheaply (no gas) before any transaction so that I can short-circuit invalid scans. _Algorithm 3 phase 1._
- **US-SC-5.** As a **consumer dApp**, I want to read `projectExists(phi)` cheaply (no gas) on a public scan so that I can show project metadata only for registered projects. _Algorithm 2._
- **US-SC-6.** As a **reviewer**, I want every redemption to emit a timestamped `ProductRedeemed` event so that I can independently audit the history with a blockchain explorer. _Paper SR3._
- **US-SC-7.** As a **reviewer**, I want the contract source code documented in NatSpec linking each function to its paper Algorithm and line, so that I can verify the implementation matches the paper.

---

## Detailed requirements

### Storage

```solidity
struct Project {
    address producerAddress;   // addr_P from paper
    bool exists;
}
struct ProductRecord {
    bool exists;
    bool redeemed;
}

mapping(bytes32 => Project) private projects;                                  // phi -> Project
mapping(bytes32 => mapping(bytes32 => ProductRecord)) private products;       // phi -> h_i -> ProductRecord
```

`bytes32` for `phi` and `h_i` (= `sha256(sid_i)`) per paper notation §7.1.

### Functions

| Function                                                                                            | Paper         | Visibility    | Access                                             | Reverts                                                                                           |
| --------------------------------------------------------------------------------------------------- | ------------- | ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `registerProject(bytes32 phi)`                                                                      | Alg.1 line 5  | external      | none (any address)                                 | if `projects[phi].exists`                                                                         |
| `registerBatch(bytes32 phi, bytes32[] hashes)`                                                      | Alg.1 line 14 | external      | only `projects[phi].producerAddress == msg.sender` | if N=0, N>500, project absent, or any `hashes[i]` already in `products[phi]`                      |
| `redeemProduct(bytes32 phi, bytes calldata sid)`                                                    | Alg.3 phase 2 | external      | none                                               | if project absent, if `h = sha256(sid)` not in `products[phi]`, or if `products[phi][h].redeemed` |
| `verifyProduct(bytes32 phi, bytes32 h) view returns (bool exists, bool redeemed, address producer)` | Alg.3 phase 1 | external view | none                                               | never reverts; returns zero-tuple if absent                                                       |
| `projectExists(bytes32 phi) view returns (bool)`                                                    | Alg.2         | external view | none                                               | never reverts                                                                                     |

### Events

```solidity
event ProjectCreated(bytes32 indexed phi, address indexed producer);
event ProductsRegistered(bytes32 indexed phi, uint256 count);
event ProductRedeemed(
  bytes32 indexed phi,
  bytes32 indexed h,
  address indexed producer,
  uint256 timestamp
);
```

`ProductRedeemed` indexes `phi`, `h`, and `producer` so reviewers can filter on Polygonscan.

### Errors (custom errors per Solidity 0.8.x best practice)

```solidity
error ProjectAlreadyExists(bytes32 phi);
error ProjectDoesNotExist(bytes32 phi);
error UnauthorizedProducer(bytes32 phi, address caller);
error BatchTooLarge(uint256 size);
error EmptyBatch();
error DuplicateProductHash(bytes32 phi, bytes32 h);
error ProductDoesNotExist(bytes32 phi, bytes32 h);
error ProductAlreadyRedeemed(bytes32 phi, bytes32 h);
```

### Hash computation

Use Solidity's `sha256()` precompile (NOT `keccak256()`) inside `redeemProduct`:

```solidity
bytes32 h = sha256(sid);
```

NatSpec must call out the deviation from EVM default:

> /// @dev Uses SHA-256 per paper §7.1 (NOT keccak256). Marginal gas cost ~60 over keccak; required for cross-language interoperability with the producer's local CSPRNG → SHA-256 hashing.

### Constants

- `MAX_BATCH_SIZE = 500` (constant, not configurable; matches gathered-req §3.1).

### Solidity version

`pragma solidity 0.8.24;` (locked version, no `^`).

### NatSpec template (per function)

```solidity
/// @notice Register a new project on-chain. Implements paper Algorithm 1, line 5.
/// @param phi Unique project identifier (bytes32)
/// @dev Reverts if `phi` already exists. Emits {ProjectCreated}.
/// @custom:security Enforces SR1 (unforgeability) by binding the producer wallet.
function registerProject(bytes32 phi) external { ... }
```

---

## Edge cases

| #     | Scenario                                                              | Expected behavior                                                                                                           |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| EC-1  | Two producers race to register the same `phi`                         | First tx wins; second reverts with `ProjectAlreadyExists`.                                                                  |
| EC-2  | Producer A calls `registerBatch` for project owned by B               | Reverts with `UnauthorizedProducer`.                                                                                        |
| EC-3  | `registerBatch` with N=0                                              | Reverts with `EmptyBatch`.                                                                                                  |
| EC-4  | `registerBatch` with N=501                                            | Reverts with `BatchTooLarge(501)`.                                                                                          |
| EC-5  | `registerBatch` includes `h_i` already in `products[phi]`             | Whole tx reverts with `DuplicateProductHash`.                                                                               |
| EC-6  | `redeemProduct` with `sid` whose hash isn't registered                | Reverts with `ProductDoesNotExist`.                                                                                         |
| EC-7  | `redeemProduct` called twice with same `sid`                          | First succeeds + emits event; second reverts with `ProductAlreadyRedeemed`.                                                 |
| EC-8  | `redeemProduct` for a `phi` that doesn't exist                        | Reverts with `ProjectDoesNotExist`.                                                                                         |
| EC-9  | Hub `I` tampers: submits `redeemProduct` with mismatched `(phi, sid)` | Reverts with `ProductDoesNotExist` because `sha256(sid) ∉ products[phi]`.                                                   |
| EC-10 | Reentrancy attempt during `redeemProduct`                             | Cannot reenter — function is a single state write + event; no external call. Document in NatSpec.                           |
| EC-11 | Block reorg after `redeemProduct` succeeds                            | Standard Polygon finality applies; document in REPRODUCIBILITY.md (waits ~12 blocks for finality).                          |
| EC-12 | Empty `sid` in `redeemProduct`                                        | `sha256("")` is well-defined; if it happens to match an entry, it's a producer config error. Document, do not special-case. |

---

## Acceptance criteria

| #        | Criterion                                                                                                                       | Maps to         | Verified by                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| AC-SC-1  | `registerProject` emits `ProjectCreated` and binds `msg.sender` as producer                                                     | SR3             | Hardhat unit test                                 |
| AC-SC-2  | Second `registerProject(phi)` for same `phi` reverts                                                                            | SR1             | Foundry property test                             |
| AC-SC-3  | `registerBatch` from non-producer reverts                                                                                       | SR1             | Hardhat unit test                                 |
| AC-SC-4  | `registerBatch` with N>500 reverts with `BatchTooLarge`                                                                         | scalability     | Hardhat unit test                                 |
| AC-SC-5  | `registerBatch` with duplicate hash within same project reverts                                                                 | SR1             | Hardhat unit test                                 |
| AC-SC-6  | `redeemProduct` with valid `(phi, sid)` flips `redeemed=true` AND emits `ProductRedeemed(phi, h, producer, block.timestamp)`    | SR2, SR3        | Foundry property test                             |
| AC-SC-7  | Second `redeemProduct` with same `sid` reverts with `ProductAlreadyRedeemed`                                                    | SR2             | Foundry property test                             |
| AC-SC-8  | `redeemProduct` with `sid` whose hash never registered reverts with `ProductDoesNotExist`                                       | SR1             | Hardhat unit test                                 |
| AC-SC-9  | `verifyProduct` is `view`, returns `(false, false, address(0))` for absent `(phi, h)`                                           | usability       | Hardhat unit test                                 |
| AC-SC-10 | `verifyProduct` returns `(true, true, addr_P)` after a successful `redeemProduct`                                               | SR4             | Hardhat unit test                                 |
| AC-SC-11 | `projectExists` is `view`, returns `false` for unregistered project                                                             | usability       | Hardhat unit test                                 |
| AC-SC-12 | Contract uses `sha256()` precompile inside `redeemProduct` (verified via bytecode disassembly snapshot test)                    | paper §7.1      | Foundry test snapshot                             |
| AC-SC-13 | NatSpec references paper algorithm + line for every external function                                                           | reproducibility | Manual review checklist in `SECURITY_ANALYSIS.md` |
| AC-SC-14 | Slither runs in CI with 0 high-severity findings; medium findings documented in `slither.config.json`                           | §3 defensive    | CI green                                          |
| AC-SC-15 | Line coverage ≥ 90% (Foundry `forge coverage` report)                                                                           | §3 defensive    | CI artifact                                       |
| AC-SC-16 | Property test: ∀ `(phi, sid)`, after `redeemProduct(phi, sid)`, `verifyProduct(phi, sha256(sid)).redeemed == true`              | SR2             | Foundry invariant test                            |
| AC-SC-17 | Property test: ∀ `(phi, sid)`, second `redeemProduct(phi, sid)` always reverts                                                  | SR2             | Foundry invariant test                            |
| AC-SC-18 | Property test: a malicious hub cannot make `verifyProduct(phi, h).redeemed = true` for any `(phi, h)` not previously registered | SR1, SR4        | Foundry invariant test                            |
| AC-SC-19 | Property test: each `ProductRedeemed` event has `timestamp == block.timestamp` of containing block                              | SR3             | Foundry invariant test                            |
| AC-SC-20 | Gas snapshot test: `registerBatch` with N=100 fits within 30M gas (Polygon block limit ~30M)                                    | scalability     | Foundry gas snapshot                              |

---

## Non-goals

- No upgradeability proxy in v1 (immutable).
- No pausing / kill switch (paper makes no such claim).
- No on-chain metadata storage (off-chain in MongoDB).
- No multi-sig producer wallets (single EOA per producer).
- No revocation of redeemed products (cannot un-redeem).

---

## Test plan

- **Unit tests (Hardhat + Mocha):** ~25 tests covering each function, each edge case EC-1…EC-12.
- **Property tests (Foundry):** 5–8 invariants asserting SR1–SR4 directly.
- **Gas snapshot tests:** `forge snapshot` to lock gas costs; CI fails if gas regresses by >5%.
- **Slither config:** `slither.config.json` with `--exclude-low` and a documented allowlist for medium findings.
- **Manual audit checklist:** `docs/SECURITY_ANALYSIS.md` with a per-function audit against SWC registry.

---

## Out-of-scope (deferred)

- Mythril deep symbolic execution (v2).
- Echidna fuzzing campaigns (v2).
- Formal verification with Certora / KEVM (v2).
- Multi-chain abstraction (Polygon-only in v1).
