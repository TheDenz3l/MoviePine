"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Info } from 'lucide-react'
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { useMyList } from '@/components/list/useMyList'
import { TMDBAPI } from '@/lib/api/tmdb'
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { Button } from '@/components/ui/button'
import { GenreSelect } from '@/components/ui/genre-select'
import { AppSelect } from '@/components/ui/app-select'

interface MoviesGridPageProps {
  onNavigate: (category: string) => void
  activeCategory: string
  onPlay: (id: string, title: string) => void
  onAddToList?: (id: string) => void // optional; unified card toggle handles watchlist
  onMoreInfo: (id: string) => void
}

interface GridMovieItem {
  id: string
  title: string
  poster: string
  backdrop?: string
  year?: number
  rating?: number
  genre?: string[]
}

// Local TMDB instance (mirrors pattern in other components)
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

// Primary high-level categories for Phase 1/2
const CATEGORIES: { id: string; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'trending', label: 'Trending' },
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'now_playing', label: 'Now Playing' },
  { id: 'upcoming', label: 'Upcoming' }
]

// Sorting options (applies primarily to genre/discover flows)
const SORT_OPTIONS: { id: string; label: string; tmdb: string }[] = [
  { id: 'popularity', label: 'Popularity', tmdb: 'popularity.desc' },
  { id: 'rating', label: 'Rating', tmdb: 'vote_average.desc' },
  { id: 'release_date', label: 'Release Date', tmdb: 'primary_release_date.desc' }
]

// Simple in-memory cache per category page to avoid refetch when user switches back quickly
// eslint-disable-next-line @typescript-eslint/ban-types
 type CacheKey = `${string}-p${number}`
const movieCache = new Map<CacheKey, { items: GridMovieItem[]; totalPages: number }>()

