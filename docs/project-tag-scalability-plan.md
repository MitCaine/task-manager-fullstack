# Project and Tag Scalability Plan

## Purpose

This document proposes a scalable user experience and technical direction for
project and tag catalogs as they grow beyond the size that simple dropdown
lists can handle. It is a plan only. It does not change the current application,
data model, or APIs.

The recommended direction separates two responsibilities:

- **Assignment controls** help users quickly assign a project or tags while
  creating, editing, or filtering tasks.
- **Catalog management** provides a deliberate place to create, rename,
  recolor, merge, and delete projects or tags.

## Current Behavior Summary

### Data Model and Constraints

- A task has one nullable `projectID`. Project assignment is single-select.
- A task has a many-to-many relationship with tags through `TaskTag`. Tag
  assignment is multi-select.
- There is no current maximum number of tags per task in the frontend,
  controller, entity model, or SQL schema.
- Project and tag titles are limited to 25 characters by backend validation.
  Current inline frontend forms use smaller limits: 24 characters for projects
  and 18 characters for tags.
- Catalogs are loaded in full with `GET /projects` and `GET /tags`. There is no
  server-side search, sorting, pagination, usage-count query, or bulk operation.

Primary references:

- `taskmanager-frontend/src/types/task.ts`
- `taskmanager-frontend/src/hooks/useProjectTagCatalog.ts`
- `src/main/java/com/example/taskmanager/Task.java`
- `src/main/java/com/example/taskmanager/Project.java`
- `src/main/java/com/example/taskmanager/Tag.java`
- `SQL Files/databasemodel.sql`

### Project Assignment and Catalog Behavior

Project assignment is available in task creation, inline/mobile edit, the detail
panel, and task-list filters.

- Creation uses a checkbox-style dropdown but enforces one selected project in
  draft state.
- Inline/mobile edit and detail edit also keep one project ID in edit draft
  state.
- Detail-panel changes autosave; inline/mobile edit persists on Save.
- Project filters are single-select and include an `All` option.
- New projects can be created inline from create and edit project controls.
- Project deletion is exposed directly beside project choices in create and
  detail controls.
- Deletion has no confirmation, usage warning, or task-count preview.
- After a successful delete, frontend state removes the project from the
  catalog, clears affected task project IDs, and clears active draft/filter
  selections.

Backend project routes currently include:

- `GET /projects`
- `GET /projects/{id}`
- `POST /projects`
- `PUT /projects/{id}`
- `DELETE /projects/{id}`

The SQL foreign key uses `ON DELETE SET NULL`, so deleting an in-use project
detaches it from existing tasks. The controller does not explicitly report the
number of affected tasks or require confirmation.

Primary references:

- `taskmanager-frontend/src/App.tsx`
- `taskmanager-frontend/src/components/task-list/TaskListControls.tsx`
- `taskmanager-frontend/src/api/tasks.ts`
- `src/main/java/com/example/taskmanager/ProjectController.java`
- `src/test/java/com/example/taskmanager/ProjectControllerTest.java`

### Tag Assignment and Catalog Behavior

Tag assignment is available in task creation, inline/mobile edit, the detail
panel, and task-list filters.

- Creation, edit, and detail controls render all tags as checkbox choices.
- Selected tags are also rendered in a separate removable-chip section.
- Detail-panel changes autosave; inline/mobile edit persists on Save.
- Task creation persists each selected tag with an individual association
  request after creating the base task.
- Task editing reconciles added and removed tags with individual association
  requests after saving the base task.
- Tag filters are single-select even though task assignment is multi-select.
- New tags can be created inline and assigned immediately.
- Tag colors can be changed from the assignment dropdown.
- Tag deletion is exposed directly beside tag choices.
- Deletion has no confirmation, usage warning, or task-count preview.
- After a successful delete, frontend state removes the tag from tasks,
  create/edit drafts, and the active filter.

Backend tag and association routes currently include:

- `GET /tags`
- `POST /tags`
- `PATCH /tags/{id}`
- `DELETE /tags/{id}`
- `POST /tasks/{id}/tags/{tagId}`
- `DELETE /tasks/{id}/tags/{tagId}`

The `TaskTag` foreign key uses `ON DELETE CASCADE`, so deleting an in-use tag
removes its associations from existing tasks. The controller does not report
usage or require confirmation.

