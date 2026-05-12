# Architecture Documentation Index

All architecture artifacts produced by `/03-design-architecture`. Master document is [../ARCHITECTURE.md](../ARCHITECTURE.md) (one level up); files in this directory go deeper.

> **Read order if you're new:** [../ARCHITECTURE.md](../ARCHITECTURE.md) → [system-design.md](system-design.md) → [folder-structure.md](folder-structure.md) → feature-specific specs in [../requirements/features/](../requirements/features/).

---

## Files

| File                                                   | Purpose                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [../ARCHITECTURE.md](../ARCHITECTURE.md)               | **Master.** C4 diagrams (Context, Container, Component) + cross-cutting concerns + decision summary. |
| [system-design.md](system-design.md)                   | Communication patterns, auth flow, error handling, environments, observability, security posture.    |
| [folder-structure.md](folder-structure.md)             | **Locked** repo layout with naming conventions and gitignore policy.                                 |
| [tech-stack.md](tech-stack.md)                         | Each technology choice with rationale; what we're NOT using.                                         |
| [database.md](database.md)                             | Mongoose schemas + indexes + ER diagram + migration policy.                                          |
| [api-design.md](api-design.md)                         | Full OpenAPI 3.0 spec for the Coordination Hub + error envelope catalog.                             |
| [sequence-diagrams.md](sequence-diagrams.md)           | Mermaid sequence diagrams for paper Algorithms 1, 2, 3 + adversarial scenario.                       |
| [inter-service-contract.md](inter-service-contract.md) | ABI shape, env vars per service, Docker network topology, port allocation.                           |
| [decision-log.md](decision-log.md)                     | 17 ADRs (Architecture Decision Records) covering all notable choices.                                |

---

## What's locked vs revisitable

### Locked for v1 (changing requires re-running `/03-design-architecture` or amending an ADR)

- Folder structure ([folder-structure.md](folder-structure.md)).
- Tech stack ([tech-stack.md](tech-stack.md)) — per ADR-001..ADR-017.
- API surface ([api-design.md](api-design.md)) — bumping requires `/api/v2/`.
- Smart contract ABI — exposed via `@qr-bc/shared`.
- Database schema — additive changes OK without migration tooling; destructive changes require migrate-mongo (deferred to v2).

### Revisitable in implementation phase

- Internal NestJS module file layout (within `apps/coordination-hub/src/`).
- Component subdivision in frontends (within `apps/dapp-portal/src/components/`).
- Test file structure within `contracts/test/` (must remain Foundry-compatible).

---

## Cross-document map

| Topic                                   | Where                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Smart contract spec                     | [../requirements/features/smart-contract.md](../requirements/features/smart-contract.md) → API surface; this folder → ABI integration |
| Hub REST contract                       | [api-design.md](api-design.md) → spec; [system-design.md](system-design.md) → flows                                                   |
| Hub modules                             | [../ARCHITECTURE.md](../ARCHITECTURE.md) §3 (C4 Component)                                                                            |
| Database schemas                        | [database.md](database.md)                                                                                                            |
| Sequence flows                          | [sequence-diagrams.md](sequence-diagrams.md)                                                                                          |
| Folder paths                            | [folder-structure.md](folder-structure.md)                                                                                            |
| Env vars                                | [inter-service-contract.md](inter-service-contract.md) §3                                                                             |
| Docker topology                         | [inter-service-contract.md](inter-service-contract.md) §4                                                                             |
| Auth flow                               | [system-design.md](system-design.md) §2                                                                                               |
| Error handling                          | [system-design.md](system-design.md) §3 + [api-design.md](api-design.md) §4                                                           |
| SR1–SR4 enforcement points              | [sequence-diagrams.md](sequence-diagrams.md) §3 + [decision-log.md](decision-log.md) ADR-007, ADR-014                                 |
| Why MongoDB                             | [decision-log.md](decision-log.md) ADR-016 + [database.md](database.md) §8                                                            |
| Why Hardhat+Foundry                     | [decision-log.md](decision-log.md) ADR-001                                                                                            |
| Why Next.js static export for dApp only | [decision-log.md](decision-log.md) ADR-003                                                                                            |

---

## Hand-off to `/04-create-tasks`

The architecture phase produces:

- **Locked structural decisions** (folder layout, tech stack, ADRs).
- **Locked interface contracts** (REST API, ABI, env vars).
- **Sequence flows** for the 3 paper algorithms.
- **C4 diagrams** at 3 levels.

Next skill (`/04-create-tasks`) will atomize [../requirements/sequencing.md](../requirements/sequencing.md) Phases 0–12 into ~30–50 individual tickets, each citing:

- Folder path(s) from [folder-structure.md](folder-structure.md).
- Acceptance criteria from `../requirements/features/*.md`.
- Relevant ADR(s) from [decision-log.md](decision-log.md).
- SR/R mapping from [../requirements/sr-mapping.md](../requirements/sr-mapping.md).
