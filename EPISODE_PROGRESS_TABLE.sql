-- Episode progress table (idempotent create)
create table if not exists public.episode_progress (
  user_id text not null,
  series_id text not null,
  season int not null,
  episode int not null,
  seconds int not null default 0,
  duration int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, series_id, season, episode)
);

create index if not exists episode_progress_user_series_idx
  on public.episode_progress (user_id, series_id);

-- Optionally enable RLS (only with real anon key)
-- alter table public.episode_progress enable row level security;
-- create policy "user-is-owner" on public.episode_progress for
--   select using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Never expose service_role keys client-side.
