# ADR-0012: Canonical Domain String IDs

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-07-01 |
| Last verified | 2026-07-18 |

## Context

REST uses numeric entity/status IDs while SQLite uses generated text entity IDs
and should not copy database-specific status numbering.

## Decision

Use strings for domain entity IDs. Use `not_started`, `in_progress`, and
`completed` for domain status identity. Translate backend numbers in the REST
mapper and legacy UI numbers in compatibility adapters.

## Alternatives

- Numeric domain IDs were rejected because they cannot naturally represent SQLite
  UUIDs.
- Numeric SQLite status lookup IDs were rejected because they preserve accidental
  backend representation rather than meaning.
- Broad immediate UI ID migration was deferred to keep persistence work bounded.

## Consequences

Repository contracts are stable across providers. Mapping is explicit. The legacy
UI temporarily needs stable negative aliases for nonnumeric domain IDs.

## Supersedes / Superseded By

Supersedes numeric identity at the repository/domain boundary.

## Related Documents

- [Repository Architecture](../architecture/repositories.md)
- [Why This Exists](../reference/why-this-exists.md)

## Verification

`domain/models.ts`, `StatusMapper.ts`, SQLite status schema/seeds, and legacy ID
adapter tests enforce the decision.
