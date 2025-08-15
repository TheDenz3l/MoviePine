import { NextRequest } from 'next/server'

// Refactored: use anon key + bearer token from client; rely on RLS.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getAuthedClient(req: NextRequest) {
  if (!supabaseUrl || !anonKey) return null
  const authHeader = req.headers.get('authorization') || ''
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } }
  })
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const idsParam = url.searchParams.get('ids')
  const supabase = await getAuthedClient(req)
  const { data: userData } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  const userId = userData.user?.id

    if (!id && !idsParam) {
      return new Response(JSON.stringify({ error: 'id or ids param required' }), { status: 400 })
    }

    const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [id!]

    // If Supabase is disabled, return empty progress map gracefully.
  if (!supabase || !userId) {
      const result: Record<string, any> = {}
      ids.forEach(key => { result[key] = null })
      return new Response(JSON.stringify({ success: true, data: result, persisted: false }), { status: 200 })
    }

    const { data, error } = await supabase
      .from('watch_progress')
      .select('content_id,current_time,duration,progress,last_stream_url,last_subtitles,updated_at,completed')
      .in('content_id', ids)
      .eq('user_id', userId)

    if (error) throw error

    const result: Record<string, any> = {}
    data?.forEach(row => {
      result[row.content_id] = {
        currentTime: row.current_time,
        duration: row.duration,
        progress: row.progress,
        streamUrl: row.last_stream_url || null,
        subtitles: row.last_subtitles || [],
        updatedAt: row.updated_at,
        completed: row.completed
      }
    })

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'Unknown error' }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { contentId, currentTime, duration, streamUrl, subtitles } = body || {}
    if (!contentId || typeof currentTime !== 'number' || typeof duration !== 'number') {
      return new Response(JSON.stringify({ error: 'contentId, currentTime, duration required' }), { status: 400 })
    }
    const progress = duration > 0 ? currentTime / duration : 0
    const completed = progress >= 0.9
  const supabase = await getAuthedClient(req)
  const { data: userData } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  const userId = userData.user?.id

    // If Supabase is disabled, act as a no-op (pretend success) to avoid 500s in dev.
  if (!supabase || !userId) {
      return new Response(JSON.stringify({ success: true, data: null, persisted: false }), { status: 200 })
    }

    const { data, error } = await supabase
      .from('watch_progress')
      .upsert({
        user_id: userId,
        content_id: contentId,
        current_time: currentTime,
        duration,
        progress,
        last_stream_url: streamUrl || null,
        last_subtitles: subtitles || null,
        completed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,content_id' })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'Unknown error' }), { status: 500 })
  }
}

export const PATCH = POST

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await getAuthedClient(req)
    const { data: userData } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
    const userId = userData.user?.id
    if (!supabase || !userId) return new Response(JSON.stringify({ success: false, error: 'Auth required' }), { status: 401 })
    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') || 'watch' // watch | episodes | all
    let watchDeleted = 0, episodeDeleted = 0
    if (scope === 'watch' || scope === 'all') {
      const { count } = await supabase.from('watch_progress').delete({ count: 'exact' }).eq('user_id', userId)
      watchDeleted = count || 0
    }
    if (scope === 'episodes' || scope === 'all') {
      const { count } = await supabase.from('episode_progress').delete({ count: 'exact' }).eq('user_id', userId)
      episodeDeleted = count || 0
    }
    return new Response(JSON.stringify({ success: true, scope, deleted: { watch: watchDeleted, episodes: episodeDeleted } }), { status: 200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'Unknown error' }), { status: 500 })
  }
}
