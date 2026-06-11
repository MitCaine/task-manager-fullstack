# Task Manager Documentation: Start Here

## What This Documentation Set Is

This documentation set explains the current Task Manager implementation from
several complementary perspectives.

- The [Study Guide](TaskManager_Architecture_Study_Guide.md) is the primary
  onboarding document. It connects the original database-class design to the
  production application and explains the major engineering lessons.
- Architecture documents describe how the current system works, who owns each
  responsibility, how state is classified, and how important workflows move
  through the system.
- Architecture Decision Records (ADRs) explain why important architectural
  decisions exist and what behavior depends on them.
- Guides provide learning, navigation, and retrospective material for
  maintainers studying the project.
- Reviews capture point-in-time analysis, risk assessments, and focused
  audits. They provide context but are not the primary source of current
  architecture truth.

## New Contributor Path

Read these documents in order:

1. [TaskManager Architecture Study Guide](TaskManager_Architecture_Study_Guide.md)
2. [Feature Atlas](feature-atlas.md)
3. [Code Reading Guide](code-reading-guide.md)
4. [Ownership Map](ownership-map.md)
5. [Sequence Diagrams](sequence-diagrams.md)

The Study Guide establishes the project's history and the difference between
the original database design and the implemented application. The Feature
Atlas then maps user-visible behavior to implementation areas. The Code
Reading Guide turns those maps into practical source-reading paths. The
Ownership Map clarifies authoritative owners and exclusions. The Sequence
Diagrams finish the path by showing important workflows end to end.

## Feature Maintenance Path

When modifying an existing feature, read:

1. [Feature Atlas](feature-atlas.md)
2. [Ownership Map](ownership-map.md)
3. [Test Coverage Map](test-coverage-map.md)
4. The relevant [ADR](adr/)
5. [Sequence Diagrams](sequence-diagrams.md)

The Feature Atlas identifies the feature's frontend, backend, state, API,
utility, test, and mobile dependencies. The Ownership Map shows which owner is
authoritative and which responsibilities must remain elsewhere. The Test
Coverage Map shows which parts of the feature are directly or indirectly
protected and where current gaps exist. The relevant ADR explains why the
current boundary exists. The Sequence Diagrams show the operation ordering and
local-state reconciliation that the feature depends on.

## Architecture Path

When evaluating ownership, extraction, or another architecture-sensitive
change, read:

1. [Architecture](architecture.md)
2. [Ownership Map](ownership-map.md)
3. [State Taxonomy](state-taxonomy.md)
4. [Architecture Signals](architecture-signals.md)
5. [What Would Break](what-would-break.md)
6. [Test Coverage Map](test-coverage-map.md)
7. The relevant [ADRs](adr/)

This path moves from system structure to explicit owners, then to state
lifecycle and decision signals. What Would Break makes the affected
constraints concrete, the Test Coverage Map identifies current regression
protection and gaps, and the relevant ADRs record the reasons behind protected
boundaries.

## Change Safety Path

Before making a non-trivial architectural or ownership change, read:

1. [Architecture Signals](architecture-signals.md)
2. [What Would Break](what-would-break.md)
3. [Test Coverage Map](test-coverage-map.md)
4. The relevant [ADRs](adr/)

Read **Architecture Signals** first to answer whether the proposed movement
creates a complete ownership boundary or only relocates code. Use it when a
change affects owners, state authority, lifecycle, extraction, backend
layering, or mobile/platform behavior. It supplies the decision criteria used
to interpret the more concrete risks and evidence in the remaining documents.

Read **What Would Break** next to answer which current assumptions and
workflows a reasonable-looking change could violate. Use it to compare the
proposal with known ownership, state, lifecycle, and platform failure modes.
It turns the general signals into concrete consequences and identifies the
ADRs, sequences, and tests connected to each constraint.

Read the **Test Coverage Map** to answer how the affected behavior is currently
protected and which gaps remain. Use it before deciding whether passing tests
would provide enough evidence for the proposed change. It complements What
Would Break by distinguishing directly tested behavior from indirect
protection and untested assumptions.

Read the relevant **ADRs** last to answer why the current decision was accepted
and which alternatives and consequences were considered. Use them whenever
the proposed change touches a recorded decision. They provide the historical
decision context needed to determine whether the work preserves the current
architecture or changes it.

## Mobile Path

Before touching mobile editing, focus, viewport behavior, scrolling, keyboard
guards, or pager/swipe behavior, read:

- [Mobile Focus System](mobile-focus-system.md)
- [What Would Break](what-would-break.md)
- [Test Coverage Map](test-coverage-map.md)
- [ADR-004: Mobile Edit Row](adr/ADR-004-mobile-edit-row.md)
- [ADR-005: iOS Focus Guard](adr/ADR-005-ios-focus-guard.md)

These are protected areas because mobile edit placement, root and list sizing,
scroll ownership, focus scopes, touch handling, `visualViewport`, and
WKWebView behavior form one cross-cutting system. What Would Break identifies
the failure modes associated with reasonable-looking mobile changes, while the
Test Coverage Map distinguishes automated protection from behavior that still
requires simulator or device verification. A change that appears local to JSX,
CSS, or one input can violate platform invariants elsewhere.

## Reverse Engineering Path

For a structured investigation of the existing implementation, read:

1. [TaskManager Architecture Study Guide](TaskManager_Architecture_Study_Guide.md)
2. [Code Reading Guide](code-reading-guide.md)
3. [Feature Atlas](feature-atlas.md)
4. [Sequence Diagrams](sequence-diagrams.md)
5. [Ownership Map](ownership-map.md)

The Study Guide provides context, the Code Reading Guide supplies targeted
source-reading paths, the Feature Atlas identifies implementation surfaces,
the Sequence Diagrams trace runtime behavior, and the Ownership Map confirms
where authority and lifecycle responsibilities reside.

## Documentation Categories

### Architecture Documents

The root architecture documents describe the current implementation:

- [architecture.md](architecture.md)
- [ownership-map.md](ownership-map.md)
- [state-taxonomy.md](state-taxonomy.md)
- [sequence-diagrams.md](sequence-diagrams.md)
- [feature-atlas.md](feature-atlas.md)
- [code-reading-guide.md](code-reading-guide.md)
- [architecture-signals.md](architecture-signals.md)
- [what-would-break.md](what-would-break.md)
- [test-coverage-map.md](test-coverage-map.md)
- [mobile-focus-system.md](mobile-focus-system.md)

Update these when current ownership, state flow, feature implementation,
runtime sequences, protected invariants, or test protection change.

### Guides

The [`guides/`](guides/) directory contains learning, retrospective, and
navigation material. Update a guide when the recommended learning path,
project lessons, or navigation advice no longer matches the implementation.

### Reviews

The [`reviews/`](reviews/) directory contains focused audits and
architecture-pressure analysis. Reviews are historical or analytical
artifacts. Update them when intentionally revisiting the analysis rather than
as a routine consequence of every implementation change.

### ADRs

The [`adr/`](adr/) directory contains accepted architectural decisions.
Update an ADR when the decision, consequences, or protected assumptions
change. Add a new ADR when a new architecture decision is introduced; do not
rewrite existing ADR history merely to match a local implementation detail.
