# Agent Workflow Guide

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors using coding agents in this repository |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide defines a repository-aware workflow for automated coding assistance.
It does not replace the development, testing, or architecture guides.

## Required Context

Before requesting or implementing a change, identify:

- the canonical subsystem and domain guides;
- the production owner and public contract;
- both persistence adapters when repositories are involved;
- existing focused and integration tests;
- mobile/native qualification requirements;
- unrelated work already present in the working tree.

## Request Shape

Effective requests state the goal, scope, non-goals, invariants, required tests,
and validation commands. For staged architecture work, explicitly prohibit later
stages to prevent accidental provider, UI, or data-migration expansion.

## Execution Expectations

1. Audit code before proposing edits.
2. Prefer existing ownership boundaries and helpers.
3. Make the narrowest production change that satisfies a verified behavior.
4. Keep REST, SQLite, domain, and legacy UI representations distinct.
5. Run focused validation before broad validation.
6. Report unverified native behavior as manual validation, not as passed.
7. Update canonical documentation when implementation boundaries change.

## Review Expectations

Ask for findings first when requesting a review. Findings should identify concrete
behavior, file ownership, and missing tests. Do not accept a documentation-only
claim when production code contradicts it.

## Safety Boundaries

- Do not revert unrelated user changes.
- Do not make REST/SQLite provider changes as an incidental refactor.
- Do not weaken shared contracts to accommodate one adapter's limitation.
- Do not claim sync, offline commit, push notifications, or deployment support.
- Do not edit generated Xcode or build artifacts unless the task requires it.

## Related Documents

- [Development Workflow](workflow.md)
- [Testing Guide](testing.md)
- [Change Impact Guide](../reference/change-impact-guide.md)
