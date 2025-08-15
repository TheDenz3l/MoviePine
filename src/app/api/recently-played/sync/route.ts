import { NextRequest } from 'next/server'

// Server-backed persistence for recently played syncing.
// Client will POST a batch of local entries; server upserts into watch_progress for durability.
// This enables migration away from purely localStorage-based RecentlyPlayedService.
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}))
    const entries = Array.isArray(body?.entries) ? body.entries : []
    if (!entries.length) return new Response(JSON.stringify({ success:false, error:'entries array required'}), { status:400 })
    const supabase = await getAuthedClient(req)
    const { data: userData } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
    const userId = userData.user?.id
    if (!supabase || !userId) return new Response(JSON.stringify({ success:false, error:'Auth required'}), { status:401 })

    // Normalize & validate rows
  const rows = entries.map((e:any) => {
      const progress = typeof e.duration === 'number' && e.duration > 0 ? (e.currentTime||0)/e.duration : 0
      return {
        user_id: userId,
        content_id: String(e.id || e.contentId),
        current_time: Math.floor(e.currentTime||0),
        duration: Math.floor(e.duration||0),
        progress,
        last_stream_url: e.lastStreamUrl || null,
        last_subtitles: e.lastSubtitles || null,
        completed: progress >= 0.9,
        updated_at: new Date().toISOString()
      }
  }).filter((r: { content_id: string }) => r.content_id)

    if (!rows.length) return new Response(JSON.stringify({ success:false, error:'No valid rows'}), { status:400 })

    const { error } = await supabase.from('watch_progress').upsert(rows, { onConflict:'user_id,content_id' })
    if (error) throw error

    return new Response(JSON.stringify({ success:true, count: rows.length }), { status:200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, error: e.message||'Unknown error'}), { status:500 })
  }
}
