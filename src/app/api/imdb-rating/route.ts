import { NextRequest } from 'next/server'

interface CachedRating { rating: number; ts: number }
const CACHE: Record<string, CachedRating> = {}
const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

async function fetchImdbRating(imdbId: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${apiKey}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as any
    if (data && data.imdbRating && data.imdbRating !== 'N/A') {
      const num = parseFloat(data.imdbRating)
      return isNaN(num) ? null : num
    }
    return null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam) {
    return new Response(JSON.stringify({ error: 'ids param required' }), { status: 400 })
  }
  const imdbApiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY
  if (!imdbApiKey) {
    return new Response(JSON.stringify({ error: 'OMDB_API_KEY not configured' }), { status: 500 })
  }
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 50)
  const now = Date.now()
  const result: Record<string, number | null> = {}
  await Promise.all(ids.map(async id => {
    const cache = CACHE[id]
    if (cache && (now - cache.ts) < TTL_MS) {
      result[id] = cache.rating
      return
    }
    const rating = await fetchImdbRating(id, imdbApiKey)
    if (rating != null) {
      CACHE[id] = { rating, ts: now }
      result[id] = rating
    } else {
      result[id] = null
    }
  }))
  return new Response(JSON.stringify({ ratings: result }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
