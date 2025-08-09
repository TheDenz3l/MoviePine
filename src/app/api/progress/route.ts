import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client using service role key (must not be exposed client-side).
// Add SUPABASE_SERVICE_KEY to your .env.local (never commit the value) alongside NEXT_PUBLIC_SUPABASE_URL.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

function getServerClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase service configuration missing (SUPABASE_SERVICE_KEY / NEXT_PUBLIC_SUPABASE_URL)')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'moviepine-progress-api' } }
  })
}

// Placeholder user id (replace with real auth integration later)
const USER_ID_FALLBACK = 'anon'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const idsParam = url.searchParams.get('ids')
    const userId = USER_ID_FALLBACK
    const supabase = getServerClient()

    if (!id && !idsParam) {
      return new Response(JSON.stringify({ error: 'id or ids param required' }), { status: 400 })
    }

    const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [id!]

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
    const userId = USER_ID_FALLBACK
    const supabase = getServerClient()

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
