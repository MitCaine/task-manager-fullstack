# Codex Workflow Guide

## Purpose

This guide routes coding agents to the existing project documentation and
verification commands. It does not replace architecture, feature, ownership,
mobile, or test documentation.

Start with [START-HERE.md](START-HERE.md) when the task is broad or unfamiliar.
For a narrow task, use the routes below and read only the relevant source
files after the documentation establishes ownership and risk.

## Route Tasks to Existing Documentation

| Task type | Read first | Add when needed |
| --- | --- | --- |
| Locate a feature or identify affected files | [Feature Atlas](feature-atlas.md), [Code Reading Guide](code-reading-guide.md) | [Trace Atlas](trace-atlas.md), [Test Coverage Map](test-coverage-map.md) |
| Change an existing workflow | [Ownership Map](ownership-map.md), [Sequence Diagrams](sequence-diagrams.md), [Trace Atlas](trace-atlas.md) | Relevant [ADR](adr/), [What Would Break](what-would-break.md) |
| Change state ownership, extract code, or refactor architecture | [Architecture](architecture.md), [State Taxonomy](state-taxonomy.md), [Architecture Signals](architecture-signals.md) | [Dependency Analysis](dependency-analysis.md), [What Would Break](what-would-break.md), relevant [ADR](adr/) |
| Change backend APIs or persistence | [Architecture](architecture.md), [Feature Atlas](feature-atlas.md), [Trace Atlas](trace-atlas.md) | [Dependency Analysis](dependency-analysis.md), [Sequence Diagrams](sequence-diagrams.md), [Test Coverage Map](test-coverage-map.md) |
| Change projects or tags | [Feature Atlas](feature-atlas.md), [Project and Tag Scalability Plan](project-tag-scalability-plan.md), [Ownership Map](ownership-map.md) | [Trace Atlas](trace-atlas.md), [Test Coverage Map](test-coverage-map.md) |
| Change mobile editing, focus, scrolling, viewport, or gestures | [Mobile Focus System](mobile-focus-system.md), [ADR-004](adr/ADR-004-mobile-edit-row.md), [ADR-005](adr/ADR-005-ios-focus-guard.md) | [What Would Break](what-would-break.md), [Test Coverage Map](test-coverage-map.md), [Code Reading Guide](code-reading-guide.md) |
| Decide verification scope | [Test Coverage Map](test-coverage-map.md) | [What Would Break](what-would-break.md), [Dependency Analysis](dependency-analysis.md) |
| Understand why the current architecture exists | [Architecture Timeline](architecture-timeline.md), [Architecture](architecture.md) | [Architecture Signals](architecture-signals.md), relevant [ADR](adr/) |

## Do Not Re-create Existing Documentation

Do not create a new architecture summary, feature map, ownership map, state
inventory, dependency graph, sequence diagram set, trace guide, mobile-focus
guide, test-coverage summary, or breakage-risk list. Update the existing
document only when the implementation changes its source-of-truth content.

Reviews under [`reviews/`](reviews/) are point-in-time analysis. Do not treat
them as the primary current-architecture source. ADRs record accepted
decisions; do not rewrite their history for a local implementation change.

Before documenting a discovery, search the existing docs by feature,
component, owner, state name, endpoint, CSS selector, or test name. Prefer a
small correction or link over a parallel explanation.

## Verification Routing

Use the smallest verification scope that provides meaningful evidence, then
expand when the change crosses ownership boundaries or shared behavior. 
When the user has a local verification script available, prefer asking the 
user to run `./scripts/verify-all.sh` and paste the output instead of running 
full verification through the coding agent.

| Change scope | Default verification |
| --- | --- |
| Documentation only | `git diff --check` |
| Narrow frontend component, CSS, or interaction | The directly related frontend test file or focused Jest name pattern, then `git diff --check` |
| Frontend shared control, `App.tsx` orchestration, or cross-surface behavior | Related focused tests during development; run the full frontend suite before completion when blast radius is broad |
| Backend controller, repository, entity, or API contract | Relevant Maven test class during development; run backend tests when the contract or shared behavior changes |
| Frontend API contract shared with backend | Relevant frontend API tests and backend tests |
| Mobile/iOS focus, viewport, scroll, pager, swipe, or native-wrapper behavior | Relevant focused frontend tests, full frontend tests, `npm run ios:sync`, and manual simulator/device validation |
| Broad, release-oriented, or cross-stack change | Ask the user to run `./scripts/verify-all.sh`, or run it when the environment supports the required tools |

Useful commands:

```bash
# Full verification (preferred)
./scripts/verify-all.sh

# Diff validation
git diff --check

# Targeted verification examples
cd taskmanager-frontend

npm test -- App.test.tsx --watchAll=false --silent
npm test -- Calendar.test.tsx --watchAll=false --silent

# Backend only
./mvnw test
```

Ask the user to perform simulator or physical-device checks when real
WKWebView keyboard, caret, touch, focus, viewport, or visual behavior matters.
Automated DOM and event tests do not replace that validation.

## Preserve Mobile and iOS Invariants

Treat mobile editing and iOS focus behavior as one cross-cutting subsystem.
Before changing related JSX, CSS, focus handlers, touch handlers, viewport
logic, scroll containers, or pager behavior, read the complete
[Mobile Focus System](mobile-focus-system.md).

Do not casually change:

- `.mobile-edit-row` or `.mobile-edit-panel` placement;
- `.app__list` scroll ownership;
- root, app, pager, or mobile-page sizing and overflow;
- focused-field touch guards or `visualViewport` handling;
- swipe-ignore behavior;
- the shared inline/mobile/detail edit draft.

If a task explicitly excludes these areas, keep the diff free of their
selectors, components, handlers, and tests.

## Avoid Rediscovering Architecture

1. Search [Feature Atlas](feature-atlas.md) and
   [Code Reading Guide](code-reading-guide.md) before searching the whole
   repository.
2. Confirm the authoritative owner in [Ownership Map](ownership-map.md) and
   state category in [State Taxonomy](state-taxonomy.md).
3. Follow the existing workflow in [Trace Atlas](trace-atlas.md) or
   [Sequence Diagrams](sequence-diagrams.md).
4. Check [What Would Break](what-would-break.md) and the relevant ADR before
   moving ownership or changing protected behavior.
5. Use [Test Coverage Map](test-coverage-map.md) to identify both protection
   and gaps before choosing verification.

## Keep Changes and Commits Scoped

Assume the worktree may already contain user changes.

- Run `git status --short` before editing and before staging.
- Inspect diffs for every file touched.
- Never revert unrelated changes.
- When a touched file contains unrelated changes, stage only the intended
  hunks with `git add -p`.
- Run `git diff --cached --check` and inspect `git diff --cached` before
  committing.
- Commit only after required verification passes.
- Keep one commit focused on the requested behavior; exclude opportunistic
  cleanup, unrelated refactors, generated files, and documentation churn.
- After committing, run `git status --short` to confirm unrelated work remains
  uncommitted.

When the requested change alters current architecture, ownership, feature
location, mobile invariants, or test coverage, update the existing relevant
source-of-truth document in the same scoped work. Otherwise, do not modify
architecture documentation merely because code was touched.
