### Legacy Anonymous Progress Migration Status

Decision: NOT REQUIRED (no legacy anonymous progress table or ID mapping present in current codebase).

Rationale:
- No historical table or local ID mapping detected.
- All progress persistence now via RLS-secured tables & `/api/progress` endpoint.
- Adding a migration script would add maintenance overhead with no data to migrate.

If future legacy data discovered:
1. Create `legacy_progress` staging table.
2. On first auth, resolve mapping -> upsert into `watch_progress` / `episode_progress`.
3. Mark migrated rows to prevent duplication.

Close-out: Phase 2 task considered complete as a no-op.