Primary references:

- `taskmanager-frontend/src/App.tsx`
- `taskmanager-frontend/src/components/create-task/TagProjectChips.tsx`
- `taskmanager-frontend/src/api/tasks.ts`
- `src/main/java/com/example/taskmanager/TagController.java`
- `src/main/java/com/example/taskmanager/TaskController.java`
- `src/test/java/com/example/taskmanager/TagControllerTest.java`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`

### Current Display Behavior

| Surface | Project display | Tag display |
| --- | --- | --- |
| Task cards | One project badge | Two tags by default, then an interactive `+N`; users can expand and collapse |
| Calendar task-list entries | One project chip | Every tag is rendered |
| Agenda/upcoming rows | One project chip | Tags are not rendered |
| Create preview | One project badge | Three tags, then `+N` |
| Detail panel | One project badge plus assignment control | All selected tags as removable chips |
| Inline/mobile edit | Selected project in control | All selected tags as removable chips |

Task cards and the create preview already have useful overflow patterns.
Calendar task-list entries need the clearest scalability improvement because
they currently render every tag. Compact calendar scopes that show counts or
summaries do not render tag chips.

Primary references:

- `taskmanager-frontend/src/components/task-list/TaskCardMain.tsx`
- `taskmanager-frontend/src/components/create-task/TaskTags.tsx`
- `taskmanager-frontend/src/components/create-task/AddTaskPreview.tsx`
- `taskmanager-frontend/src/components/Calendar.tsx`
- `taskmanager-frontend/src/components/detail-panel/DetailStatusBadges.tsx`

### Current Test Coverage

Existing tests protect:

- Project/tag API request paths and methods.
- Backend project/tag CRUD validation and not-found behavior.
- Task-tag add/remove association routes.
- Project and tag assignment during create and edit.
- Inline project/tag creation during edit.
- Project/tag filtering and long filter-option labels.
- Project badge sizing and tag-chip color presentation.
- Existing dropdown opening, closing, and mobile layout behavior.

Known gaps relevant to this plan:

- No large-catalog interaction tests.
- No search, keyboard navigation, or result-empty-state tests.
- No maximum-tags-per-task tests.
- No direct frontend tests for project/tag deletion reconciliation.
- No tests for deleting in-use projects or tags through the full stack.
- No usage-count, bulk-operation, merge, or partial-failure tests.
- Calendar tests do not protect tag overflow behavior.

Primary references:

- `taskmanager-frontend/src/App.test.tsx`
- `taskmanager-frontend/src/api/tasks.test.ts`
- `taskmanager-frontend/src/components/Calendar.test.tsx`
- `src/test/java/com/example/taskmanager/ProjectControllerTest.java`
- `src/test/java/com/example/taskmanager/TagControllerTest.java`
- `src/test/java/com/example/taskmanager/TaskControllerTest.java`
- `docs/test-coverage-map.md`

## Problems at 20+ Catalog Items

The current controls render every item in a dropdown without search or
grouping. At 20 or more items this creates several problems:

- Finding an item requires scanning and scrolling instead of typing.
- Repeated create/edit/filter implementations can diverge in behavior.
- Selected tags remain mixed into a long list of unselected tags.
- Inline creation, color editing, assignment, and deletion compete for space in
  the same dropdown.
- A delete button beside every assignment option makes accidental destructive
  actions more likely.
- Mobile menus consume substantial vertical space and make focus/scroll
  behavior harder to preserve.
- Full-catalog rendering remains acceptable at tens or low hundreds of items,
  but becomes increasingly expensive and difficult to navigate.
- The calendar can render an unbounded number of tag chips per task.
- Immediate deletion gives no indication of how many tasks will lose a project
  or tag.

## Recommended UX Model

### Searchable Project Picker

Use a searchable single-select picker for project assignment.

- Keep `No project` as a clear first option.
- Show the currently assigned project above search results or as the selected
  value.
- Filter locally by normalized title while catalogs remain modest and loaded in
  full.
- Support keyboard navigation: focus search, Arrow Up/Down, Enter to select,
  Escape to close.
- Close after selection because projects are single-select.
- Keep `Create project` available when no exact match exists, subject to title
  validation.
- Move deletion and other destructive management out of the assignment picker.
- Provide a `Manage Projects` entry point at the bottom of the picker.

The create, inline/mobile edit, detail edit, and project-filter controls should
share the same search/result behavior where practical, while retaining their
existing state and persistence ownership.

### Searchable Multi-Select Tag Picker

Use a searchable multi-select picker for tag assignment.

- Keep selected tags in a dedicated section above the searchable result list.
- Keep the picker open while selecting or removing multiple tags.
- Exclude selected tags from ordinary results or mark them clearly.
- Show the current count and the maximum count.
- Disable unselected results when the maximum is reached, while still allowing
  selected tags to be removed.
- Support keyboard navigation and an accessible checkbox/listbox model.
- Keep `Create tag` available when no exact match exists, subject to title and
  color validation.
- Move deletion and color/catalog maintenance into `Manage Tags`.
- Provide a `Manage Tags` entry point at the bottom of the picker.

### Selected Tags Section

Selected tags should remain visible independently of search results.

- Render removable chips in assignment contexts.
- Preserve selection order unless a deliberate product rule replaces it.
- Keep removals available when the maximum is reached.
- In detail edit, preserve current autosave semantics.
- In inline/mobile edit, preserve current draft-only behavior until Save.

### Maximum Tags Per Task

Recommend a maximum of **5 tags per task** for new assignments.

Five tags are enough for useful categorization while limiting visual noise and
the number of association requests. This limit must be introduced carefully:

- Existing tasks with more than five tags must remain readable and editable.
- Do not silently remove existing tags.
- For an existing over-limit task, allow removals but prevent additions until
  the task is at or below the limit.
- Validate the limit in both frontend assignment controls and backend
  association logic before treating it as a data-integrity rule.
- Return a clear conflict or validation response when the backend rejects an
  additional tag.

Phase 2 should not enforce only a frontend limit; other clients and direct API
requests would otherwise bypass it.

### Card and Calendar Overflow Display

Use a consistent compact overflow contract:

- Task cards: retain the existing two visible tags plus interactive `+N`.
- Create preview: retain three visible tags plus `+N`, or align to two if visual
  consistency is preferred during Phase 2.
- Calendar task-list entries: show at most two tag chips plus `+N`.
- Agenda/upcoming: keep tags hidden unless user research shows they are needed;
  project and priority already provide compact context.
- Detail and assignment views: show all selected tags because these are
  deliberate inspection/editing surfaces.

The `+N` indicator should expose the hidden tag names through an accessible
label or tooltip. Opening a task remains the reliable way to inspect all tags.

### Manage Projects / Manage Tags

Add dedicated management entry points instead of performing destructive catalog
actions inside assignment pickers.

Recommended modal or panel capabilities:

- Search and sort the catalog.
- Show title, tag color where applicable, and usage count.
- Create one item.
- Rename items.
- Recolor tags.
- Select multiple items for later bulk actions.
- Clearly distinguish unused items from in-use items.
- Show safe delete and merge actions only with explicit confirmation.

This management surface should not own task assignment draft state.

## Bulk Operation Plan

### Bulk Add Projects and Tags

Bulk add should accept a newline-separated or paste-friendly list, trim values,
reject blanks, identify duplicates, and show a preview before submission.

Recommended safeguards:

- Validate every title before submission.
- Detect duplicates case-insensitively against the submitted batch and current
  catalog.
- Let users choose colors for tags or apply a default color.
- Report created, skipped, and failed items separately.
- Do not automatically assign every newly created item to the current task.

The current API could create items through repeated individual requests, but
that would not be atomic and would produce awkward partial-failure handling.
A true bulk-create endpoint is recommended before bulk add is treated as a
reliable catalog-management feature.

### Bulk Delete Projects and Tags

Bulk delete is high risk because in-use catalog items affect existing tasks.

Current database behavior:

- Deleting a project sets affected task `projectID` values to `NULL`.
- Deleting a tag cascades deletion of affected `TaskTag` rows.

Required safeguards:

- Show usage count per selected project/tag before confirmation.
- Separate unused items from in-use items.
- For projects, state that affected tasks will become unassigned.
- For tags, state that the tag will be removed from affected tasks.
- Require explicit confirmation for in-use items.
- Prefer typing a confirmation phrase or a second confirmation step for large
  destructive batches.
- Return a server-generated impact summary and reject stale confirmations if
  usage changed materially.
- Audit partial failures and leave frontend state consistent with server state.

Bulk delete **should require backend support**. Repeating current delete calls
from the frontend cannot provide atomicity, authoritative usage counts, stale
usage protection, or a reliable all-or-partial result contract.

### Future Merge and Cleanup

Merge is safer than deletion when duplicate projects or tags are in use.

- Project merge should move tasks from source projects to one target project,
  then delete sources.
- Tag merge should attach the target tag where needed, remove source
  associations, then delete sources without creating duplicate associations.
- Cleanup tools can identify unused, duplicate, or similarly named items.
- These operations require transactional backend support and impact previews.

## Recommended Implementation Phases

### Phase 1: Searchable Assignment Pickers

Deliver:

- Searchable single-select project picker.
- Searchable multi-select tag picker.
- Dedicated selected-tags section.
- Shared search/result behavior across create, inline/mobile edit, detail edit,
  and filters where appropriate.
- `Manage Projects` and `Manage Tags` entry points that may initially be
  disabled or route to an informational placeholder.

Keep:

- Existing catalog loading APIs.
- Existing create/edit/detail state ownership.
- Existing save, autosave, and task-tag association behavior.
- Existing deletion behavior temporarily, but remove deletion buttons from the
  assignment picker only when a real management surface is available.

Likely files:

- `taskmanager-frontend/src/App.tsx`
- `taskmanager-frontend/src/components/task-list/TaskListControls.tsx`
- New focused picker components under `taskmanager-frontend/src/components/`
- `taskmanager-frontend/src/App.css`
- `taskmanager-frontend/src/App.test.tsx`

Testing:

- Search matching, case handling, empty results, and long names.
- Project single-select and close-on-select behavior.
- Tag multi-select, selected section, removal, and keep-open behavior.
- Keyboard and Escape behavior.
- Create draft, edit draft, detail autosave, Save, and Cancel invariants.
- Mobile focus, dropdown flow, scroll ownership, and clipping regressions.
- Filter selection remains single-select.

### Phase 2: Max 5 Tags and Card/Calendar `+N`

Deliver:

- Five-tag assignment limit with clear count and disabled-add behavior.
- Compatibility behavior for existing tasks over the limit.
- Backend enforcement for new tag associations.
- Calendar task-list entries capped at two tags plus `+N`.
- Accessible hidden-tag summaries.

Likely files:

- `taskmanager-frontend/src/App.tsx`
- Shared tag picker and display components
- `taskmanager-frontend/src/components/create-task/TaskTags.tsx`
- `taskmanager-frontend/src/components/create-task/AddTaskPreview.tsx`
- `taskmanager-frontend/src/components/Calendar.tsx`
- `taskmanager-frontend/src/components/Calendar.css`
- `src/main/java/com/example/taskmanager/TaskController.java`
- Backend validation/service support introduced for the tag limit
- Frontend and backend tests

Testing:

- Add up to five tags and reject the sixth.
- Remove a tag and add a replacement.
- Existing over-limit tasks remain intact and can remove tags.
- Direct API attempts cannot bypass the limit.
- Task cards, preview, and calendar show correct `+N`.
- Detail views still show all selected tags.

### Phase 3: Manage Projects/Tags Modal

Deliver:

- Searchable, sortable catalog management surface.
- Single-item create, rename, tag recolor, and safe delete.
- Usage counts and explicit delete warnings.
- Assignment pickers link to the management surface.

Likely files:

- New management components under `taskmanager-frontend/src/components/`
- `taskmanager-frontend/src/hooks/useProjectTagCatalog.ts`
- `taskmanager-frontend/src/api/tasks.ts`
- `taskmanager-frontend/src/App.tsx`
- `src/main/java/com/example/taskmanager/ProjectController.java`
- `src/main/java/com/example/taskmanager/TagController.java`
- Repository queries or dedicated usage-summary endpoints
- Frontend and backend tests

Testing:

- Search, sort, rename, recolor, and create.
- Usage counts match task assignments.
- Delete warnings distinguish used and unused items.
- Successful deletion reconciles tasks, drafts, filters, and picker results.
- Failed or stale deletion leaves the catalog unchanged.

### Phase 4: Bulk Add

Deliver:

- Paste/newline batch entry and preview.
- Duplicate detection and per-item validation.
- Backend bulk-create contract with explicit success/failure reporting.

Likely files:

- Management modal components
- `taskmanager-frontend/src/api/tasks.ts`
- `taskmanager-frontend/src/hooks/useProjectTagCatalog.ts`
- New backend request/response DTOs and controller routes
- Transaction/service support as appropriate
- Frontend and backend tests

Testing:

- Mixed valid, invalid, duplicate, and existing titles.
- Tag default colors and explicit colors.
- Atomic or documented partial-result behavior.
- Retry behavior and catalog refresh after success/failure.

### Phase 5: Bulk Delete With Usage Warnings

Deliver:

- Multi-select deletion from management surfaces.
- Authoritative server-side usage preview.
- Explicit confirmation for in-use items.
- Transactional or clearly defined partial-failure behavior.

Likely files:

- Management modal components
- `taskmanager-frontend/src/api/tasks.ts`
- Backend usage-query, preview, and bulk-delete endpoints
- Transaction/service support
- Project/tag/task repositories
- Frontend and backend tests

Testing:

- Delete unused items.
- Delete in-use projects and verify task project IDs become null.
- Delete in-use tags and verify associations are removed.
- Reject stale confirmations.
- Roll back or clearly report failures.
- Reconcile frontend tasks, drafts, filters, and catalogs after completion.

### Phase 6: Merge and Cleanup Tools

Deliver:

- Merge duplicate projects.
- Merge duplicate tags.
- Identify unused and similarly named catalog items.
- Preview affected tasks before changes.

Likely files:

- Management and cleanup components
- New backend merge/cleanup contracts
- Transactional service logic
- Project, tag, and task repositories
- Frontend and backend tests

Testing:

- Merge into an existing target.
- Prevent duplicate task-tag associations.
- Preserve task assignments and tag colors according to defined rules.
- Transaction rollback on failure.
- Usage preview and post-merge counts.

## Technical Recommendations

### Shared Picker Boundary

Extract focused picker behavior, not task draft ownership.

- Picker components should receive catalog items, selected IDs, callbacks,
  search state or search callbacks, and context-specific labels.
- Create draft state, edit draft state, detail autosave, Save/Cancel, and filter
  state should remain with their current owners.
- Project and tag pickers can share search/list primitives, but should preserve
  their different single-select and multi-select interaction models.

### Catalog Loading Strategy

For the first searchable-picker phase, client-side filtering over the existing
full catalog is sufficient and avoids API changes.

Reassess when catalogs reach hundreds or thousands of items:

- Add server-side search, stable sorting, and pagination.
- Debounce remote queries.
- Cache recent and selected items so selections remain visible across pages.
- Keep IDs as the source of truth; do not rely on title uniqueness.

### Deletion Integrity

Database cascades make current deletion technically possible, but they are not
enough for a safe management UX.

- The backend must calculate usage and own destructive-operation semantics.
- Frontend task reconciliation should refresh authoritative data after bulk
  operations instead of assuming every cascade outcome.
- Bulk and merge operations should use transactions.
- Usage-count and delete-preview contracts should be designed together.

## Explicit Non-Goals for the First Implementation Pass

The first implementation pass should only deliver searchable assignment
pickers. It should not:

- Add bulk create or bulk delete.
- Add merge or cleanup tools.
- Enforce the five-tag limit.
- Change database schema.
- Add backend APIs, pagination, or server-side search.
- Move create/edit/detail/filter state ownership.
- Change task Save, Cancel, Add Task, or detail autosave behavior.
- Change task-tag association persistence.
- Change project/tag deletion semantics.
- Redesign task cards, calendar entries, or agenda rows.
- Change mobile focus guards, visual viewport handling, scroll ownership, or
  swipe behavior.
- Require project or tag titles to be unique.

## Decision Summary

1. Introduce searchable assignment pickers before adding catalog-management
   complexity.
2. Keep project assignment single-select and tag assignment multi-select.
3. Move destructive actions out of assignment pickers into dedicated management
   surfaces.
4. Introduce a five-tag limit only with backend enforcement and compatibility
   behavior for existing tasks.
5. Reuse the existing `+N` display approach and add it to calendar task-list
   entries.
6. Require usage-aware backend support before bulk deletion.
7. Treat merge and cleanup as transactional backend features, not frontend
   request loops.
