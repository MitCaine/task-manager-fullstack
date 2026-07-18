# ADR-0008: No Backend Service Layer

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-06-10 |
| Last verified | 2026-07-18 |

## Context

The backend is small and its existing operations are concentrated in one resource
controller or a limited related-resource mutation.

## Decision

Keep backend application behavior in controllers using Spring Data repositories.
Do not add a service layer without a concrete transaction, reuse, or complexity
boundary.

## Alternatives

- Adding one service class per controller was rejected as indirection without a
  current ownership benefit.
- Moving backend workflow into JPA repositories was rejected.

## Consequences

The backend remains direct and easy to trace. Controllers can grow and multi-entity
transaction boundaries remain limited; future complexity may justify revisiting
the decision.

## Supersedes / Superseded By

None.

## Related Documents

- [Backend Architecture](../architecture/backend.md)
- [Roadmap and Pressure Points](../reference/roadmap-and-pressure-points.md)

## Verification

Controllers inject Spring Data repositories directly; no production service layer
exists.
