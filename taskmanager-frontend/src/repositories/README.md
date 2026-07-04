# Repository Migration Boundary

The repository layer lets the web app continue using the Spring Boot REST
backend while native builds can opt into SQLite persistence.

Current ownership:

- `domain/` owns persistence-independent frontend domain models and inputs.
- `repositories/contracts.ts` owns split repository interfaces.
- `repositories/api/` owns REST-backed repository implementations.
- `repositories/api/mappers/` maps REST DTOs to domain models and domain inputs
  back to REST payloads.
- `repositories/sqlite/` owns SQLite repositories, migrations, driver adapters,
  and the explicit native smoke harness.
- `RepositoryProvider` exposes one complete repository set through React context
  and defaults to REST.

Runtime migration status:

- REST remains the default runtime repository provider.
- SQLite can be selected only when `REACT_APP_ENABLE_SQLITE_PERSISTENCE=true`
  and Capacitor reports a supported native platform, currently iOS.
- Web/browser execution remains REST even when the SQLite persistence flag is
  enabled.
- SQLite initialization must complete before repositories are exposed.
- Provider-owned runtime selections are closed on provider unmount. Injected
  repository props are caller-owned and are not closed by the provider.
- App state still uses legacy REST-shaped UI models. The legacy adapter maps
  non-numeric domain IDs to stable in-memory numeric aliases and maps those
  aliases back to domain IDs before repository writes.

Out of scope:

- Data migration
- Sync or dual writes
- Import/export
- Legacy UI model removal
- Making SQLite the unconditional native default

Native SQLite activation checklist:

1. Build/sync iOS with `REACT_APP_ENABLE_SQLITE_PERSISTENCE=true`.
2. Fresh install the app or clear app data.
3. Launch and verify the empty task state appears.
4. Create, edit, and delete a project.
5. Create, edit, recolor, and delete a tag.
6. Create a task.
7. Edit task title and description.
8. Verify start and end date-time behavior.
9. Move task status between not started, in progress, and completed.
10. Assign and remove a project.
11. Assign and remove tags.
12. Create and delete a note.
13. Create, snooze, and delete a reminder.
14. Create, edit, complete, and delete a subtask.
15. Create and delete an attachment/link.
16. Set, change, and clear recurrence.
17. Background and foreground the app.
18. Terminate and relaunch the app, then verify persisted state is rehydrated.
19. Delete a task and verify child resources and recurrence are removed by
    cascade behavior.
20. To test initialization failure safely, inject a failing SQLite driver in a
    development build and verify the root shows `Persistence initialization
    failed.` without falling back to REST.
