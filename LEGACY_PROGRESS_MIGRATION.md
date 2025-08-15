# Legacy Anonymous Progress Migration

If you previously stored watch progress for anonymous users (e.g., localStorage key or a table keyed by a temporary `anon_id`), this guide helps migrate those rows once the user creates an account.

## Strategy
1. When an anonymous user watches content, store progress in localStorage array (already happening client-side) or a server table with `anon_id`.
2. After successful sign-in (auth event), run a one-time migration function:
   - Read legacy records (localStorage or `legacy_progress` table).
   - For each record, call the authenticated `/api/progress` endpoint to upsert.
   - Mark migrated so it won't repeat.

## Example Client Migration Snippet
```ts
// Call after auth session is established
async function migrateLocalProgress() {
  const raw = localStorage.getItem('legacy_progress');
  if (!raw) return;
  const items: Array<{ contentId: string; currentTime: number; duration: number }> = JSON.parse(raw);
  for (const it of items) {
    try {
      await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) });
    } catch { /* ignore individual failures */ }
  }
  localStorage.removeItem('legacy_progress');
  localStorage.setItem('legacy_progress_migrated', '1');
}
```

## Server-Side Table Migration (Optional)
If you had a `legacy_progress` table:
```sql
-- Example structure
-- legacy_progress(anon_id text, content_id text, current_time int, duration int, updated_at timestamptz)
```
Create a function to migrate rows for a given mapping of anon_id -> user_id. Example pseudo-SQL:
```sql
insert into watch_progress(user_id, content_id, current_time, duration, progress, updated_at)
select $1 as user_id, content_id, current_time, duration,
       case when duration > 0 then least(1, current_time::decimal / nullif(duration,0)) else 0 end,
       now()
from legacy_progress
where anon_id = $2
on conflict (user_id, content_id) do update set
  current_time = excluded.current_time,
  duration = excluded.duration,
  progress = excluded.progress,
  updated_at = now();
```

## Verification Checklist
- [ ] User signs in and previous progress appears in Continue Watching.
- [ ] Duplicate migration does not create duplicates (idempotent upserts).
- [ ] Large legacy sets (100s) do not block UI (chunk if needed).

## Rollback
Since migration only adds/upserts rows, rollback is typically unnecessary. You can delete rows for a user from `watch_progress` if required.

---
Add this migration call in the auth state change handler after the session is available.
