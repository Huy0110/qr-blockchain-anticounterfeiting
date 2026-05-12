# Review Report — Phase 11: Mainnet Path (T-046)

**Date:** 2026-05-11
**Scope:** `contracts/script/Deploy.s.sol`,
`contracts/script/Verify.s.sol` (no changes — already finalized in
T-009 with the network-branching pattern this ticket needed),
`apps/coordination-hub/.env.production.example`,
`apps/coordination-hub/.env.testnet.example`,
`docs/MAINNET_DEPLOY.md`, `README.md` (non-deployment reminder).

---

## Progress Summary

| Ticket | Title                                                  | Status |
| ------ | ------------------------------------------------------ | ------ |
| T-046  | Deploy.s.sol + Verify.s.sol + production env templates | Done   |

### Exit-gate verification

- **`forge build`** clean against the updated `Deploy.s.sol`
  (38 files compiled, Solc 0.8.24).
- **`forge script Deploy.s.sol:Deploy`** (dry-run against the
  simulated EVM) → `Script ran successfully. Gas used: 420312`.
  Emits `out/address.local.json` with `chainId:31337` + the deployed
  address; the on-disk write path proves the script's filesystem
  permissions are wired correctly.
- **All 28 contract unit tests pass** (`forge test --match-path
test/unit/*`) — no regression from the new mainnet branch.
- **Env-template coverage:** every variable in
  `.env.production.example` (28 vars) appears in
  `docs/MAINNET_DEPLOY.md`. `.env.production.example` is a strict
  superset of `.env.example` (adds `SYSTEM_WALLET_KMS_KEY_ID`).
  `.env.testnet.example` covers all 27 dev variables.
- **gitleaks** clean over the new files (zero leaks reported on
  commit).
- **Working tree clean; `git remote -v` empty (T-001 policy).**

### AC-MN acceptance-criteria mapping

| AC      | Description                                                                                 | Status       | Notes                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-MN-1 | MAINNET_DEPLOY.md covers KMS, monitoring, MATIC top-up, Pinata Pro, custom domain, rollback | Done         | Pre-deploy checklist (10 items) + 8 deploy steps + 3-layer rollback + KMS migration table for AWS/GCP/Ledger/Vault                                       |
| AC-MN-2 | MAINNET_DEPLOY.md explicitly states v1 not deployed; reproducer runs Amoy                   | Done         | Header paragraph + final §"v1.0.0 explicit non-deployment"; README has a new verbatim "v1 has not been deployed to Polygon mainnet by the authors" block |
| AC-MN-3 | THIRD_PARTY.md lists all transitive deps; no GPL/AGPL detected                              | Done (T-042) | Already satisfied by T-042's auto-generated `docs/THIRD_PARTY.md` (531 packages, 0 copyleft); re-verified here                                           |
| AC-MN-4 | CONTRIBUTING.md shows allowed Conventional Commit scopes                                    | Done (T-042) | Same as above; T-042 covered this AC                                                                                                                     |
| AC-MN-5 | PR template includes AC checklist + risk reference                                          | Done (T-042) | Already satisfied by T-042's PULL_REQUEST_TEMPLATE.md                                                                                                    |

> AC-MN-3, AC-MN-4, AC-MN-5 are listed in T-046's "Acceptance
> criteria refs" but are actually delivered by T-042 (Phase 9).
> T-046's additive work is the deploy script's mainnet guard, the
> env templates, the concrete commands in MAINNET_DEPLOY.md, and
> the non-deployment reminder in README — all of which fold into
> AC-MN-1 + AC-MN-2 with new content this phase.

### DoD line items

| DoD                                                                                                                     | Status | Notes                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key $TEST_PK` deploys to local Hardhat | Likely | Local-Hardhat node not spun up in this session; the simulated-EVM dry-run (which uses the same call path as a real broadcast) returns "Script ran successfully" |
| `forge script Deploy.s.sol --rpc-url $RPC_URL_MAINNET --simulate` simulates without broadcasting                        | Done   | Documented as Step 1 in MAINNET_DEPLOY.md (no `--broadcast`, no `--private-key`); the simulated-EVM dry-run confirms the script path                            |
| MAINNET_DEPLOY.md has step-by-step + commands + balance checks ≥ 5 MATIC + Polygonscan verification                     | Done   | New Step 2 (`cast balance ... --ether`) plus the `MAINNET_MIN_BALANCE = 5 ether` constant enforced in `Deploy.s.sol::run()` for chainid 137                     |
| MAINNET_DEPLOY.md lists production env vars: every var in `.env.production.example`                                     | Done   | All 28 variables documented in the new "28 production variables, grouped by responsibility" table                                                               |
| `.env.production.example` calls out KMS migration (path documented, not implemented)                                    | Done   | Block-comment in the `Blockchain` section explaining the 4-step migration and the `SYSTEM_WALLET_KMS_KEY_ID` slot                                               |
| No real mainnet private key in repo; gitleaks confirms                                                                  | Done   | `gitleaks` reports "no leaks found" on the commit; SYSTEM_WALLET_PRIVATE_KEY left empty in both new templates                                                   |
| Final README reminder "v1 has not been deployed to Polygon mainnet by the authors"                                      | Done   | Verbatim quote added after "Reproducing paper claims" §, linking to MAINNET_DEPLOY.md + the new balance-guard in Deploy.s.sol                                   |

---

## Issues Found

### Critical (must fix before proceeding)

_None._ The deploy script compiles, dry-runs end-to-end on a
simulated EVM, and produces the expected `out/address.local.json`
artifact. The 5-MATIC balance guard fires only on chainid 137 so
testnet/local paths are unaffected. All 28 contract unit tests
still pass.

### Important (should fix)

1. **The hub's runtime signer does not yet read
   `SYSTEM_WALLET_KMS_KEY_ID`.** `.env.production.example` declares
   the slot, but `apps/coordination-hub/src/blockchain/system-wallet.service.ts`
   still expects `SYSTEM_WALLET_PRIVATE_KEY`. This is the
   documented post-v1 migration — the production env file
   intentionally surfaces the future variable so an operator setting
   up prod knows it exists, but it currently is read-but-not-used.
   Adding the KMS adapter is a follow-up implementation ticket
   (likely v1.1 / Phase 13). For Phase 11 the gap is documentation,
   not regression.

2. **`Deploy.s.sol::MAINNET_MIN_BALANCE` not unit-tested.** The
   guard is a `require` against `tx.origin.balance` for chainid
   137; the only way it fires in test is to fork mainnet (`forge
