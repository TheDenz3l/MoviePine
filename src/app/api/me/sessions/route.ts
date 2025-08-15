import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = req.headers.get('authorization')
  return createClient(url, anon, { global: { headers: { Authorization: authHeader || '' } }, auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const { data } = await supabase.from('user_sessions').select('*').eq('user_id', user.id).order('last_seen_at', { ascending: false })
    return new Response(JSON.stringify({ success: true, sessions: data || [] }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const body = await req.json().catch(()=>({}))
    const { deviceLabel } = body
    const ua = req.headers.get('user-agent') || undefined
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const { data, error } = await supabase.from('user_sessions').insert({ user_id: user.id, user_agent: ua, ip, device_label: deviceLabel }).select().single()
    if (error) throw error
    return new Response(JSON.stringify({ success: true, session: data }), { status: 201 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}

export async function PATCH(req: NextRequest) { // heartbeat or revoke
  try {
    const supabase = getSupabase(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const body = await req.json().catch(()=>({}))
    const { id, revoke, label } = body
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })
    const patch: any = {}
    if (revoke) patch.revoked_at = new Date().toISOString()
    if (label) patch.device_label = label
    if (!revoke && !label) patch.last_seen_at = new Date().toISOString()
    const { data, error } = await supabase.from('user_sessions').update(patch).eq('id', id).eq('user_id', user.id).select().single()
    if (error) throw error
    return new Response(JSON.stringify({ success: true, session: data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}
