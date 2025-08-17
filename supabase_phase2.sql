-- Phase 2 schema & RLS enablement
-- Run this in the Supabase SQL editor (or psql) AFTER phase1 baseline.

-- 1. Enable RLS on progress tables (create tables if they somehow don't exist)
create table if not exists public.watch_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  -- Avoid parser confusion with special function names by quoting.
  "current_time" int not null default 0,
  "duration" int not null default 0,
  progress numeric generated always as (case when "duration" > 0 then greatest(0, least(1, "current_time"::numeric / nullif("duration",0))) else 0 end) stored,
  last_stream_url text,
  last_subtitles jsonb,
  completed boolean generated always as (progress >= 0.9) stored,
  updated_at timestamptz not null default now(),
  -- Compatibility convenience (optional)
  progress_seconds int generated always as ("current_time") stored,
  duration_seconds int generated always as ("duration") stored,
  primary key (user_id, content_id)
);

create table if not exists public.episode_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id text not null,
  season_number int not null,
  episode_number int not null,
  seconds int not null default 0,
  duration int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, series_id, season_number, episode_number)
);

alter table public.watch_progress enable row level security;
alter table public.episode_progress enable row level security;

-- Upsert (insert/update) + select limited to owner
do $$ begin
  create policy "watch_progress_select" on public.watch_progress for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "watch_progress_upsert" on public.watch_progress for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "watch_progress_update" on public.watch_progress for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "episode_progress_select" on public.episode_progress for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "episode_progress_upsert" on public.episode_progress for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "episode_progress_update" on public.episode_progress for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Allow owners to delete their own progress rows (needed for 'Clear watch history')
do $$ begin
  create policy "watch_progress_delete" on public.watch_progress for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "episode_progress_delete" on public.episode_progress for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 2. Watchlist (favorites removed in consolidation)
create table if not exists public.user_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  content_type text not null check (content_type in ('movie','series')),
  added_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
alter table public.user_watchlist enable row level security;

do $$ begin
  create policy "user_watchlist_select" on public.user_watchlist for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "user_watchlist_modify" on public.user_watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 3. Optional index optimizations
create index if not exists idx_watch_progress_user_updated on public.watch_progress(user_id, updated_at desc, completed);
create index if not exists idx_episode_progress_user_updated on public.episode_progress(user_id, updated_at desc);
create index if not exists idx_user_watchlist_user_added on public.user_watchlist(user_id, added_at desc);

-- 4. NOTE: If you previously had open access (no RLS) be sure no anonymous clients rely on selecting all rows.
-- This setup restricts all access strictly to the authenticated owner.

-- 5. To roll back (NOT recommended):
-- alter table public.watch_progress disable row level security; -- etc.
