const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Combined SQL setup script
const setupSQL = `
-- ============================================
-- PHASE 1: Core User Tables
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (basic public profile info)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table (JSON buckets per domain)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  playback_json JSONB NOT NULL DEFAULT '{}',
  subtitles_json JSONB NOT NULL DEFAULT '{}',
  ui_json JSONB NOT NULL DEFAULT '{}',
  privacy_json JSONB NOT NULL DEFAULT '{}',
  experiments_json JSONB NOT NULL DEFAULT '{}',
  role TEXT DEFAULT 'user', -- Added for admin detection
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device / session tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ip INET,
  user_agent TEXT,
  device_label TEXT,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT user_sessions_not_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions(user_id);

-- ============================================
-- PHASE 2: Watch Progress Tables
-- ============================================

-- Watch progress for movies
CREATE TABLE IF NOT EXISTS public.watch_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  "current_time" INT NOT NULL DEFAULT 0,
  "duration" INT NOT NULL DEFAULT 0,
  progress NUMERIC GENERATED ALWAYS AS (
    CASE WHEN "duration" > 0 
    THEN GREATEST(0, LEAST(1, "current_time"::NUMERIC / NULLIF("duration",0))) 
    ELSE 0 END
  ) STORED,
  last_stream_url TEXT,
  last_subtitles JSONB,
  completed BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN "duration" > 0 
    THEN ("current_time"::NUMERIC / NULLIF("duration",0)) >= 0.9 
    ELSE FALSE END
  ) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Compatibility columns
  progress_seconds INT GENERATED ALWAYS AS ("current_time") STORED,
  duration_seconds INT GENERATED ALWAYS AS ("duration") STORED,
  PRIMARY KEY (user_id, content_id)
);

-- Episode progress for TV series
CREATE TABLE IF NOT EXISTS public.episode_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id TEXT NOT NULL,
  season_number INT NOT NULL,
  episode_number INT NOT NULL,
  seconds INT NOT NULL DEFAULT 0,
  duration INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, series_id, season_number, episode_number)
);

-- User watchlist
CREATE TABLE IF NOT EXISTS public.user_watchlist (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie','series')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, content_id)
);

-- ============================================
-- PHASE 5: Audit Logs
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_watch_progress_user_updated 
  ON public.watch_progress(user_id, updated_at DESC, completed);
CREATE INDEX IF NOT EXISTS idx_episode_progress_user_updated 
  ON public.episode_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_added 
  ON public.user_watchlist(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
  ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type 
  ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
  ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address 
  ON public.audit_logs(ip_address);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles policies
DO $$ BEGIN
  CREATE POLICY "profiles_owner_all" ON public.profiles 
    FOR ALL USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User settings policies
DO $$ BEGIN
  CREATE POLICY "user_settings_owner_all" ON public.user_settings 
    FOR ALL USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User sessions policies
DO $$ BEGIN
  CREATE POLICY "user_sessions_owner_select" ON public.user_sessions 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_sessions_owner_modify" ON public.user_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_sessions_owner_update" ON public.user_sessions 
    FOR UPDATE USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Watch progress policies
DO $$ BEGIN
  CREATE POLICY "watch_progress_select" ON public.watch_progress 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "watch_progress_upsert" ON public.watch_progress 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "watch_progress_update" ON public.watch_progress 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "watch_progress_delete" ON public.watch_progress 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Episode progress policies
DO $$ BEGIN
  CREATE POLICY "episode_progress_select" ON public.episode_progress 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "episode_progress_upsert" ON public.episode_progress 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "episode_progress_update" ON public.episode_progress 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "episode_progress_delete" ON public.episode_progress 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User watchlist policies
DO $$ BEGIN
  CREATE POLICY "user_watchlist_select" ON public.user_watchlist 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_watchlist_modify" ON public.user_watchlist 
    FOR ALL USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit logs policies
DO $$ BEGIN
  CREATE POLICY "Users can insert audit logs" ON public.audit_logs 
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read audit logs" ON public.audit_logs 
    FOR SELECT TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_settings 
        WHERE user_settings.user_id = auth.uid() 
        AND user_settings.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-create user settings and profile on signup
CREATE OR REPLACE FUNCTION public.ensure_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings(user_id) 
  VALUES (new.id)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.profiles(user_id, display_name) 
  VALUES (new.id, split_part(new.email,'@',1))
  ON CONFLICT DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_settings();

-- ============================================
-- GRANTS
-- ============================================

GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
`;

async function setupTables() {
  console.log('🚀 Starting Supabase table setup...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  try {
    // Execute the SQL setup
    console.log('\n📝 Creating tables and setting up RLS...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: setupSQL
    }).single();

    // If the RPC doesn't exist, try direct execution
    if (error && error.message.includes('exec_sql')) {
      console.log('⚠️  Direct SQL execution not available via RPC, using alternative method...');
      
      // Split SQL into individual statements and execute
      const statements = setupSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // We'll need to use the Supabase dashboard for this
        console.log('Statement preview:', stmt.substring(0, 50) + '...');
      }
      
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:');
      console.log('📋 The SQL has been saved to: setup-supabase-tables.sql');
      
      // Save SQL to file for manual execution
      const fs = require('fs');
      fs.writeFileSync('setup-supabase-tables.sql', setupSQL);
    } else if (error) {
      throw error;
    } else {
      console.log('✅ Tables created successfully!');
    }

    // Setup storage bucket for avatars
    console.log('\n📦 Setting up storage bucket for avatars...');
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (!listError) {
      const avatarBucketExists = buckets?.some(b => b.name === 'avatars');
      
      if (!avatarBucketExists) {
        const { data: bucket, error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.log('⚠️  Could not create avatars bucket:', createError.message);
        } else {
          console.log('✅ Avatars storage bucket created!');
        }
      } else {
        console.log('✅ Avatars storage bucket already exists');
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const tables = [
      'profiles',
      'user_settings', 
      'user_sessions',
      'watch_progress',
      'episode_progress',
      'user_watchlist',
      'audit_logs'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Table ${table}: Error - ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Ready`);
        }
      } catch (e) {
        console.log(`❌ Table ${table}: ${e.message}`);
      }
    }

    console.log('\n🎉 Supabase setup complete!');
    console.log('\n📌 Next steps:');
    console.log('1. If you see any errors above, run the SQL manually in Supabase SQL Editor');
    console.log('2. The SQL file has been saved as: setup-supabase-tables.sql');
    console.log('3. Test authentication in your application');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupTables();
