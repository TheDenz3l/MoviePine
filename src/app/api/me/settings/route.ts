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

    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    return new Response(JSON.stringify({ success: true, settings }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabase(req)
    const body = await req.json().catch(() => ({}))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

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
    return new Response(JSON.stringify({ success: true, settings: merged }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}
