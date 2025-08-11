"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import MoviepireGrid, { MoviepireGridItem } from '@/components/moviepire-grid'
import { Search, X, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchMovie extends MoviepireGridItem {
  type: 'movie' | 'tv'
}

interface RealTimeSearchPageProps { 
  initialQuery?: string; 
  onMovieSelect: (movie: SearchMovie) => void; 
  onPlay: (movieId: string, title: string) => void; 
  onAddToList: (movie: SearchMovie) => void; 
  onMoreInfo: (movie: SearchMovie) => void; 
  onClose: () => void 
}

// ---- State Management (Reducer to avoid race conditions) ----
interface State { query: string; results: SearchMovie[]; loading: boolean; error: string | null; touched: boolean; page: number; total: number }
type Action =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'START'; query: string }
  | { type: 'SUCCESS'; query: string; results: SearchMovie[]; total: number }
  | { type: 'ERROR'; query: string; error: string }
  | { type: 'RESET' }

const initialState: State = { query: '', results: [], loading: false, error: null, touched: false, page: 1, total: 0 }

function reducer(state: State, action: Action): State {
  switch(action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.query }
    case 'START':
      return { ...state, query: action.query, loading: true, error: null, touched: true }
    case 'SUCCESS':
      if (action.query !== state.query) return state // stale
      return { ...state, loading: false, error: null, results: action.results, total: action.total }
    case 'ERROR':
      if (action.query !== state.query) return state
      return { ...state, loading: false, error: action.error, results: [] }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ---- Simple in-memory cache to avoid repeat fetches ----
const resultCache = new Map<string, { results: SearchMovie[]; total: number; ts: number }>()

// Helper: build TMDB multi search URL (client side; key is public NEXT_PUBLIC_ variant)
function buildSearchUrl(apiKey: string, q: string, page=1) {
  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('query', q)
  url.searchParams.set('page', page.toString())
  url.searchParams.set('include_adult', 'false')
  return url.toString()
}

export function RealTimeSearchPage({ initialQuery = '', onMovieSelect, onPlay, onAddToList, onMoreInfo, onClose }: RealTimeSearchPageProps) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, query: initialQuery })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''

  // Focus input on mount
  useEffect(()=>{ inputRef.current?.focus() }, [])

  // Core search effect (debounced, abortable, cached)
  useEffect(()=>{
    const q = state.query.trim()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (!q) { dispatch({ type: 'RESET' }); return }
    debounceRef.current = window.setTimeout(async () => {
      // Cache hit
      const cached = resultCache.get(q)
      if (cached && Date.now() - cached.ts < 1000 * 60 * 5) { // 5 min freshness
        dispatch({ type: 'SUCCESS', query: q, results: cached.results, total: cached.total })
        return
      }
      // Abort previous
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController(); abortRef.current = controller
      dispatch({ type: 'START', query: q })
      try {
        if (!apiKey) throw new Error('API key missing')
        const res = await fetch(buildSearchUrl(apiKey, q), { signal: controller.signal })
        if (!res.ok) {
          if (res.status === 429) throw new Error('Rate limited. Slow down.')
          throw new Error('Search failed ('+res.status+')')
        }
        const json = await res.json()
        const raw: any[] = Array.isArray(json.results) ? json.results : []
        const transformed: SearchMovie[] = raw
          .filter(r => r && (r.media_type === 'movie' || r.media_type === 'tv'))
          .map(r => {
            const posterPath = r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '/placeholder-poster.svg'
            const backdropPath = r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : undefined
            const year = r.media_type === 'movie' ? (r.release_date ? new Date(r.release_date).getFullYear() : undefined) : (r.first_air_date ? new Date(r.first_air_date).getFullYear() : undefined)
            return { 
              id: String(r.id), 
              title: r.media_type === 'movie' ? r.title : r.name, 
              poster: posterPath,
              backdrop: backdropPath,
              year, 
              type: r.media_type as 'movie' | 'tv',
              rating: r.vote_average
            }
          })
          .filter(m => !!m.title && !!m.poster)
        resultCache.set(q, { results: transformed, total: json.total_results || transformed.length, ts: Date.now() })
        dispatch({ type: 'SUCCESS', query: q, results: transformed, total: json.total_results || transformed.length })
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        dispatch({ type: 'ERROR', query: q, error: e?.message || 'Unknown error' })
      }
    }, 240)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  }, [state.query, apiKey])

  // Escape to close
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const statusText = useMemo(()=>{
    if (!state.touched) return 'Type to search'
    if (state.loading && !state.error) return 'Searching…'
    if (state.error) return state.error
    if (!state.results.length) return `No results for "${state.query}"`
    return `Found ${state.total} results for "${state.query}"`
  }, [state.touched, state.loading, state.error, state.results.length, state.total, state.query])

  const handleInputChange = (val: string) => { dispatch({ type: 'SET_QUERY', query: val }) }

  const handlePlay = (id: string) => { 
    const mv = state.results.find(r=>r.id===id); 
    if (!mv) return; 
    try { window.dispatchEvent(new CustomEvent('app:playMovie',{ detail:{ id: mv.id, title: mv.title }})) } catch {} 
    onPlay(id, mv.title)
    onClose() 
  }
  
  const handleInfo = (id: string) => { 
    const mv = state.results.find(r=>r.id===id); 
    if (!mv) return;
    try { window.dispatchEvent(new CustomEvent('app:openModal',{ detail:{ id }})) } catch {} 
    onMoreInfo(mv)
    onClose() 
  }
  
  const handleAdd = (id: string) => { 
    const mv = state.results.find(r=>r.id===id); 
    if (mv) onAddToList(mv) 
  }

  // Skeleton items for loading state
  const skeletonItems = useMemo(() => {
    if (!state.loading || state.results.length > 0) return []
    return Array.from({ length: 18 }, (_, i) => ({
      id: `skeleton-${i}`,
      title: '',
      poster: '',
      year: undefined,
      type: 'movie' as const
    }))
  }, [state.loading, state.results.length])

  const showGrid = state.touched || state.loading
  const displayItems = state.loading && state.results.length === 0 ? skeletonItems : state.results

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[rgb(10,10,10)] via-[rgb(14,14,14)] to-[rgb(10,10,10)] text-white flex flex-col overflow-hidden">
      {/* Header - same style as original search overlay */}
      <div className="shrink-0 bg-[rgba(18,18,18,0.9)] backdrop-blur-md border-b border-zinc-800/60 shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-6 px-8 pt-6 pb-5">
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-300 h-5 w-5 transition-colors" />
              <input
                ref={inputRef}
                value={state.query}
                onChange={e=>handleInputChange(e.target.value)}
                placeholder="Start typing to search the catalog..."
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-zinc-900/70 border border-zinc-700/60 focus:border-red-600/70 focus:ring-2 focus:ring-red-600/30 outline-none text-[17px] tracking-wide placeholder-gray-500 transition-colors"
                aria-label="Search titles"
              />
              <div className="absolute -bottom-1 left-3 right-3 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent pointer-events-none" />
            </div>
            <div className="mt-3 h-5 text-[13px] font-normal tracking-wide text-gray-400" aria-live="polite">
              {state.loading && <span className="flex items-center gap-2 text-gray-300"><Loader2 className="animate-spin w-3.5 h-3.5" /> {statusText}</span>}
              {!state.loading && <span className={state.error ? 'text-red-400' : ''}>{statusText}</span>}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {state.error && (
              <Button variant="ghost" size="icon" onClick={()=>dispatch({ type:'SET_QUERY', query: state.query })} className="text-gray-400 hover:text-white hover:bg-gray-800/60"><RefreshCw className="w-5 h-5" /></Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800/60"><X className="w-6 h-6" /></Button>
          </div>
        </div>
      </div>
      
      {/* Body with grid layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sticky side rail (future filters) - same as original */}
        <aside className="hidden lg:block w-64 border-r border-zinc-800/60 bg-[rgba(20,20,20,0.55)] backdrop-blur-md p-6 overflow-y-auto">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-semibold">Filters</h3>
          <p className="text-[13px] text-zinc-500 leading-relaxed">Coming soon: refine by genre, year, rating. Current build focuses on stability.</p>
        </aside>
        
        {/* Main content area with MoviepireGrid */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-16">
          {!showGrid && (
            <div className="flex flex-col items-center justify-center h-full opacity-70">
              <Search className="w-20 h-20 text-gray-600 mb-6" />
              <h2 className="text-3xl font-semibold text-gray-300 mb-3 tracking-tight">Instant Search</h2>
              <p className="text-gray-500 max-w-md text-center text-sm leading-relaxed">A lean, resilient search surface. Start typing above to stream results without flicker or layout jumps.</p>
            </div>
          )}
          
          {showGrid && (
            <div className="mt-6">
              {state.loading && state.results.length === 0 && (
                <div className="grid gap-6 sm:gap-7 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
                  {Array.from({length:18}).map((_,i)=>(
                    <div key={i} className="aspect-[2/3] rounded-md bg-zinc-800/50 animate-pulse" />
                  ))}
                </div>
              )}
              
              {state.results.length > 0 && (
                <MoviepireGrid
                  items={state.results}
                  browseReplication
                  intentDelayMs={70}
                  prefetchNeighbors
                  enableKeyboardNav
                  showMetadata
                  minCardWidth={140}
                  gap={24}
                  className="rounded-lg ring-1 ring-white/5 bg-black/10 backdrop-blur-sm max-h-[70vh]"
                  onPlay={handlePlay}
                  onAdd={handleAdd}
                  onInfo={handleInfo}
                />
              )}
              
              {!state.loading && state.results.length === 0 && state.touched && (
                <div className="py-24 flex flex-col items-center gap-4 opacity-70">
                  <Search className="w-16 h-16 text-gray-600" />
                  <p className="text-gray-400 text-lg">No results</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}