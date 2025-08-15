import { TMDBAPI } from '@/lib/api/tmdb'

export interface MediaMetadata {
  id: string
  title: string
  poster?: string
  backdrop?: string
  year?: number
  rating?: number
  type: 'movie' | 'tv'
}

const api = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

// In-memory metadata cache (simple; resets on reload)
const dataCache = new Map<string, MediaMetadata>()
const inflight = new Map<string, Promise<MediaMetadata | null>>()

function cacheKey(id: string, type: 'movie' | 'tv') { return `${type}:${id}` }

export async function fetchMetadata(id: string, type: 'movie' | 'tv'): Promise<MediaMetadata | null> {
  const k = cacheKey(id, type)
  if (dataCache.has(k)) return dataCache.get(k)!
  if (inflight.has(k)) return inflight.get(k)!
  const p = (async () => {
    try {
      if (!id) return null
      if (type === 'movie') {
        const m = await api.getMovie(Number(id))
        const meta: MediaMetadata = {
          id,
          title: m.title,
          poster: m.poster_path ? api.getPosterUrl(m.poster_path, 'w342') : undefined,
          backdrop: m.backdrop_path ? api.getBackdropUrl(m.backdrop_path, 'w780') : undefined,
          year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
          rating: m.vote_average,
          type: 'movie'
        }
        dataCache.set(k, meta); return meta
      } else {
        const tv = await api.getTVShow(Number(id))
        const meta: MediaMetadata = {
          id,
          title: tv.name,
          poster: tv.poster_path ? api.getPosterUrl(tv.poster_path, 'w342') : undefined,
          backdrop: tv.backdrop_path ? api.getBackdropUrl(tv.backdrop_path, 'w780') : undefined,
          year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
          rating: tv.vote_average,
          type: 'tv'
        }
        dataCache.set(k, meta); return meta
      }
    } catch (e) {
      console.warn('metadata fetch failed', id, type, e)
      return null
    } finally {
      inflight.delete(k)
    }
  })()
  inflight.set(k, p)
  return p
}

export async function batchFetchMetadata(items: Array<{ id: string; type: 'movie' | 'tv' }>, concurrency = 5): Promise<Record<string, MediaMetadata>> {
  const entries = items.filter(it => !!it.id)
  const result: Record<string, MediaMetadata> = {}
  let index = 0
  async function worker() {
    while (index < entries.length) {
      const current = index++
      const { id, type } = entries[current]
      const meta = await fetchMetadata(id, type)
      if (meta) result[cacheKey(id, type)] = meta
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, () => worker())
  await Promise.all(workers)
  return result
}

export function getCachedMetadata(id: string, type: 'movie' | 'tv'): MediaMetadata | undefined {
  return dataCache.get(cacheKey(id, type))
}
