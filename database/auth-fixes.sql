-- Authentication System Database Fixes
-- This script resolves RLS policy violations and creates missing tables
-- Safe to run multiple times

-- =============================================================================
-- 1. CREATE MISSING AUDIT_LOGS TABLE
-- =============================================================================

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can manage all audit logs" ON public.audit_logs;

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all audit logs" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. FIX USER_SESSIONS RLS POLICIES
-- =============================================================================

-- Ensure user_sessions table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_label TEXT,
  user_agent TEXT,
  ip INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "user_sessions_policy" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.user_sessions;

-- Create proper RLS policies for user_sessions
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 3. VERIFY USER_SETTINGS TABLE
-- =============================================================================

-- Ensure user_settings table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  playback_json JSONB DEFAULT '{}',
  subtitles_json JSONB DEFAULT '{}',
  ui_json JSONB DEFAULT '{}',
  privacy_json JSONB DEFAULT '{}',
  experiments_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS and create policies
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Service role can manage all settings" ON public.user_settings;

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all settings" ON public.user_settings
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 4. CREATE UPDATED_AT TRIGGER FOR USER_SETTINGS
-- =============================================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Grant permissions to service role
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.user_settings TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================================================
-- 6. VERIFICATION QUERIES
-- =============================================================================

-- These queries can be used to verify the setup
-- Uncomment to run verification

/*
-- Verify tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audit_logs', 'user_sessions', 'user_settings');

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('audit_logs', 'user_sessions', 'user_settings');

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('audit_logs', 'user_sessions', 'user_settings');
*/

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Authentication database fixes completed successfully';
    RAISE NOTICE 'Tables created/verified: audit_logs, user_sessions, user_settings';
    RAISE NOTICE 'RLS policies updated for proper user access';
    RAISE NOTICE 'Indexes and triggers created for performance';
END $$;