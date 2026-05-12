# Consolidated User Stories

All user stories from feature specs, indexed by role.

---

## Role: Producer (vegetable cooperative)

| ID      | Story                                                                                           | Feature |
| ------- | ----------------------------------------------------------------------------------------------- | ------- |
| US-CH-1 | Register an account with email + password                                                       | F3      |
| US-CH-2 | Log in and receive JWT                                                                          | F3      |
| US-CH-3 | Have my Polygon wallet generated server-side & encrypted at rest                                | F3      |
| US-CH-4 | CRUD project metadata (cooperative info, vegetable, location, dates, area, output, description) | F3, F5  |
| US-CH-5 | Upload PDF certifications and JPG product images, pinned to IPFS                                | F3, F5  |
| US-CH-6 | Trigger batch generation of N (≤500) private secrets and download QR ZIP                        | F3, F5  |
| US-CH-7 | Mark project status (`in_progress`/`harvesting`/`finished`)                                     | F3, F5  |
| US-CH-8 | Soft-delete a project                                                                           | F3      |
| US-MP-1 | See dashboard listing my projects with status badges                                            | F5      |
| US-MP-2 | Have a "New Project" form with all metadata fields                                              | F5      |
| US-MP-3 | Add cultivation activity inline (date, type, name, materials, note)                             | F5      |
| US-MP-4 | Upload PDFs and JPGs with progress feedback                                                     | F5      |
| US-MP-5 | Use a "Generate QR Batch" wizard with cost preview                                              | F5      |
| US-MP-6 | Receive ZIP with N private QR PNGs + 1 public QR PNG + manifest.json                            | F5      |
| US-MP-7 | Switch UI between Vietnamese (default) and English                                              | F5, F11 |
| US-MP-8 | See a recent verification log per project (counts of outcomes)                                  | F5      |
| US-SC-1 | (As wallet) Register a unique project identifier `phi`                                          | F1      |
| US-SC-2 | (As wallet) Register a batch of up to 500 hashed identifiers                                    | F1      |

---

## Role: Anonymous Consumer

| ID       | Story                                                                           | Feature |
| -------- | ------------------------------------------------------------------------------- | ------- |
| US-CH-9  | (Via dApp) `GET /scan/public/:phi` returns metadata after on-chain check        | F3      |
| US-CH-10 | (Via dApp) `POST /scan/private` returns outcome with txHash + event             | F3      |
| US-DA-1  | Scan public QR with phone camera and within ~5 s see cooperative + traceability | F4      |
| US-DA-2  | Scroll cultivation activities timeline                                          | F4      |
| US-DA-3  | See certifications with downloadable PDFs                                       | F4      |
| US-DA-4  | Scan private QR after opening package, within ~30 s see authenticity result     | F4      |
| US-DA-5  | On `AUTHENTIC`, click txHash to verify on Polygonscan independently             | F4      |
| US-DA-6  | On `ALREADY_VERIFIED`, see prior timestamp + take action                        | F4      |
| US-DA-7  | Switch language between Vietnamese (default) and English                        | F4, F11 |
| US-DA-8  | Have offline-first behavior so flaky 4G doesn't break experience                | F4      |

---

## Role: Reviewer / Academic Auditor

| ID       | Story                                                                          | Feature |
| -------- | ------------------------------------------------------------------------------ | ------- |
| US-CH-11 | Hit `GET /health` to verify hub responding                                     | F3      |
| US-CH-12 | Hit `GET /metrics` (Prometheus) to confirm observability                       | F3      |
| US-CH-13 | Browse OpenAPI/Swagger at `/api/docs`                                          | F3      |
| US-DA-9  | See app's IPFS CID printed in footer to verify no tampering                    | F4      |
| US-DA-10 | Read `/about` page with verification flow + repo + paper DOI                   | F4      |
| US-EX-1  | Run `pnpm exp:perf-registration` and reproduce paper Table 3 row 1             | F6      |
| US-EX-2  | Run `pnpm exp:perf-verification` and reproduce paper Table 3 rows 2–4          | F6      |
| US-EX-3  | Run `pnpm exp:cost-analysis` and reproduce paper Table 4                       | F6      |
| US-EX-4  | Run `pnpm exp:adversarial` and see all attacks rejected                        | F6      |
| US-EX-5  | Run `pnpm exp:all` for one-shot regeneration with `SUMMARY.md`                 | F6      |
| US-SA-1  | Read `SR1_Unforgeability.t.sol` to verify SR1 enforcement                      | F7      |
| US-SA-2  | Read `SR2_NonReplayability.t.sol` to verify SR2 enforcement                    | F7      |
| US-SA-3  | Read `SR3_NonRepudiation.t.sol` to verify SR3 enforcement                      | F7      |
| US-SA-4  | Read `SR4_TrustIndependence.t.sol` to verify SR4 enforcement                   | F7      |
| US-SA-5  | See CI fail on Slither high-severity finding                                   | F7, F9  |
| US-SA-6  | See coverage badge in README                                                   | F7, F10 |
| US-SA-7  | Read `docs/SECURITY_ANALYSIS.md` mapping SR → test:line                        | F7, F10 |
| US-SC-3  | (As hub) Call `redeemProduct(phi, sid)` knowing contract enforces verification | F1      |
| US-SC-4  | (As dApp) Read `verifyProduct(phi, h)` cheaply pre-tx                          | F1      |
| US-SC-5  | (As dApp) Read `projectExists(phi)` cheaply                                    | F1      |
| US-SC-6  | See every redemption emit timestamped `ProductRedeemed` event                  | F1, SR3 |
| US-SC-7  | Read NatSpec linking each contract function to paper Algorithm                 | F1, F10 |

---

## Role: Future Developer / Contributor

| ID      | Story                                                                                     | Feature |
| ------- | ----------------------------------------------------------------------------------------- | ------- |
| US-SP-1 | Import strongly-typed `ProjectMetadata` and `VerificationOutcome` from one shared package | F2      |
| US-SP-2 | Have ABI auto-exported after `forge build`                                                | F2      |
| US-SP-3 | Use `sha256(sid)` helper that exactly matches the contract                                | F2      |
| US-SP-4 | Map paper notation symbols 1:1 to TypeScript names                                        | F2      |
| US-DO-1 | Run `docker compose up` and have full stack up in < 60 s                                  | F8      |
| US-DO-2 | Have hot-reload during development                                                        | F8      |
| US-DO-3 | Use `--profile testnet` to run experiments against Amoy                                   | F8      |

---

## Role: CI / Automation (machine actor)

| ID         | Story                                                                    | Feature |
| ---------- | ------------------------------------------------------------------------ | ------- |
| (implicit) | Run all 3 CI workflows on push/PR; gate merges on failures               | F9      |
| (implicit) | On tag push, build artifacts, pin dApp to Pinata, trigger Zenodo deposit | F9, F13 |
| (implicit) | Reject PRs with secrets / non-Conventional commits                       | F9      |

---

## Story-to-Acceptance-Criteria index

Each user story is satisfied by ≥ 1 acceptance criterion in the corresponding feature spec. See [sr-mapping.md](sr-mapping.md) for SR1–SR4 + R1–R3 traceability.
