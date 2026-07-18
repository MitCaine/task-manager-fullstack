# Projects And Tags

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Contributors changing task organization or catalog management |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Projects and tags are shared catalogs used to organize, filter, and present tasks.
This guide defines their relationships and frontend workflow ownership.

## Scope

It covers project/tag CRUD, assignment, deletion effects, bulk catalog operations,
and search/create behavior.

## Architectural Invariants

- A task has at most one project and may have many tags.
- Catalog persistence is accessed through project and tag repositories.
- Task assignment is persisted through task repository operations.
- Creating a project or tag from a task draft selects it only in that scoped draft.
- Duplicate prevention is a frontend workflow rule, not a database-wide unique
  title constraint.

## Relationships

Projects are optional task relationships. SQLite project deletion sets
`tasks.project_id` to null. Tags use `task_tags`; relationship rows cascade when a
task or tag is deleted. REST models tags as a JPA many-to-many relationship and
stores project as a numeric task field.

## Catalog Workflow

`useProjectTagCatalog` loads both catalogs in parallel and owns create, update,
and delete operations. `CatalogManagementModal` owns management presentation,
search/sort/filter modes, bulk creation feedback, selection, and confirmation.

Bulk creation invokes existing create operations per title and reports created,
duplicate, and failed counts. It is not a batch repository or database transaction.

## Draft Assignment

Create and edit workflows may open inline project/tag forms. A successful scoped
creation updates the shared catalog and assigns the new entity to that draft.
Creating an entity from the management modal does not alter a task draft.

The task creation tag selector also offers a create action when a nonexisting
search term is entered; the created tag is selected immediately.

## Deletion

The frontend shows usage information and confirmation before catalog deletion.
Storage behavior differs physically but normalizes at the domain boundary:
project references clear, and tag membership is removed. Catalog deletion must
not delete tasks.

Project updates use a backend PUT, so omitted description/due-date values are not
reliably preserved. Tag updates use PATCH, but the backend currently ignores an
explicit null color; SQLite can clear it. Shared behavior should stay within the
publicly guaranteed subset until the backend endpoint is corrected.

## Code Map

- Workflow: `src/hooks/useProjectTagCatalog.ts`
- Management UI: `src/components/settings/CatalogManagementModal.tsx` and related files
- Task selectors/forms: `src/components/shared/`, `src/components/forms/`
- Task workflows: `useCreateTaskWorkflow.ts`, `useInlineEditWorkflow.ts`
- Repositories: project, tag, and task repository implementations
- Backend: `ProjectController.java`, `TagController.java`, `TaskController.java`

## Testing

Hook and App tests cover loading, duplicate prevention, scoped assignment, edit,
bulk creation, deletion confirmation, and task filtering. Shared repository
contracts cover CRUD; SQLite tests additionally cover foreign-key effects and
transactions.

## Known Limitations

- Titles are not unique at the persistence layer.
- Bulk catalog operations are repeated calls and may partially succeed.
- Catalog usage counts are derived client-side from loaded tasks.
- There is no pagination or server-side catalog search.

## Related Documents

- [Tasks and Scheduling](tasks-and-scheduling.md)
- [Repository Architecture](../architecture/repositories.md)
- [Historical Scalability Plan](../history/implementation-plans/project-tag-scalability.md)
