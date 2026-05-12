# Implementation Tasks — Master

**Project:** `qr-blockchain-anticounterfeiting`
**Skill:** `/04-create-tasks`
**Date:** 2026-05-05
**Source:** [requirements/sequencing.md](requirements/sequencing.md) (12 phases) — atomized into 48 tickets.

> **Index:** [tasks/README.md](tasks/README.md). **Tracker:** [tasks/progress.md](tasks/progress.md).

---

## Summary

| Phase                          | Tickets        | Effort               | Feature(s)  | File                                                                                 |
| ------------------------------ | -------------- | -------------------- | ----------- | ------------------------------------------------------------------------------------ |
| 0. Bootstrap                   | T-001 → T-004  | 4 tickets, ~0.5 day  | repo init   | [tasks/phase-0-bootstrap.md](tasks/phase-0-bootstrap.md)                             |
| 1. Smart Contract + Tests      | T-005 → T-010  | 6 tickets, ~3 days   | F1 + F7     | [tasks/phase-1-smart-contract.md](tasks/phase-1-smart-contract.md)                   |
| 2. Shared Package              | T-011 → T-012  | 2 tickets, ~0.5 day  | F2          | [tasks/phase-2-shared-package.md](tasks/phase-2-shared-package.md)                   |
| 3. Coordination Hub            | T-013 → T-022  | 10 tickets, ~5 days  | F3          | [tasks/phase-3-coordination-hub.md](tasks/phase-3-coordination-hub.md)               |
| 4. Consumer dApp               | T-023 → T-027  | 5 tickets, ~3.5 days | F4          | [tasks/phase-4-dapp-portal.md](tasks/phase-4-dapp-portal.md)                         |
| 5. Management Portal           | T-028 → T-032  | 5 tickets, ~3.5 days | F5          | [tasks/phase-5-management-portal.md](tasks/phase-5-management-portal.md)             |
| 6. Experiments                 | T-033 → T-035  | 3 tickets, ~1.5 days | F6          | [tasks/phase-6-experiments.md](tasks/phase-6-experiments.md)                         |
| 7. Docker Compose              | T-036 → T-037  | 2 tickets, ~1 day    | F8          | [tasks/phase-7-docker.md](tasks/phase-7-docker.md)                                   |
| 8. CI Workflows                | T-038 → T-039  | 2 tickets, ~1.5 days | F9          | [tasks/phase-8-ci.md](tasks/phase-8-ci.md)                                           |
| 9. Documentation               | T-040 → T-042  | 3 tickets, ~1.5 days | F10         | [tasks/phase-9-docs.md](tasks/phase-9-docs.md)                                       |
| 10. Branding + Seed + Citation | T-043 → T-045  | 3 tickets, ~1 day    | F11+F12+F13 | [tasks/phase-10-branding-seed-citation.md](tasks/phase-10-branding-seed-citation.md) |
| 11. Mainnet Path               | T-046          | 1 ticket, ~0.5 day   | F14         | [tasks/phase-11-mainnet-path.md](tasks/phase-11-mainnet-path.md)                     |
| 12. Release v1.0.0             | T-047 → T-048  | 2 tickets, ~0.5 day  | release     | [tasks/phase-12-release.md](tasks/phase-12-release.md)                               |
| **Total**                      | **48 tickets** | **~23 days**         |             |                                                                                      |

---

## Ticket card format

Every ticket follows this format:

```markdown
### T-XXX — Short title

**Phase:** N · **Feature:** FN (+ FM if multi) · **Effort:** S | M | L

**Description.** What to do, in 1–2 sentences. Reference paper section if relevant.

**Files to create/modify:**

- `path/to/file.ext` — what happens here
- `path/to/another.ext` — what happens here

**Acceptance criteria refs:** AC-XX-N, AC-YY-M (from feature specs)
**ADRs:** ADR-NNN, ADR-MMM (from decision-log.md)
**SR/R mapping:** SR1, SR2 (only if security-critical)
**Depends on:** T-AAA, T-BBB
**Definition of Done:**

- [ ] Code compiles / tests pass.
- [ ] Specific binary criterion 1.
- [ ] Specific binary criterion 2.
```