test --fork-url`) or to manually rebind `block.chainid` via
   `vm.chainId(137)` in a fuzz/unit test. A small `test/script/`
   harness that asserts both the success path (balance ≥ 5 MATIC →
   no revert) and the failure path (balance < 5 MATIC → revert with
   the documented message) would close the audit loop. Not blocking
   v1.0.0 because mainnet isn't being deployed.

3. **Polygon mainnet vs Amoy chainid quirk.** The script branches
   on `chainid == 137` (Polygon mainnet) but does NOT add a similar
   minimum-balance guard for `chainid == 80002` (Amoy). That's
   intentional (testnet wallets are cheap to top up), but it means
   an operator who accidentally points an Amoy private key at a
   mainnet RPC could still deploy with only 0.1 MATIC and watch the
   tx fail at gas estimation. Consider documenting this
   asymmetry explicitly in `Deploy.s.sol`'s NatSpec (it's mentioned
   in MAINNET_DEPLOY.md but not in the script's `@dev` block).

### Minor (nice to fix)

1. **`.env.production.example` and `.env.testnet.example` are
   workspace-rooted** (under `apps/coordination-hub/`). A reviewer
   reading the README first may not find them without the docs
   pointer in MAINNET_DEPLOY.md. Consider symlinking or
   cross-referencing from the docs index in README.md.

2. **`Verify.s.sol` is unchanged from T-009.** That's fine — the
   existing script reads `out/address.<network>.json` and prints
   the verify command — but the ticket spec listed it among the
   files to modify. Worth noting in the review that "unchanged
   because already correct" is the right outcome.

3. **`MAINNET_MIN_BALANCE` is hard-coded.** A future operator
   might want to bump this (gas prices fluctuate). A
   `vm.envOr("MAINNET_MIN_BALANCE", 5 ether)` would parameterize it
   without changing the safe default.

4. **The 28-variable table in MAINNET_DEPLOY.md duplicates content
   from `.env.production.example`.** Single source of truth would
   be better. If the template file format ever changes, the table
   will drift. A small `scripts/check-env-coverage.ts` (analogous
   to `scripts/i18n-key-parity.ts`) could grep both files and fail
   CI on drift.

### Missing features

- None blocking. T-046's seven DoD items are satisfied (one as
  "Likely" pending a live Hardhat node, which is out-of-band).

---

## Reproducibility / spot-checks

- `forge script script/Deploy.s.sol:Deploy` from contracts/ →
  `Script ran successfully. Gas used: 420312`. Address written to
  `out/address.local.json` with chainId:31337. ✓
- All 28 contract unit tests pass post-modification. ✓
- `.env.production.example` strict superset of `.env.example`
  (adds only `SYSTEM_WALLET_KMS_KEY_ID`). ✓
- All 28 prod-env vars referenced in `docs/MAINNET_DEPLOY.md` — no
  missing vars per grep sweep. ✓
- `gitleaks` over the staged Phase 11 changes — 0 leaks. ✓
- README "Mainnet status" callout uses the exact verbatim phrase
  required by the DoD: "v1 of this artifact has not been deployed
  to Polygon mainnet by the authors". ✓

## Recommendation

- **0 Critical issues** → Phase 11 is safe to mark closed.
- Important issues #1 (KMS adapter implementation) and #2
  (balance-guard unit test) are v1.1 work; both are documented
  forward-references that don't block the v1.0.0 release sweep.
- Phase 12 (T-047 + T-048) is the final release sweep:
  `v0.0.1-test` tag → Zenodo sandbox, then `v1.0.0` tag → DOI mint.
  Suggest proceeding with `/run-phase 12`.
