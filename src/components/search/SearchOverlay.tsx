"use client"

import { useEffect, useReducer, useRef } from 'react'
import { X, Search, Loader2, RefreshCw, Play, Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchMovie { id: string; title: string; poster: string; year?: number }

interface SearchOverlayProps {
  initialQuery?: string
  onPlay: (id: string, title: string) => void
  onMoreInfo: (id: string) => void
  onAddToList: (id: string) => void
  onMovieSelect: (movie: SearchMovie) => void
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'
interface State { query: string; status: Status; results: SearchMovie[]; error: string | null }
type Action =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'START'; query: string }
  | { type: 'SUCCESS'; query: string; results: SearchMovie[] }
  | { type: 'ERROR'; query: string; error: string }
  | { type: 'RESET' }

const initialState: State = { query: '', status: 'idle', results: [], error: null }

function reducer(state: State, action: Action): State {
  switch(action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.query }
    case 'START':
      return { ...state, query: action.query, status: 'loading', error: null }
    case 'SUCCESS':
      if (action.query !== state.query) return state
      return { ...state, status: 'success', results: action.results, error: null }
    case 'ERROR':
      if (action.query !== state.query) return state
      return { ...state, status: 'error', results: [], error: action.error }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// Simple in-memory cache (query -> results)
const cache = new Map<string, { results: SearchMovie[]; ts: number }>()

export function SearchOverlay({ initialQuery = '', onPlay, onMoreInfo, onAddToList, onMovieSelect, onClose }: SearchOverlayProps) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, query: initialQuery })
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''

  // Focus input on mount
  useEffect(()=>{ inputRef.current?.focus() }, [])

  // Escape key closes
  useEffect(()=>{
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  // Debounced search effect
  useEffect(()=>{
    const q = state.query.trim()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (!q) { dispatch({ type: 'RESET' }); return }
    debounceRef.current = window.setTimeout(async () => {
      // cache hit (5m)
      const c = cache.get(q)
      if (c && Date.now() - c.ts < 300000) {
        dispatch({ type: 'SUCCESS', query: q, results: c.results })
        return
      }
  if (abortRef.current) abortRef.current.abort()
  const controller = new AbortController()
  abortRef.current = controller
      dispatch({ type: 'START', query: q })
      try {
        if (!apiKey) throw new Error('Missing API key')
        const url = new URL('https://api.themoviedb.org/3/search/multi')
        url.searchParams.set('api_key', apiKey)
        url.searchParams.set('query', q)
        url.searchParams.set('include_adult', 'false')
        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited. Try again.' : 'Search failed')
        const data = await res.json()
        const list: SearchMovie[] = (data.results || [])
          .filter((r: any) => r && (r.media_type === 'movie' || r.media_type === 'tv'))
          .map((r: any) => ({
            id: String(r.id),
            title: r.media_type === 'movie' ? r.title : r.name,
            poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '/placeholder-poster.svg',
            year: r.release_date ? new Date(r.release_date).getFullYear() : (r.first_air_date ? new Date(r.first_air_date).getFullYear() : undefined)
          }))
          .filter((m: SearchMovie) => !!m.title)
        cache.set(q, { results: list, ts: Date.now() })
        dispatch({ type: 'SUCCESS', query: q, results: list })
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        dispatch({ type: 'ERROR', query: q, error: e?.message || 'Unknown error' })
      }
    }, 220)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  }, [state.query, apiKey])

  const handlePlay = (m: SearchMovie) => { try { window.dispatchEvent(new CustomEvent('app:playMovie',{ detail:{ id: m.id, title: m.title }})) } catch {} onPlay(m.id, m.title); onClose() }
  const handleMoreInfo = (m: SearchMovie) => { try { window.dispatchEvent(new CustomEvent('app:openModal',{ detail:{ id: m.id }})) } catch {} onMoreInfo(m.id); onClose() }
  const handleAdd = (m: SearchMovie) => onAddToList(m.id)

  const showList = state.status !== 'idle'

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[rgb(10,10,10)] via-[rgb(14,14,14)] to-[rgb(10,10,10)] text-white flex flex-col font-medium">
      {/* Header */}
      <div className="shrink-0 bg-[rgba(18,18,18,0.9)] backdrop-blur-md border-b border-zinc-800/60 shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-6 px-8 pt-6 pb-5">
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-300 h-5 w-5 transition-colors" />
              <input
                ref={inputRef}
                value={state.query}
                onChange={e=>dispatch({ type:'SET_QUERY', query: e.target.value })}
                placeholder="Start typing to search the catalog..."
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-zinc-900/70 border border-zinc-700/60 focus:border-red-600/70 focus:ring-2 focus:ring-red-600/30 outline-none text-[17px] tracking-wide placeholder-gray-500 transition-colors"
                aria-label="Search titles"
              />
              <div className="absolute -bottom-1 left-3 right-3 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent pointer-events-none" />
            </div>
            <div className="mt-3 h-5 text-[13px] font-normal tracking-wide text-gray-400" aria-live="polite">
              {state.status === 'idle' && 'Type a title, actor, or keyword'}
              {state.status === 'loading' && <span className="flex items-center gap-2 text-gray-300"><Loader2 className="animate-spin w-3.5 h-3.5" /> Searching…</span>}
              {state.status === 'error' && <span className="text-red-400">{state.error}</span>}
              {state.status === 'success' && <span><span className="text-red-400 font-semibold">{state.results.length}</span> result{state.results.length===1?'':'s'} for "{state.query}"</span>}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {state.status === 'error' && (
              <Button variant="ghost" size="icon" onClick={()=>dispatch({ type:'SET_QUERY', query: state.query })} className="text-gray-400 hover:text-white hover:bg-gray-800/60"><RefreshCw className="w-5 h-5" /></Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800/60"><X className="w-6 h-6" /></Button>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sticky side rail (future filters) */}
        <aside className="hidden lg:block w-64 border-r border-zinc-800/60 bg-[rgba(20,20,20,0.55)] backdrop-blur-md p-6 overflow-y-auto">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-semibold">Filters</h3>
          <p className="text-[13px] text-zinc-500 leading-relaxed">Coming soon: refine by genre, year, rating. Current build focuses on stability.</p>
        </aside>
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-16">
          {!showList && (
            <div className="flex flex-col items-center justify-center h-full opacity-70">
              <Search className="w-20 h-20 text-gray-600 mb-6" />
              <h2 className="text-3xl font-semibold text-gray-300 mb-3 tracking-tight">Instant Search</h2>
              <p className="text-gray-500 max-w-md text-center text-sm leading-relaxed">A lean, resilient search surface. Start typing above to stream results without flicker or layout jumps.</p>
            </div>
          )}
          {showList && (
            <ul className="divide-y divide-zinc-800/60 mt-6 border-t border-zinc-800/60" aria-label="Search results" role="list">
              {state.status === 'loading' && state.results.length === 0 && Array.from({length:10}).map((_,i)=>(
                <li key={i} className="flex gap-5 py-5 animate-pulse">
                  <div className="w-[92px] h-[138px] rounded-md bg-zinc-800/50" />
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="h-4 w-1/3 bg-zinc-800/50 rounded" />
                    <div className="h-3 w-1/4 bg-zinc-800/40 rounded" />
                    <div className="h-3 w-2/5 bg-zinc-800/40 rounded" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-7 w-16 rounded bg-zinc-800/40" />
                      <div className="h-7 w-8 rounded bg-zinc-800/40" />
                      <div className="h-7 w-8 rounded bg-zinc-800/40" />
                    </div>
                  </div>
                </li>
              ))}
              {state.status === 'success' && state.results.map(m => (
                <li key={m.id} className="group flex gap-5 py-5 px-1 hover:bg-zinc-900/40 rounded-lg transition-colors">
                  <div className="relative w-[92px] h-[138px] rounded-md overflow-hidden ring-1 ring-zinc-700/40 shadow-sm">
                    <img src={m.poster} alt={m.title} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" loading="lazy" />
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-start gap-3">
                      <h3 className="text-[15px] leading-snug font-semibold text-gray-100 line-clamp-2" title={m.title}>{m.title}</h3>
                      {m.year && <span className="text-[11px] mt-[2px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 tracking-wide">{m.year}</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={()=>handlePlay(m)} className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white text-black font-semibold tracking-wide shadow hover:bg-white/90 transition-colors">
                        <Play className="w-3.5 h-3.5" /> Play
                      </button>
                      <button onClick={()=>handleAdd(m)} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={()=>handleMoreInfo(m)} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {state.status === 'success' && state.results.length === 0 && (
                <li className="py-24 flex flex-col items-center gap-4 opacity-70">
                  <Search className="w-16 h-16 text-gray-600" />
                  <p className="text-gray-400 text-lg">No results</p>
                </li>
              )}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}

export default SearchOverlay