export function MoviesGridPage({ onNavigate, activeCategory, onPlay, onAddToList, onMoreInfo }: MoviesGridPageProps) {
  // Watchlist integration (direct to unify with overlay behavior)
  const { watchlist, addWatch, removeWatch } = useMyList()
  const [category, setCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moviesGrid:lastCategory') || 'popular'
    }
    return 'popular'
  })
  const [movies, setMovies] = useState<GridMovieItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isLoadingInitial, setIsLoadingInitial] = useState(false)
  const [isAppending, setIsAppending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([])
  const [selectedGenre, setSelectedGenre] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('moviesGrid:selectedGenre')
      return val ? Number(val) : null
    }
    return null
  })
  const [sort, setSort] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moviesGrid:sort') || 'popularity'
    }
    return 'popularity'
  })
  const [announce, setAnnounce] = useState<string>('')

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Derived title for heading
  const headingTitle = useMemo(() => {
    if (selectedGenre) {
      const g = genres.find(g => g.id === selectedGenre)?.name || 'Genre'
      return g
    }
    return CATEGORIES.find(c => c.id === category)?.label || 'Movies'
  }, [category, selectedGenre, genres])

  // View mode toggle (grid/list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Ensure search overlay events are handled
  useEffect(() => {
    const handleOpenSearch = (e: CustomEvent) => {
      // Handle search overlay opening if needed
    }
    
    window.addEventListener('app:openRealTimeSearch', handleOpenSearch as EventListener)
    
    return () => {
      window.removeEventListener('app:openRealTimeSearch', handleOpenSearch as EventListener)
    }
  }, [])

  // Load genres once
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await tmdbApi.getMovieGenres()
        if (mounted) setGenres(data.genres || [])
      } catch (e) {
        console.warn('Failed to load genres', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const fetchCategoryPage = useCallback((targetCategory: string, targetPage: number, append: boolean, targetGenre: number | null = selectedGenre, targetSort: string = sort) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const genrePart = targetGenre ? `g${targetGenre}-` : ''
      const sortPart = targetGenre ? `${targetSort}-` : ''
      const cacheKey: CacheKey = `${genrePart}${sortPart}${targetCategory}-p${targetPage}` as CacheKey
      if (movieCache.has(cacheKey)) {
        const cached = movieCache.get(cacheKey)!
        setMovies(prev => append ? [...prev, ...cached.items] : cached.items)
        setTotalPages(cached.totalPages)
        return
      }

      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        if (targetPage === 1 && !append) setIsLoadingInitial(true)
        else setIsAppending(true)
        setError(null)

        let results: any
        if (targetGenre) {
          results = await tmdbApi.makeRequest<any>('/discover/movie', {
            with_genres: targetGenre.toString(),
            sort_by: SORT_OPTIONS.find(s=>s.id===targetSort)?.tmdb || 'popularity.desc',
            page: targetPage.toString()
          })
        } else {
          switch (targetCategory) {
            case 'popular':
              results = await tmdbApi.getPopularMovies(targetPage)
              break
            case 'trending':
              results = await tmdbApi.makeRequest<any>(`/trending/movie/week`, { page: targetPage.toString() })
              break
            case 'top_rated':
              results = await tmdbApi.getTopRatedMovies(targetPage)
              break
            case 'now_playing':
              results = await tmdbApi.getNowPlayingMovies(targetPage)
              break
            case 'upcoming':
              results = await tmdbApi.getUpcomingMovies(targetPage)
              break
            default:
              results = await tmdbApi.getPopularMovies(targetPage)
          }
        }

        const transformed: GridMovieItem[] = (results.results || []).map((item: any) => ({
          id: item.id?.toString(),
          title: item.title || item.name || 'Untitled',
          poster: item.poster_path ? tmdbApi.getPosterUrl(item.poster_path, 'w500') : '/placeholder-poster.svg',
          backdrop: item.backdrop_path ? tmdbApi.getBackdropUrl(item.backdrop_path, 'w1280') : undefined,
          year: item.release_date ? new Date(item.release_date).getFullYear() : undefined,
          rating: item.vote_average ? Math.round(item.vote_average * 10) : undefined,
          genre: []
        }))

        movieCache.set(cacheKey, { items: transformed, totalPages: Math.min(results.total_pages || 1, 500) })

        setMovies(prev => append ? [...prev, ...transformed] : transformed)
        setTotalPages(Math.min(results.total_pages || 1, 500))
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        console.error('Movies grid fetch error:', e)
        setError('Failed to load movies')
      } finally {
        setIsLoadingInitial(false)
        setIsAppending(false)
      }
    }, 180)
  }, [selectedGenre, sort])

  // Load first page or when category changes
  useEffect(() => {
    setPage(1)
    fetchCategoryPage(category, 1, false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('moviesGrid:lastCategory', category)
    }
  }, [category, selectedGenre, sort, fetchCategoryPage])

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isAppending && !isLoadingInitial) {
          setPage(prev => {
            const next = prev + 1
            if (next <= totalPages) {
              fetchCategoryPage(category, next, true)
            }
            return prev + (next <= totalPages ? 1 : 0)
          })
        }
      })
    }, { rootMargin: '600px 0px 0px 0px', threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [category, totalPages, isAppending, isLoadingInitial, fetchCategoryPage])

  const handleCategoryClick = (id: string) => {
    if (id === category && !selectedGenre) return
    setSelectedGenre(null)
    setCategory(id)
    setAnnounce(`Category changed to ${CATEGORIES.find(c=>c.id===id)?.label || id}`)
    if (typeof window !== 'undefined') {
      localStorage.setItem('moviesGrid:selectedGenre', '')
      localStorage.setItem('moviesGrid:sort', sort)
      localStorage.setItem('moviesGrid:lastCategory', id)
    }
  }

  const handleGenreSelect = (gid: number | null) => {
    // Special value from custom select to clear
    if (gid === null || gid === ("__all" as any)) {
      setSelectedGenre(null)
      setAnnounce('Genre cleared')
      if (typeof window !== 'undefined') {
        localStorage.setItem('moviesGrid:selectedGenre', '')
        localStorage.setItem('moviesGrid:sort', sort)
        localStorage.setItem('moviesGrid:lastCategory', 'popular')
      }
      setCategory('popular')
      return
    }
    setSelectedGenre(prev => {
      const next = prev === gid ? null : gid
      const gName = genres.find(g=>g.id===gid)?.name || 'Genre'
      setAnnounce(prev === gid ? `Genre ${gName} cleared` : `Genre set to ${gName}`)
      if (typeof window !== 'undefined') {
        localStorage.setItem('moviesGrid:selectedGenre', next ? String(next) : '')
        localStorage.setItem('moviesGrid:sort', sort)
        localStorage.setItem('moviesGrid:lastCategory', 'popular')
      }
      return next
    })
    setCategory('popular')
  }

  const handleSortChange = (sid: string) => {
    if (sid === sort) return
    setSort(sid)
    setAnnounce(`Sort changed to ${SORT_OPTIONS.find(s=>s.id===sid)?.label}`)
    if (typeof window !== 'undefined') {
      localStorage.setItem('moviesGrid:sort', sid)
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white flex flex-col">
      <MoviepireNavigation onNavigate={onNavigate} activeCategory={activeCategory} />

      <main className="flex-1 pt-24 pb-16 px-8">
        {/* Live region for announcements */}
        <div className="sr-only" aria-live="polite">{announce}</div>

        {/* Heading and controls row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-4xl font-bold tracking-tight">{headingTitle} Movies</h1>
            <GenreSelect
              value={selectedGenre}
              onChange={(v) => handleGenreSelect(v)}
              options={genres}
              className="min-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Grid/List toggle */}
            <button
              className={
                `group relative inline-flex items-center justify-center h-11 w-11 rounded-lg bg-zinc-900/90 text-white ` +
                `shadow-inner ring-1 ring-zinc-700/60 hover:ring-zinc-500/70 transition-colors focus:outline-none ` +
                `focus-visible:ring-2 focus-visible:ring-red-600/80`
              }
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              <span className="text-lg leading-none select-none">
                {viewMode === 'grid' ? '▦' : '≡'}
              </span>
            </button>
            {/* Sort dropdown */}
            <AppSelect
              value={sort}
              onChange={(v) => handleSortChange(v)}
              options={SORT_OPTIONS.map(o => ({ value: o.id, label: o.label }))}
              placeholder="Sort"
              className="min-w-[150px]"
            />
            {(selectedGenre || sort !== 'popularity') && (
              <button
                onClick={() => {
                  setSelectedGenre(null)
                  setSort('popularity')
                  setAnnounce('Filters cleared')
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('moviesGrid:selectedGenre', '')
                    localStorage.setItem('moviesGrid:sort', 'popularity')
                  }
                }}
                className={
                  'inline-flex items-center h-11 px-5 rounded-lg bg-zinc-900/90 text-white text-sm font-medium shadow-inner ' +
                  'ring-1 ring-zinc-700/60 hover:ring-zinc-500/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/80'
                }
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
        {/* (Clear Filters moved into controls row) */}

        {/* Error State */}
        {error && !isLoadingInitial && (
          <div className="py-20 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchCategoryPage(category, 1, false)} variant="outline" className="bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700">Retry</Button>
          </div>
        )}

        {/* Initial Loading Skeleton */}
        {isLoadingInitial && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4" aria-label="Loading movies" aria-busy="true">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-md bg-zinc-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {/* Grid/List view */}
        {!isLoadingInitial && !error && viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4" role="grid" aria-label={`${headingTitle} Movies Grid`}>
            {movies.map((movie, idx) => {
              const inWatch = watchlist.some(w => w.content_id === movie.id)
              return (
              <div
                key={movie.id + '-' + idx}
                role="gridcell"
                className="group relative aspect-[2/3] cursor-pointer rounded-md overflow-hidden bg-zinc-900/60 shadow-sm transform-gpu transition-transform duration-300 hover:scale-[1.045] hover:-translate-y-2 outline-none"
                tabIndex={0}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('app:movieMoreInfo', { detail: movie }))
                  onMoreInfo(movie.id)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { window.dispatchEvent(new CustomEvent('app:movieMoreInfo', { detail: movie })); onMoreInfo(movie.id) } else if (e.key === ' ') { e.preventDefault(); onPlay(movie.id, movie.title) } }}
                aria-label={`${movie.title}${movie.year ? ' (' + movie.year + ')' : ''}`}
              >
                {movie.poster ? (
                  <img src={movie.poster} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-zinc-700 flex items-center justify-center p-2">
                    <span className="text-gray-300 text-xs text-center line-clamp-3">{movie.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onPlay(movie.id, movie.title); window.dispatchEvent(new CustomEvent('app:moviePlay', { detail: movie })) }}
                      className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                      title="Play"
                    >▶</button>
                    <WatchlistToggleButton
                      inList={inWatch}
                      size={40}
                      variant="overlay"
                      onToggle={() => {
                        inWatch ? removeWatch(movie.id) : addWatch(movie.id, 'movie')
                        onAddToList?.(movie.id)
                      }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('app:movieMoreInfo', { detail: movie })); onMoreInfo(movie.id) }}
                      className="h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                      title="More Info"
                      aria-label="More Info"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* List view */}
        {!isLoadingInitial && !error && viewMode === 'list' && (
          <div className="flex flex-col gap-4" role="list" aria-label={`${headingTitle} Movies List`}>
            {movies.map((movie, idx) => {
              const inWatch = watchlist.some(w => w.content_id === movie.id)
              return (
              <div
                key={movie.id + '-' + idx}
                role="listitem"
                className="group flex items-center gap-6 p-4 rounded-md bg-zinc-900/60 shadow-sm cursor-pointer hover:bg-zinc-800 transition-colors outline-none"
                tabIndex={0}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('app:movieMoreInfo', { detail: movie }))
                  onMoreInfo(movie.id)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { window.dispatchEvent(new CustomEvent('app:movieMoreInfo', { detail: movie })); onMoreInfo(movie.id) } else if (e.key === ' ') { e.preventDefault(); onPlay(movie.id, movie.title) } }}
                aria-label={`${movie.title}${movie.year ? ' (' + movie.year + ')' : ''}`}
              >
                {movie.poster ? (
                  <img src={movie.poster} alt={movie.title} className="w-24 h-36 object-cover rounded-md" loading="lazy" />
                ) : (
                  <div className="w-24 h-36 bg-zinc-700 flex items-center justify-center p-2 rounded-md">
                    <span className="text-gray-300 text-xs text-center line-clamp-3">{movie.title}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{movie.title}</h2>
                  {movie.year && <p className="text-xs text-white/60">{movie.year}</p>}
                  {movie.rating && <p className="text-xs text-yellow-400">Rating: {movie.rating / 10}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlay(movie.id, movie.title); window.dispatchEvent(new CustomEvent('app:moviePlay', { detail: movie })) }}
                    className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                    title="Play"
                  >▶</button>
                  <WatchlistToggleButton
                    inList={inWatch}
                    size={40}
                    variant="overlay"
                    onToggle={() => {
                      inWatch ? removeWatch(movie.id) : addWatch(movie.id, 'movie')
                      onAddToList?.(movie.id)
                    }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('app:movieMoreInfo', { detail: movie })); onMoreInfo(movie.id) }}
                    className="h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    title="More Info"
                    aria-label="More Info"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Append Loader */}
        {isAppending && !isLoadingInitial && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-md bg-zinc-800/40 animate-pulse" />
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1 w-full" />
        {page >= totalPages && totalPages > 0 && !isLoadingInitial && (
          <p className="text-center text-xs text-white/40 mt-10">End of results</p>
        )}
      </main>

      <MoviepireFooter />
    </div>
  )
}

export default MoviesGridPage
