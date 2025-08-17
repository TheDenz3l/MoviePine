-- Phase 2 migration patch: bring existing progress tables up to expected schema.
-- Run AFTER confirming you have backups. Idempotent via conditional checks.

-- WATCH PROGRESS ------------------------------------------------------------
DO $$
BEGIN
  -- 1. Rename legacy columns if present instead of adding duplicates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='current_time'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='progress_seconds'
    ) THEN
  ALTER TABLE public.watch_progress RENAME COLUMN progress_seconds TO "current_time";
    ELSE
  ALTER TABLE public.watch_progress ADD COLUMN "current_time" int NOT NULL DEFAULT 0;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='duration'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='duration_seconds'
    ) THEN
  ALTER TABLE public.watch_progress RENAME COLUMN duration_seconds TO "duration";
    ELSE
  ALTER TABLE public.watch_progress ADD COLUMN "duration" int NOT NULL DEFAULT 0;
    END IF;
  END IF;

  -- 2. Add supplemental columns if missing
  BEGIN
    ALTER TABLE public.watch_progress ADD COLUMN last_stream_url text;
  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN
    ALTER TABLE public.watch_progress ADD COLUMN last_subtitles jsonb;
  EXCEPTION WHEN duplicate_column THEN NULL; END;

  -- 3. Generated columns: progress & completed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='progress'
  ) THEN
    ALTER TABLE public.watch_progress ADD COLUMN progress numeric GENERATED ALWAYS AS (
      CASE WHEN "duration" > 0 THEN GREATEST(0, LEAST(1, "current_time"::numeric / NULLIF("duration",0))) ELSE 0 END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='completed'
  ) THEN
    ALTER TABLE public.watch_progress ADD COLUMN completed boolean GENERATED ALWAYS AS (
      CASE WHEN "duration" > 0 THEN ("current_time"::numeric / NULLIF("duration",0)) >= 0.9 ELSE false END
    ) STORED;
  END IF;

  -- 4. Compatibility generated columns (only add if absent & originals kept)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='progress_seconds'
  ) THEN
  ALTER TABLE public.watch_progress ADD COLUMN progress_seconds int GENERATED ALWAYS AS ("current_time") STORED;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='watch_progress' AND column_name='duration_seconds'
  ) THEN
  ALTER TABLE public.watch_progress ADD COLUMN duration_seconds int GENERATED ALWAYS AS ("duration") STORED;
  END IF;
END $$;

-- EPISODE PROGRESS ----------------------------------------------------------
DO $$
BEGIN
  -- Legacy rename support
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='episode_progress' AND column_name='seconds'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='episode_progress' AND column_name='progress_seconds'
    ) THEN
      ALTER TABLE public.episode_progress RENAME COLUMN progress_seconds TO seconds;
    ELSE
      ALTER TABLE public.episode_progress ADD COLUMN seconds int NOT NULL DEFAULT 0;
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='episode_progress' AND column_name='duration'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='episode_progress' AND column_name='duration_seconds'
    ) THEN
      ALTER TABLE public.episode_progress RENAME COLUMN duration_seconds TO duration;
    ELSE
      ALTER TABLE public.episode_progress ADD COLUMN duration int NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;

-- RLS (ensure still enabled)
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_progress ENABLE ROW LEVEL SECURITY;

-- Recreate / ensure policies (idempotent)
DO $$ BEGIN CREATE POLICY "watch_progress_select" ON public.watch_progress FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "watch_progress_upsert" ON public.watch_progress FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "watch_progress_update" ON public.watch_progress FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "watch_progress_delete" ON public.watch_progress FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "episode_progress_select" ON public.episode_progress FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "episode_progress_upsert" ON public.episode_progress FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "episode_progress_update" ON public.episode_progress FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "episode_progress_delete" ON public.episode_progress FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_updated ON public.watch_progress(user_id, updated_at DESC, completed);
CREATE INDEX IF NOT EXISTS idx_episode_progress_user_updated ON public.episode_progress(user_id, updated_at DESC);

-- Verification (optional)
-- select column_name, data_type, is_generated, generation_expression from information_schema.columns where table_name='watch_progress' order by ordinal_position;
-- select column_name, data_type from information_schema.columns where table_name='episode_progress';

-- Done.
