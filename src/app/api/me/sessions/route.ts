import { NextRequest, NextResponse } from 'next/server';
import { getSessionServer, getSupabaseServerClient } from '@/lib/sessionUtils';
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client with proper authentication
function getAuthenticatedSupabase(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader || ''
        }
      },
      auth: {
        persistSession: false
      }
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    console.log('[User Sessions API - GET] Request received');
    
    const sessionData = await getSessionServer(req);

    if (sessionData.error || !sessionData.user) {
      console.warn('[User Sessions API - GET] Unauthorized access attempt:', sessionData.error);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = getAuthenticatedSupabase(req);
    const { data, error } = await supabase.from('user_sessions')
      .select('*')
      .eq('user_id', sessionData.user.id)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[User Sessions API - GET] Database error:', error.message);
      if (error.message.includes('row-level security')) {
        return NextResponse.json({
          error: 'Permission denied. Please sign in again.'
        }, { status: 403 });
      }
      return NextResponse.json({
        error: 'Database error occurred'
      }, { status: 500 });
    }

    console.log(`[User Sessions API - GET] Successfully fetched ${data?.length || 0} sessions for user: ${sessionData.user.email}`);
    return NextResponse.json({ success: true, sessions: data || [] }, { status: 200 });
    
  } catch (e: any) {
    console.error('[User Sessions API - GET] Unexpected error:', e.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[User Sessions API - POST] Request received');
    
    const sessionData = await getSessionServer(req);

    if (sessionData.error || !sessionData.user) {
      console.warn('[User Sessions API - POST] Unauthorized access attempt:', sessionData.error);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = getAuthenticatedSupabase(req);
    const body = await req.json().catch(() => ({}));
    const { deviceLabel } = body;
    const ua = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    console.log('[User Sessions API - POST] Attempting to create session for user:', sessionData.user.email);

    const { data, error } = await supabase.from('user_sessions')
      .insert({
        user_id: sessionData.user.id,
        user_agent: ua,
        ip,
        device_label: deviceLabel,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[User Sessions API - POST] Error inserting user session:', error.message);
      if (error.message.includes('row-level security')) {
        return NextResponse.json({
          error: 'Permission denied. Database security policy violation.'
        }, { status: 403 });
      }
      return NextResponse.json({
        error: 'Failed to create session record'
      }, { status: 500 });
    }

    console.log(`[User Sessions API - POST] Successfully created new session for user: ${sessionData.user.email}`);
    return NextResponse.json({ success: true, session: data }, { status: 201 });
    
  } catch (e: any) {
    console.error('[User Sessions API - POST] Unexpected error:', e.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) { // heartbeat or revoke
  try {
    console.log('[User Sessions API - PATCH] Request received');
    
    const sessionData = await getSessionServer(req);

    if (sessionData.error || !sessionData.user) {
      console.warn('[User Sessions API - PATCH] Unauthorized access attempt:', sessionData.error);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = getAuthenticatedSupabase(req);
    const body = await req.json().catch(() => ({}));
    const { id, revoke, label } = body;

    if (!id) {
      console.warn('[User Sessions API - PATCH] Missing ID for session update/revoke');
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const patch: any = {};
    if (revoke) {
      patch.revoked_at = new Date().toISOString();
      console.log(`[User Sessions API - PATCH] Revoking session ID: ${id} for user: ${sessionData.user.email}`);
    } else if (label) {
      patch.device_label = label;
      console.log(`[User Sessions API - PATCH] Updating device label for session ID: ${id} for user: ${sessionData.user.email}`);
    } else {
      patch.last_seen_at = new Date().toISOString();
      console.log(`[User Sessions API - PATCH] Heartbeat for session ID: ${id} for user: ${sessionData.user.email}`);
    }

    const { data, error } = await supabase.from('user_sessions')
      .update(patch)
      .eq('id', id)
      .eq('user_id', sessionData.user.id)
      .select()
      .single();

    if (error) {
      console.error('[User Sessions API - PATCH] Error updating user session:', error.message);
      if (error.message.includes('row-level security')) {
        return NextResponse.json({
          error: 'Permission denied. Cannot update this session.'
        }, { status: 403 });
      }
      return NextResponse.json({
        error: 'Failed to update session'
      }, { status: 500 });
    }

    console.log(`[User Sessions API - PATCH] Session updated successfully: ${data.id}`);
    return NextResponse.json({ success: true, session: data }, { status: 200 });
    
  } catch (e: any) {
    console.error('[User Sessions API - PATCH] Unexpected error:', e.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
