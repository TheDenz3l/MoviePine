"use client"
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { batchFetchMetadata, getCachedMetadata } from '@/lib/metadata/tmdbMetadataCache'

interface Item { content_id: string; updated_at: string; progress_seconds: number; duration_seconds: number }
interface EnrichedItem extends Item { metaTitle?: string; poster?: string; year?: number; rating?: number; typeGuess?: 'movie' | 'tv' }

export function RecentlyWatched({ limit = 25 }: { limit?: number }) {
  const { session } = useAuth()
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!session) return
    setLoading(true)
    fetch(`/api/recently-watched?limit=${limit}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r=>r.json())
      .then(async j=>{ if (j.success) {
        const base: Item[] = j.items
        // Attempt naive type inference: if id length > 6 treat as movie (arbitrary) else try movie first
        const toFetch = base.map(b => ({ id: b.content_id, type: 'movie' as const }))
        await batchFetchMetadata(toFetch.slice(0, 30)) // cap fetch size
        const enriched: EnrichedItem[] = base.map(b => {
          const metaMovie = getCachedMetadata(b.content_id, 'movie')
          const metaTv = metaMovie ? undefined : getCachedMetadata(b.content_id, 'tv')
          const meta = metaMovie || metaTv
          return { ...b, metaTitle: meta?.title, poster: meta?.poster, year: meta?.year, rating: meta?.rating, typeGuess: meta?.type }
        })
        setItems(enriched)
      } })
      .finally(()=>setLoading(false))
  }, [session, limit])
  if (!session) return null
  return <div className="space-y-4">
    <h2 className="text-xl font-semibold">Recently Watched</h2>
    {loading && <div className="text-sm text-neutral-400">Loading...</div>}
    {!loading && !items.length && <div className="text-sm text-neutral-500">No recent items.</div>}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map(it => {
        const pct = it.duration_seconds>0? Math.round((it.progress_seconds/it.duration_seconds)*100):0
        return <div key={it.content_id} className="bg-neutral-900 rounded p-3 border border-neutral-700 text-xs space-y-2">
          {it.poster && <img src={it.poster} alt={it.metaTitle||it.content_id} className="w-full aspect-[2/3] object-cover rounded" />}
          <div className="font-medium truncate" title={it.metaTitle||it.content_id}>{it.metaTitle||it.content_id}</div>
          <div className="h-1 bg-neutral-700 rounded overflow-hidden"><div className="h-full bg-red-600" style={{ width: pct+"%" }} /></div>
          <div className="text-[10px] text-neutral-500">{pct}% • {it.year||''} {it.rating?`• ★${it.rating.toFixed(1)}`:''} • {new Date(it.updated_at).toLocaleDateString()}</div>
        </div>
      })}
    </div>
  </div>
}
