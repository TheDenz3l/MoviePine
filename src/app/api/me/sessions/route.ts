import { NextRequest, NextResponse } from 'next/server';
import { getSessionServer, getSupabaseServerClient } from '@/lib/sessionUtils'; // Import getSupabaseServerClient as well

export async function GET(req: NextRequest) {
  try {
    const { session, user } = await getSessionServer(req);

    if (!user) {
      console.warn('[User Sessions API - GET] Unauthorized access attempt: No user session.');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient(req); // Use the server client to query user_sessions
    const { data, error } = await supabase.from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[User Sessions API - GET] Error fetching user sessions:', error.message);
      throw error;
    }

    console.log(`[User Sessions API - GET] Successfully fetched sessions for user: ${user.id}`);
    return NextResponse.json({ success: true, sessions: data || [] }, { status: 200 });
  } catch (e: any) {
    console.error('[User Sessions API - GET] Unexpected error:', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getSessionServer(req);

    if (!user) {
      console.warn('[User Sessions API - POST] Unauthorized access attempt: No user session.');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient(req);
    const body = await req.json().catch(() => ({}));
    const { deviceLabel } = body;
    const ua = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    const { data, error } = await supabase.from('user_sessions')
      .insert({ user_id: user.id, user_agent: ua, ip, device_label: deviceLabel })
      .select()
      .single();

    if (error) {
      console.error('[User Sessions API - POST] Error inserting user session:', error.message);
      throw error;
    }

    console.log(`[User Sessions API - POST] Successfully created new session for user: ${user.id}`);
    return NextResponse.json({ success: true, session: data }, { status: 201 });
  } catch (e: any) {
    console.error('[User Sessions API - POST] Unexpected error:', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) { // heartbeat or revoke
  try {
    const { user } = await getSessionServer(req);

    if (!user) {
      console.warn('[User Sessions API - PATCH] Unauthorized access attempt: No user session.');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient(req);
    const body = await req.json().catch(() => ({}));
    const { id, revoke, label } = body;

    if (!id) {
      console.warn('[User Sessions API - PATCH] Missing ID for session update/revoke.');
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const patch: any = {};
    if (revoke) {
      patch.revoked_at = new Date().toISOString();
      console.log(`[User Sessions API - PATCH] Revoking session ID: ${id} for user: ${user.id}`);
    } else if (label) {
      patch.device_label = label;
      console.log(`[User Sessions API - PATCH] Updating device label for session ID: ${id} for user: ${user.id}`);
    } else {
      patch.last_seen_at = new Date().toISOString();
      console.log(`[User Sessions API - PATCH] Heartbeat for session ID: ${id} for user: ${user.id}`);
    }

    const { data, error } = await supabase.from('user_sessions')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[User Sessions API - PATCH] Error updating user session:', error.message);
      throw error;
    }

    console.log(`[User Sessions API - PATCH] Session updated successfully: ${data.id}`);
    return NextResponse.json({ success: true, session: data }, { status: 200 });
  } catch (e: any) {
    console.error('[User Sessions API - PATCH] Unexpected error:', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
