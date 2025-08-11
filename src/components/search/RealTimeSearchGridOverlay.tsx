"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'

interface RTSearchItem {
  id: string
  title: string
  poster: string
  year?: number
  backdrop?: string
  type: 'movie' | 'tv'
}

interface RealTimeSearchGridOverlayProps {
  query: string
  onClose: () => void
  onPlay: (id: string, title?: string) => void
  onAddToList: (id: string) => void
  onMoreInfo: (id: string, type: 'movie' | 'tv') => void | Promise<void>
  visible: boolean
}

const cache = new Map<string, { ts: number; results: RTSearchItem[] }>()

export default function RealTimeSearchGridOverlay({ query, visible, onClose, onPlay, onAddToList, onMoreInfo }: RealTimeSearchGridOverlayProps) {
  const [results, setResults] = useState<RTSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  const [fadingOut, setFadingOut] = useState(false)
  const overlayRootRef = useRef<HTMLDivElement | null>(null)

  // Global click instrumentation inside overlay
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!overlayRootRef.current) return
      if (!overlayRootRef.current.contains(e.target as Node)) return
      // eslint-disable-next-line no-console
      console.log('[RTSearchOverlay] Root click', {
        target: (e.target as HTMLElement).tagName,
        className: (e.target as HTMLElement).className
      })
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  useEffect(() => {
    if (!visible) return
    const q = query.trim()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (!q) { setResults([]); setLoading(false); setError(null); return }
    debounceRef.current = window.setTimeout(async () => {
      const cached = cache.get(q)
      if (cached && Date.now() - cached.ts < 300000) { setResults(cached.results); setLoading(false); setError(null); return }
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController(); abortRef.current = controller
      setLoading(true); setError(null)
      try {
        if (!apiKey) throw new Error('Missing API key')
        const url = new URL('https://api.themoviedb.org/3/search/multi')
        url.searchParams.set('api_key', apiKey)
        url.searchParams.set('query', q)
        url.searchParams.set('include_adult', 'false')
        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited' : 'Search failed')
        const data = await res.json()
        const list: RTSearchItem[] = (data.results || [])
          .filter((r: any) => r && (r.media_type === 'movie' || r.media_type === 'tv'))
          .map((r: any) => ({
            id: String(r.id),
            title: r.media_type === 'movie' ? r.title : r.name,
            poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '/placeholder-poster.svg',
            backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : undefined,
            year: r.release_date ? new Date(r.release_date).getFullYear() : (r.first_air_date ? new Date(r.first_air_date).getFullYear() : undefined),
            type: r.media_type
          }))
        cache.set(q, { ts: Date.now(), results: list })
        setResults(list)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        setError(e?.message || 'Error')
      } finally {
        setLoading(false)
      }
    }, 240)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  }, [query, visible, apiKey])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const handlePlay = useCallback((id: string) => {
    const item = results.find(r=>r.id===id)
    if (item) onPlay(id, item.title)
  }, [results, onPlay])

  if (!visible && !fadingOut) return null

  return (
  <div ref={overlayRootRef} data-search-overlay className={`fixed inset-0 z-[1000] pt-20 px-6 pb-24 overflow-y-auto backdrop-blur-sm transition-opacity duration-200 ${fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-[rgba(18,18,18,0.93)]'}`}>
      <div className="max-w-7xl mx-auto mb-6">
        {!query.trim() && <p className="text-gray-400 text-lg flex items-center gap-2"><Search className="w-5 h-5" /> Start typing to search</p>}
        {query.trim() && loading && <p className="text-gray-300 text-lg flex items-center gap-2"><span className="animate-spin h-5 w-5 rounded-full border-b-2 border-red-600" /> Searching for "{query}"…</p>}
        {query.trim() && !loading && !error && results.length > 0 && (
          <p className="text-white text-lg">Found <span className="text-red-500 font-semibold">{results.length}</span> results for "{query}"</p>
        )}
        {query.trim() && !loading && !error && results.length === 0 && (
          <p className="text-gray-400 text-lg">No results for "{query}"</p>
        )}
        {error && <p className="text-red-400 text-lg">{error}</p>}
      </div>
      {query.trim() && (
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 sm:gap-7 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
            {loading && results.length === 0 && Array.from({length:18}).map((_,i)=>(
              <div key={i} className="aspect-[2/3] rounded-md bg-zinc-800/50 animate-pulse" />
            ))}
            {!loading && results.map(item => (
              <div key={item.id} className="group relative" onClick={(e)=>{ e.stopPropagation(); /* Poster fallback click */ console.log('[RTSearchOverlay] Poster container click', item.id); }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    console.log('[RTSearchOverlay] Poster primary click (play)', item.id); 
                    // Close overlay and play movie
                    setFadingOut(true)
                    setTimeout(() => {
                      onClose()
                      setFadingOut(false)
                      handlePlay(item.id)
                    }, 200)
                  }}
                  onKeyDown={(e)=>{ 
                    if(e.key==='Enter') { 
                      console.log('[RTSearchOverlay] Poster key Enter (play)', item.id); 
                      // Close overlay and play movie
                      setFadingOut(true)
                      setTimeout(() => {
                        onClose()
                        setFadingOut(false)
                        handlePlay(item.id)
                      }, 200)
                    } 
                  }}
                  className="block w-full text-left focus:outline-none cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-md aspect-[2/3] transition-transform duration-360 ease-[cubic-bezier(.16,.8,.34,1)] will-change-transform group-hover:scale-[1.045] group-hover:-translate-y-2 group-hover:shadow-[0_8px_26px_-4px_rgba(0,0,0,0.55)]">
                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 flex items-end justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex gap-2" aria-hidden="true">
                        <button
                          type="button"
                          aria-label="Play"
                          onClick={(e)=> {
                            e.stopPropagation(); 
                            console.log('[RTSearchOverlay] Play button click', item.id); 
                            // Close overlay and play movie
                            setFadingOut(true)
                            setTimeout(() => {
                              onClose()
                              setFadingOut(false)
                              handlePlay(item.id)
                            }, 200)
                          }}
                          className="pointer-events-auto h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Add to list"
                          onClick={(e)=> {
                            e.stopPropagation(); 
                            console.log('[RTSearchOverlay] Add button click', item.id); 
                            // Close overlay and add to list
                            setFadingOut(true)
                            setTimeout(() => {
                              onClose()
                              setFadingOut(false)
                              onAddToList(item.id)
                            }, 200)
                          }}
                          className="pointer-events-auto h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          <span className="text-xl leading-none -mt-[2px]">+</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e)=>{
                            e.stopPropagation();
                            console.log('[RTSearchOverlay] Info button click', item.id, item.type);
                            // Close the search overlay with fade animation, then open modal
                            setFadingOut(true);
                            // Give the fade animation time to complete before closing
                            setTimeout(() => {
                              onClose();
                              setFadingOut(false);
                              // Then open the modal
                              try { 
                                onMoreInfo(item.id, item.type);
                              } catch (err) { 
                                console.warn('[RTSearchOverlay] onMoreInfo error', err);
                              }
                            }, 200); // Match the transition duration (200ms)
                          }}
                          className="pointer-events-auto h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          <span className="text-base font-semibold">i</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}