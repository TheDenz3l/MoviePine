import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { TMDBAPI } from '@/lib/api/tmdb'

function getClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = req.headers.get('authorization') || ''
  return createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500)
    const offset = Number(url.searchParams.get('offset')) || 0
    const wantMeta = url.searchParams.get('meta') === '1'
    const { data: watch } = await supabase.from('user_watchlist').select('content_id,content_type,added_at').eq('user_id', user.id).order('added_at', { ascending: false }).range(offset, offset+limit-1)
    if (!wantMeta) {
      return new Response(JSON.stringify({ success: true, watchlist: watch||[] }), { status: 200 })
    }
    const api = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')
    async function enrich(list?: any[]){
      if (!list) return []
      const out = await Promise.all(list.slice(0, 200).map(async row => {
        try {
          const type = row.content_type === 'series' ? 'tv' : 'movie'
          const idNum = Number(row.content_id)
          if (!idNum || isNaN(idNum)) return row
          if (type === 'movie') {
            const m = await api.getMovie(idNum)
            return { ...row, title: m.title, poster: m.poster_path ? api.getPosterUrl(m.poster_path, 'w342') : null, year: m.release_date? new Date(m.release_date).getFullYear(): null, rating: m.vote_average }
          } else {
            const tv = await api.getTVShow(idNum)
            return { ...row, title: tv.name, poster: tv.poster_path ? api.getPosterUrl(tv.poster_path, 'w342') : null, year: tv.first_air_date? new Date(tv.first_air_date).getFullYear(): null, rating: tv.vote_average }
          }
        } catch (e) { return row }
      }))
      return out
    }
  const watchMeta = await enrich(watch || undefined)
  return new Response(JSON.stringify({ success: true, watchlist: watchMeta, meta: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 })
  }
}
