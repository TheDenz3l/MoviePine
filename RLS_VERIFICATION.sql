-- Quick verification script for RLS on progress & watchlist tables.
-- Usage: psql $SUPABASE_DB_URL -f RLS_VERIFICATION.sql
-- Replace the UUIDs below with two real user IDs before running.

\echo '--- RLS Verification Start ---'
\set owner_uuid '00000000-0000-0000-0000-000000000001'
\set other_uuid '00000000-0000-0000-0000-000000000002'

-- Seed (idempotent)
insert into public.watch_progress(user_id, content_id, current_time, duration) values (:'owner_uuid','demo_movie',120,600) on conflict do nothing;
insert into public.episode_progress(user_id, series_id, season_number, episode_number, seconds, duration) values (:'owner_uuid','seriesA',1,1,42,1400) on conflict do nothing;
insert into public.user_watchlist(user_id, content_id, content_type) values (:'owner_uuid','tt123456','movie') on conflict do nothing;

\echo 'Owner rows (should be >=1):'
select content_id, current_time, duration, progress, completed from public.watch_progress where user_id = :'owner_uuid';

\echo 'Policies (watch_progress):'
select policyname, cmd from pg_policies where tablename='watch_progress';
\echo 'Policies (episode_progress):'
select policyname, cmd from pg_policies where tablename='episode_progress';
\echo 'Policies (user_watchlist):'
select policyname, cmd from pg_policies where tablename='user_watchlist';

\echo 'Manual step: repeat owner SELECT using other user token => expect 0 rows.'
\echo '--- RLS Verification Complete ---'
