import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireEmailVerification, isEmailVerified } from '@/lib/emailVerification'
import { ServerAuditLogger } from '@/lib/serverAuditLogger'
import { getUser } from '@/lib/sessionUtils'

function getSupabase(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = req.headers.get('authorization')
  return createClient(url, anon, { global: { headers: { Authorization: authHeader || '' } }, auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    console.log('[Settings API] GET request received');
    const authHeader = req.headers.get('authorization');
    console.log('[Settings API] Authorization header:', authHeader ? 'present' : 'missing');
    
    // Use our improved session management
    const { user: userEmail, error: userError } = await getUser(req);
    
    console.log('[Settings API] getUser result:', {
      user: userEmail,
      error: userError,
      hasUser: !!userEmail
    });
    
    if (!userEmail || userError) {
      console.log('[Settings API] No user found, returning 401');
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    // Get the full user object for database operations
    const supabase = getSupabase(req)
    const { data: { user }, error: fullUserError } = await supabase.auth.getUser()
    
    if (!user || fullUserError) {
      console.log('[Settings API] Could not get full user object:', fullUserError?.message);
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    // Log settings access
    await ServerAuditLogger.logEvent(req, 'settings_access', user.id);

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    console.log('[Settings API] Settings retrieved successfully for user:', userEmail);
    return new Response(JSON.stringify({ success: true, settings }), { status: 200 })
  } catch (e: any) {
    console.error('[Settings API] Error:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabase(req)
    const body = await req.json().catch(() => ({}))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    // Check email verification for sensitive settings changes
    const verificationCheck = requireEmailVerification(user, 'changing settings');
    if (!verificationCheck.authorized) {
      await ServerAuditLogger.logEvent(req, 'settings_change_blocked', user.id, {
        reason: 'email_not_verified',
        error: verificationCheck.error
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: verificationCheck.error,
        errorCode: verificationCheck.errorCode
      }), { status: 403 });
    }

    // Log settings change attempt
    await ServerAuditLogger.logEvent(req, 'settings_change_attempt', user.id, {
      changes: Object.keys(body)
    });

    // Merge patch: read existing first
    const { data: existing } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    const merged = {
      playback_json: { ...(existing?.playback_json || {}), ...(body.playback || {}) },
      subtitles_json: { ...(existing?.subtitles_json || {}), ...(body.subtitles || {}) },
      ui_json: { ...(existing?.ui_json || {}), ...(body.ui || {}) },
      privacy_json: { ...(existing?.privacy_json || {}), ...(body.privacy || {}) },
      experiments_json: { ...(existing?.experiments_json || {}), ...(body.experiments || {}) }
    }
    const { data, error } = await supabase.from('user_settings').upsert({ user_id: user.id, ...merged, updated_at: new Date().toISOString() })
    if (error) throw error
    
    // Log successful settings change
    await ServerAuditLogger.logEvent(req, 'settings_change', user.id, {
      changes: Object.keys(body)
    });
    
    return new Response(JSON.stringify({ success: true, settings: merged }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}
