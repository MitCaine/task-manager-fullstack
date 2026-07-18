# Documentation Guide

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Documentation authors and reviewers |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Documentation is organized by current reader intent. Each architectural concept
has one canonical owner; other documents link to it instead of restating it.

## Document Classes

- **Canonical:** current implementation authority; maintained with code changes.
- **Reference:** current lookup material such as configuration or API inventory.
- **Historical:** context from a completed stage; never production authority.
- **Generated:** tool-owned files excluded from the documentation index.

## Required Canonical Format

Canonical guides use one H1 and begin with Status, Audience, Owner, and Last
verified. Use these sections where applicable:

1. Purpose
2. Scope
3. Architectural Invariants
4. Responsibilities
5. Major Components
6. Runtime Flow
7. Code Map
8. Testing
9. Known Limitations
10. Related ADRs
11. Related Documents

Short reference guides may omit irrelevant sections rather than adding filler.

## Style And Naming

- Use lowercase kebab-case filenames; reserve `README.md` for directory indexes.
- Use relative links and portable repository-relative paths.
- Use current symbol names and distinguish REST DTO, domain, SQLite row, and legacy
  UI terminology.
- Use Mermaid only when a maintained diagram clarifies ownership or flow.
- Separate current behavior, known limitations, and future work.
- Do not copy substantial explanations between guides.
- Avoid test counts, line numbers, and other quickly stale measurements unless they
  are release evidence.

## Updating Documentation

When architecture changes, update its canonical guide and ADR status in the same
change. Update the root README only if the project-level summary or entry path
changes. Put completed plans and retrospectives under `history/`; do not leave a
plan beside canonical architecture after implementation.

## Verification

Before review:

- check every relative link and referenced file;
- search for removed symbols and superseded terminology;
- confirm code owns the behavior described;
- check that no second canonical guide repeats the same subsystem;
- run `git diff --check`.

## Known Limitations

The repository does not yet enforce Markdown linting or link validation in CI.

## Related Documents

- [Documentation Index](../README.md)
- [Repository Tour](../repository-tour.md)
- [ADR Index](../adr/README.md)
