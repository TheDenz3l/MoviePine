-- Phase 1 schema for user accounts & settings
-- Run this inside Supabase SQL editor or CLI before using the new features.

create extension if not exists "pgcrypto";

-- Profiles table (basic public profile info)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User settings table (JSON buckets per domain)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  playback_json jsonb not null default '{}',
  subtitles_json jsonb not null default '{}',
  ui_json jsonb not null default '{}',
  privacy_json jsonb not null default '{}',
  experiments_json jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Device / session tracking (logical sessions, not Supabase refresh tokens)
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  ip inet,
  user_agent text,
  device_label text,
  revoked_at timestamptz,
  constraint user_sessions_not_revoked check (revoked_at is null or revoked_at >= created_at)
);
create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_sessions enable row level security;

-- Policies (basic owner-only access)
do $$ begin
  create policy "profiles_owner_all" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_settings_owner_all" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_sessions_owner_select" on public.user_sessions for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_sessions_owner_modify" on public.user_sessions for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "user_sessions_owner_update" on public.user_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- OPTIONAL: Add RLS to existing progress tables if not already
-- alter table public.watch_progress enable row level security; -- (uncomment if table exists)
-- alter table public.episode_progress enable row level security;
-- create policy "watch_progress_owner" on public.watch_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy "episode_progress_owner" on public.episode_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed default settings auto-create function (optional convenience)
create or replace function public.ensure_user_settings()
returns trigger as $$
begin
  insert into public.user_settings(user_id) values (new.id)
  on conflict do nothing;
  insert into public.profiles(user_id, display_name) values (new.id, split_part(new.email,'@',1))
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.ensure_user_settings();

-- Done.
