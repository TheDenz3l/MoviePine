-- Phase 5: Security & Reliability Hardening - Audit Logs
-- Create audit log table for tracking security events

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON public.audit_logs(ip_address);

-- RLS Policies for audit logs (only admins should read, anyone can insert)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert audit logs (for logging events)
CREATE POLICY "Users can insert audit logs" 
    ON public.audit_logs 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Allow admins to read audit logs (you'll need to define your admin role)
CREATE POLICY "Admins can read audit logs" 
    ON public.audit_logs 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_settings 
            WHERE user_settings.user_id = auth.uid() 
            AND user_settings.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Common audit event types:
-- 'login' - User login attempt
-- 'logout' - User logout
-- 'email_change_request' - Request to change email
-- 'email_changed' - Email successfully changed
-- 'password_change' - Password changed
-- 'session_revoked' - Session revoked
-- 'profile_update' - Profile information updated
-- 'settings_change' - User settings changed
-- 'failed_login' - Failed login attempt
-- 'account_locked' - Account locked due to security