Effort scale:

| Symbol | Effort | Time                   |
| ------ | ------ | ---------------------- |
| **S**  | Small  | ≤ 4 hours              |
| **M**  | Medium | 4–12 hours (~1 day)    |
| **L**  | Large  | 12–24 hours (1–2 days) |

---

## Critical path

```
T-001 → T-002 → T-003 → T-004                              (Phase 0)
        │
        ▼
T-005 → T-006 → T-007 → T-008 → T-009 → T-010              (Phase 1: contract)
        │
        ▼
T-011 → T-012                                              (Phase 2: shared)
        │
        ▼
T-013 → T-014 → T-015 → T-016 → T-017 → T-018              (Phase 3: hub)
                          │       │       │
        T-019 → T-020 → T-021 → T-022                      (Phase 3 cont.)
        │                       │
        ▼                       ▼
T-023 → T-024 → T-025 → T-026 → T-027  ─┐                  (Phase 4: dApp — parallel with Phase 5)
                                         ├─►
T-028 → T-029 → T-030 → T-031 → T-032  ─┘                  (Phase 5: mgmt portal)
        │
        ▼
T-033 → T-034 → T-035                                      (Phase 6: experiments)
        │
        ▼
T-036 → T-037                                              (Phase 7: docker)
        │
        ▼
T-038 → T-039                                              (Phase 8: CI)
        │
        ▼
T-040 → T-041 → T-042                                      (Phase 9: docs)
        │
        ▼
T-043 → T-044 → T-045                                      (Phase 10)
        │
        ▼
T-046                                                      (Phase 11: mainnet path)
        │
        ▼
T-047 → T-048                                              (Phase 12: release)
```

Phase 4 (dApp) and Phase 5 (mgmt portal) can run **in parallel** after Phase 3 completes — both depend only on shared package + hub.

---

## Suggested implementation order

Top-down sequential (single-developer / AI-paced):

1. **Bootstrap (T-001..T-004)** — half a day. Skeleton repo, lint, hooks.
2. **Smart contract (T-005..T-010)** — 3 days. Highest-stakes; blocks everything.
3. **Shared package (T-011, T-012)** — half a day.
4. **Coordination Hub (T-013..T-022)** — 5 days. The largest single phase.
5. **Frontends in parallel (T-023..T-032)** — 3.5 days each (parallelizable).
6. **Experiments (T-033..T-035)** — 1.5 days. Depends on hub + contract.
7. **Docker + CI (T-036..T-039)** — 2.5 days.
8. **Docs (T-040..T-042)** — 1.5 days.
9. **Branding + Seed + Citation (T-043..T-045)** — 1 day.
10. **Mainnet path (T-046)** — half a day.
11. **Release (T-047, T-048)** — half a day.

Total wall-clock with parallelism: ~21 days. Sequential: ~23 days.

---

## Cross-references

| Want to find                    | Look at                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| What features each phase covers | Summary table above                                                    |
| File paths                      | [architecture/folder-structure.md](architecture/folder-structure.md)   |
| Acceptance criteria             | [requirements/features/](requirements/features/)                       |
| ADR rationale                   | [architecture/decision-log.md](architecture/decision-log.md)           |
| SR/R traceability               | [requirements/sr-mapping.md](requirements/sr-mapping.md)               |
| Risk register                   | [requirements/risk-register.md](requirements/risk-register.md)         |
| API spec                        | [architecture/api-design.md](architecture/api-design.md)               |
| Sequence flows                  | [architecture/sequence-diagrams.md](architecture/sequence-diagrams.md) |

---

## Hand-off to `/05-implement`

Implementation skill picks tickets from [tasks/progress.md](tasks/progress.md) in critical-path order, marks `in_progress` → `done`, runs CI on each merge.
