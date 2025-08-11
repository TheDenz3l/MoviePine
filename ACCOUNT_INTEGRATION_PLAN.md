# User Account Integration (Future Work)

Goal: Introduce authenticated user accounts so all activity (watch progress, selected streams, lists, settings) is tied to a unique user instead of anonymous local storage.

## Scope To Migrate
- Watch progress (currently hybrid: localStorage + /api/progress with fallback user_id "anon").
- Recently played list (local only now).
- Saved lists / favorites (stubbed via alerts now).
- Stream selection state (stored via RecentlyPlayedService + Supabase watch_progress table).
- Subtitle + audio track preferences (not yet persisted; plan to store per user + per content type).

## Data Model (Supabase)
watch_progress (
  user_id uuid REFERENCES auth.users,
  content_id text,
  current_time numeric,
  duration numeric,
  progress numeric,
  last_stream_url text NULL,
  last_subtitles jsonb NULL,
  completed boolean,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
)

recently_played (
  user_id uuid,
  content_id text,
  title text,
  poster text,
  year int NULL,
  genre text[] NULL,
  last_watched timestamptz,
  progress numeric,
  current_time numeric,
  duration numeric,
  is_completed boolean,
  PRIMARY KEY (user_id, content_id)
)

user_settings (
  user_id uuid PRIMARY KEY,
  default_audio_language text NULL,
  default_subtitle_language text NULL,
  autoplay boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

(optional) user_lists (
  user_id uuid,
  list_id uuid,
  name text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, list_id)
)

(optional) user_list_items (
  user_id uuid,
  list_id uuid,
  content_id text,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, list_id, content_id)
)

## RLS Policy Outline
Enable RLS on all tables.
POLICY: user_id = auth.uid() FOR SELECT/INSERT/UPDATE/DELETE.

## Migration Strategy
1. Add tables + RLS (disabled locally until ready).
2. Keep anonymous flow: if no session, continue using local + fallback user_id 'anon'.
3. On sign-up/sign-in:
   - Fetch existing server progress for user.
   - Merge local anonymous entries (content_id) where server lacks data or local has newer updated_at.
   - Push merged entries (upsert) to server.
   - Clear local anonymous keys or mark as migrated.
4. Update /api/progress: derive user_id from auth (JWT / cookie) else 'anon'.
5. Gradually move RecentlyPlayedService to call server endpoints; keep local cache for UX.

## Client Changes Needed
- Auth provider (Supabase Auth UI or custom) wrapper in root layout.
- Hook: useUser() -> returns loading | user | null.
- Progress sync: include auth header automatically via Supabase client for direct table ops OR continue REST via edge route.
- Add optimistic resume: local first, then reconcile with server newer timestamp.

## Additional Enhancements Later
- Per-profile multi-user (Netflix style): add profile_id dimension.
- Device activity log (device_id, last_active).
- Analytics events (start_play, pause, resume, complete) into a separate ingestion table.

## Open Questions
- Do we regenerate signed stream URLs on resume? (If yes store descriptor not raw URL.)
- Do we support multiple stream qualities per content? (If yes store quality key.)
- When is a title considered "completed" (current >= 90% vs credits detection)?

## Actionable Next Steps (When Starting)
- [ ] Create SQL migration file for tables + RLS.
- [ ] Introduce Supabase auth in app layout.
- [ ] Replace USER_ID_FALLBACK in /api/progress with authenticated user id.
- [ ] Build merge routine for anonymous -> account on first login.
- [ ] Extend progress-sync to include updated_at and version conflict resolution.

(Prepared: Aug 9 2025)
