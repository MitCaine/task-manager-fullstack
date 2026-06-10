# Architectural Assumptions and Refactoring

## Purpose

This document records changes that appear reasonable during refactoring but violate established architectural assumptions, ownership boundaries, platform constraints, or ADRs.

The goal is not to prohibit change.

The goal is to explain:

- why a proposed change appears attractive
- which assumptions it violates
- what behavior depends on those assumptions
- how failures are likely to appear

This document should be reviewed before:

- major refactoring
- ownership extraction
- mobile architecture changes
- autosave changes
- recurrence changes
- reminder ownership changes
- calendar ownership changes
- project/tag ownership changes

A proposed change appearing in this document does not mean it can never be implemented.

It means the architectural consequences should be understood before proceeding.

## How To Use This Document

When considering a change:

- Identify the subsystem being modified.
- Locate the matching section in this document.
- Review the violated ADRs.
- Review the violated ownership boundaries.
- Review expected failure modes.
- Review affected tests.
- Decide whether the change is:
  - an extension of existing architecture
  - a modification of architecture
  - a replacement of architecture

Changes in the third category should be treated as architectural redesign rather than refactoring.

## Architectural Reading Strategy

For every proposed change:

Read in this order:

- architecture.md
- ownership-map.md
- ADR review
- mobile-focus-system.md (if mobile is involved)
- this document

Then answer:

- Who owns this behavior?
- Which ADR justifies that ownership?
- What assumptions depend on it?
- What tests protect it?
- Is this a refactor or an architectural redesign?

If the answer requires changing ownership boundaries or invalidating an ADR, the work should be treated as architecture work rather than code cleanup.

## Relationship To Other Documentation

This document should not be used in isolation.

Recommended usage:

| Document | Purpose |
| --- | --- |
| architecture.md | How the system is structured |
| ownership-map.md | Who owns what |
| mobile-focus-system.md | Mobile and focus invariants |
| dependency-heat-map.md | Which files have the highest architectural impact |
| system-navigation-guide.md | Where to begin tracing a feature |
| ADR review | Why decisions were made |
| lessons-learned.md | Engineering lessons from the project |
| future-architecture-pressure-points.md | What would force architectural evolution |
| architectural-assumption-breakage-guide.md | What breaks when assumptions are violated |

The ADR review explains why decisions exist.

This document explains what happens when those decisions are ignored.

Together they provide both architectural reasoning and architectural consequences.

## Interpreting Breakage Entries

Each entry follows a consistent format.

### Proposed Change

A modification that appears reasonable when viewed locally.

### Why It Looks Attractive

The motivation that would naturally lead a developer toward the change.

### Violated ADR

The architectural decision that would be weakened or invalidated.

### Violated Ownership Boundary

The owner whose responsibility would become unclear, duplicated, or fragmented.

### Expected Failure Mode

The most likely observable consequence.

### Affected Tests

The tests most likely to fail if the assumption is broken.

## Most Fragile Architectural Assumptions

The following assumptions have the greatest architectural sensitivity.

### 1. Mobile Focus Stability Is a System

Mobile focus behavior depends on:

- DOM placement
- scroll ownership
- visualViewport monitoring
- focus sequencing
- touch behavior
- keyboard lifecycle handling

These pieces must operate together.

Treating any individual mechanism as independent is likely to introduce regressions.

Related entries:

- 1–10

### 2. One Shared Edit Draft Represents Pending User Changes

Task editing assumes:

- one authoritative draft
- one autosave lifecycle
- one selected task owner
- one reconciliation path

Multiple drafts create ownership conflicts.

Related entries:

- 11–15

### 3. Recurring Completion Is a Replacement Workflow

Recurring tasks are not ordinary status updates.

Completion creates a replacement occurrence.

Many user-visible behaviors depend on this assumption.

Related entries:

- 16–20

### 4. Reminder Persistence and Reminder Delivery Are Different Problems

Persisted reminders and visible reminder notifications have separate lifecycles.

The architecture intentionally separates:

- reminder storage
- reminder polling
- reminder delivery
- reminder presentation

Related entries:

- 21–23

### 5. Bounded Hooks Own Concepts, Not Entire Workflows

Examples:

- useTaskDetailResources
- useProjectTagCatalog
- useBulkSelection
- useTaskListViewModel

These hooks own bounded concepts.

They intentionally do not own cross-domain orchestration.

Related entries:

- 17
- 21
- 24
- 25

### 6. App.tsx Is an Orchestration Boundary

App.tsx is not merely a large file.

It is the location where multiple domains intersect.

Its complexity primarily comes from:

- task ownership
- recurrence
- autosave
- reminders
- mobile editing
- selection
- project/tag reconciliation

Reducing its size is not automatically an architectural improvement.

Ownership clarity is more important than line count.

## Changes Least Likely To Cause Architectural Problems

The following changes generally extend existing ownership boundaries rather than redefine them.

Examples:

- additional task fields
- additional statistics views
- new task filters
- new sort options
- additional reminder metadata
- additional tag colors
- project metadata fields
- dashboard views
- accessibility improvements
- visual themes
- calendar presentation improvements
- additional recurrence intervals using existing recurrence semantics

These changes usually:

- reuse existing APIs
- reuse existing ownership boundaries
- reuse existing persistence structures
- avoid introducing new orchestration responsibilities

As a result, they are typically feature work rather than architecture work.

## Before Approving A Refactor

Review the following checklist.

### Ownership

- Does ownership remain clear?
- Does a single authoritative owner still exist?

### ADRs

- Which ADRs are affected?
- Are they still valid?

### Mobile

- Does this affect focus?
- Does this affect scroll ownership?
- Does this affect visualViewport handling?

### Autosave

- Does this affect draft ownership?
- Does this affect save timing?
- Does this affect reconciliation?

### Recurrence

- Does this affect replacement semantics?
- Does this affect next-occurrence generation?

### Reminders

- Does this affect persistence?
- Does this affect delivery ownership?

### Tests

- Which tests should fail if this assumption is broken?
- Do those tests still exist?

If ownership becomes ambiguous or an ADR becomes invalid, the work should be treated as an architectural redesign rather than a refactor.

## Key Insight

Most regressions do not occur because code changes.

Most regressions occur because assumptions change without being recognized.

This document exists to make those assumptions visible.

A successful change is not one that reduces code.

A successful change is one that preserves or improves ownership clarity while maintaining the architectural guarantees that the rest of the system depends on.
