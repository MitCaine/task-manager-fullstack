# ADR-008: Use Direct Controller and Repository Backend Ownership

## Status

Accepted

## Context

The active Spring Boot backend primarily exposes bounded CRUD operations for
tasks, projects, tags, subtasks, notes, reminders, and attachments.

Controllers currently own endpoint definitions, request validation, related
record checks, bounded mutation logic, and response status selection.
Repositories own persistence access. `ParentTaskGuard` extracts the shared
rule that task-associated resources require an existing parent task.

The most complex current cross-domain workflows, including recurring
completion and task-edit reconciliation, are orchestrated by the frontend
through bounded API operations.

## Decision

The backend uses a direct controller/repository structure without a dedicated
service layer.

Business rules are extracted only when they have a reusable, coherent owner,
as demonstrated by `ParentTaskGuard`. Existing controller behavior is not
moved into services solely to conform to a conventional layer structure.

A future reusable business workflow or cross-repository transaction may
justify a service owner, but that layer does not exist in the current
architecture.

## Alternatives Considered

### Add a Service Class for Every Controller

This would create a conventional controller/service/repository shape, but most
services would only forward calls or relocate bounded controller logic without
gaining a distinct responsibility.

### Move Frontend Workflows Into Backend Services

Some future workflows may belong in backend transactions, but moving current
frontend orchestration wholesale would also change API contracts, local-state
behavior, and ownership. It is not required by the current bounded request
model.

### Put Shared Rules Directly in Every Controller

This would keep request paths local, but repeated rules such as parent-task
existence checks would become duplicated and inconsistent. Coherent shared
rules are extracted when justified.

## Consequences

### Benefits

- Backend request paths remain direct and visible.
- The number of architectural layers matches current backend complexity.
- Controllers retain clear ownership of bounded request behavior.
- Reusable rules can still be extracted without introducing nominal service
  wrappers.

### Costs

- Controllers contain validation and bounded mutation logic in addition to
  HTTP mapping.
- Cross-repository transactions or reusable business workflows would require
  a new ownership boundary.
- Future authentication, collaboration, dependency propagation, notification
  delivery, audit logging, or synchronization would stress this structure.

## What Would Break If Changed

Adding service classes without transferring meaningful ownership could:

- obscure direct request and persistence flow;
- duplicate mapping and mutation logic across nominal layers;
- make maintainers search multiple files for bounded CRUD behavior;
- create abstractions that do not own transactions or reusable rules.

Conversely, adding complex cross-repository workflows without introducing an
appropriate service or transaction owner could:

- leave transaction boundaries unclear;
- duplicate business rules among controllers;
- produce partial persistence updates.

## Related Docs

- [Architecture](../architecture.md)
- [Ownership Map](../ownership-map.md)
- [Lessons Learned](../Lessons%20Learned.md)
- [Future Architecture Pressure Points](../Future%20Architecture%20Pressure%20Points.md)

