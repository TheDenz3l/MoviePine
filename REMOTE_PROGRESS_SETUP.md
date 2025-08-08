## Remote Episode Progress

Implemented features:
1. Throttled cloud saves (every ~12s, start, near completion)
2. Local + remote merge (furthest seconds wins)
3. Last watched auto-detected
4. Episode list cache with 30m TTL

### Setup
1. Run `EPISODE_PROGRESS_TABLE.sql` in Supabase SQL editor.
2. Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...your url...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...public anon key...
NEXT_PUBLIC_DEMO_USER_ID=demo-user-1
```
3. Restart dev server.

### Security
Replace any leaked service_role key immediately. Use only anon key in browser.

### Future Ideas
* Batch flush on pause/end
* Auth-backed user ids
* Multi-episode resume UI
* Server-side pruning of stale rows
