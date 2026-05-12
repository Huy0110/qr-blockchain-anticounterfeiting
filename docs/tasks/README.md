# Implementation Tasks Index

48 tickets atomized from [requirements/sequencing.md](../requirements/sequencing.md) and grouped by phase. Master overview at [../tasks.md](../tasks.md). Real-time tracker at [progress.md](progress.md).

---

## Phase files

| Phase                           | Tickets            | Effort    | Feature(s)  | File                                                                     |
| ------------------------------- | ------------------ | --------- | ----------- | ------------------------------------------------------------------------ |
| 0 — Bootstrap                   | T-001 → T-004 (4)  | ~0.5 d    | bootstrap   | [phase-0-bootstrap.md](phase-0-bootstrap.md)                             |
| 1 — Smart Contract + Tests      | T-005 → T-010 (6)  | ~3 d      | F1, F7      | [phase-1-smart-contract.md](phase-1-smart-contract.md)                   |
| 2 — Shared Package              | T-011 → T-012 (2)  | ~0.5 d    | F2          | [phase-2-shared-package.md](phase-2-shared-package.md)                   |
| 3 — Coordination Hub            | T-013 → T-022 (10) | ~5 d      | F3          | [phase-3-coordination-hub.md](phase-3-coordination-hub.md)               |
| 4 — Consumer dApp               | T-023 → T-027 (5)  | ~3.5 d    | F4          | [phase-4-dapp-portal.md](phase-4-dapp-portal.md)                         |
| 5 — Management Portal           | T-028 → T-032 (5)  | ~3.5 d    | F5          | [phase-5-management-portal.md](phase-5-management-portal.md)             |
| 6 — Experiments                 | T-033 → T-035 (3)  | ~1.5 d    | F6          | [phase-6-experiments.md](phase-6-experiments.md)                         |
| 7 — Docker Compose              | T-036 → T-037 (2)  | ~1 d      | F8          | [phase-7-docker.md](phase-7-docker.md)                                   |
| 8 — CI Workflows                | T-038 → T-039 (2)  | ~1.5 d    | F9          | [phase-8-ci.md](phase-8-ci.md)                                           |
| 9 — Documentation               | T-040 → T-042 (3)  | ~1.5 d    | F10         | [phase-9-docs.md](phase-9-docs.md)                                       |
| 10 — Branding + Seed + Citation | T-043 → T-045 (3)  | ~1 d      | F11+F12+F13 | [phase-10-branding-seed-citation.md](phase-10-branding-seed-citation.md) |
| 11 — Mainnet Path               | T-046 (1)          | ~0.5 d    | F14         | [phase-11-mainnet-path.md](phase-11-mainnet-path.md)                     |
| 12 — Release v1.0.0             | T-047 → T-048 (2)  | ~0.5 d    | release     | [phase-12-release.md](phase-12-release.md)                               |
| **Total**                       | **48**             | **~23 d** |             |                                                                          |

---

## Cross-phase dependencies (top-down)

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──┬──► Phase 4
                          │                    └──► Phase 5
                          ▼                    │
                       Phase 6 ◄───────────────┘
                          │
                          ▼
                       Phase 7 ──► Phase 8 ──► Phase 9 ──► Phase 10 ──► Phase 11 ──► Phase 12
```

Phase 4 + Phase 5 can run in parallel (both depend on Phase 3 only).

---

## Quick links

- Master: [../tasks.md](../tasks.md)
- Tracker: [progress.md](progress.md)
- PRD: [../prd.md](../prd.md)
- Architecture: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- Folder structure: [../architecture/folder-structure.md](../architecture/folder-structure.md)
- ADRs: [../architecture/decision-log.md](../architecture/decision-log.md)
- API spec: [../architecture/api-design.md](../architecture/api-design.md)
- Sequence diagrams: [../architecture/sequence-diagrams.md](../architecture/sequence-diagrams.md)
- SR/R mapping: [../requirements/sr-mapping.md](../requirements/sr-mapping.md)
- Risk register: [../requirements/risk-register.md](../requirements/risk-register.md)

---

## Hand-off

Next skill: `/05-implement` consumes [progress.md](progress.md) and works tickets in critical-path order.
