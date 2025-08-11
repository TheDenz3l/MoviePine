"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Home, Film, Tv, Bookmark } from 'lucide-react'
import { MoviepireMovieCard } from '@/components/moviepire-movie-card'

interface SearchResult {
  id: string
  title: string
  poster: string
  backdrop?: string
  year?: number
  type: 'movie' | 'tv'
}

interface MoviepireSearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  onPlay: (id: string, title?: string) => void
  onAddToList: (id: string) => void
  onMoreInfo: (id: string, type: 'movie' | 'tv') => void
  onNavigate: (category: string) => void
  activeCategory: string
}

const cache = new Map<string, { ts: number; results: SearchResult[] }>()

export function MoviepireSearchOverlay({
  isOpen,
  onClose,
  onPlay,
  onAddToList,
  onMoreInfo,
  onNavigate,
  activeCategory
}: MoviepireSearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''

  // Focus search input when overlay opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Handle search with debouncing
  useEffect(() => {
    if (!isOpen) return
    
    const q = searchQuery.trim()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    
    if (!q) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    debounceRef.current = window.setTimeout(async () => {
      // Check cache first
      const cached = cache.get(q)
      if (cached && Date.now() - cached.ts < 300000) {
        setResults(cached.results)
        setLoading(false)
        setError(null)
        return
      }

      // Abort previous request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)

      try {
        if (!apiKey) throw new Error('Missing API key')

        const url = new URL('https://api.themoviedb.org/3/search/multi')
        url.searchParams.set('api_key', apiKey)
        url.searchParams.set('query', q)
        url.searchParams.set('include_adult', 'false')

        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited' : 'Search failed')

        const data = await res.json()
        const searchResults: SearchResult[] = (data.results || [])
          .filter((r: any) => r && (r.media_type === 'movie' || r.media_type === 'tv'))
          .map((r: any) => ({
            id: String(r.id),
            title: r.media_type === 'movie' ? r.title : r.name,
            poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '/placeholder-poster.svg',
            backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : undefined,
            year: r.release_date ? new Date(r.release_date).getFullYear() : (r.first_air_date ? new Date(r.first_air_date).getFullYear() : undefined),
            type: r.media_type
          }))

        cache.set(q, { ts: Date.now(), results: searchResults })
        setResults(searchResults)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        setError(e?.message || 'Search error')
      } finally {
        setLoading(false)
      }
    }, 240)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [searchQuery, isOpen, apiKey])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Navigation items
  const navItems = [
    { id: 'home', label: 'Browse', icon: Home },
    { id: 'explore-movies', label: 'Movies', icon: Film },
    { id: 'explore-series', label: 'Series', icon: Tv },
    { id: 'recently-played', label: 'My List', icon: Bookmark },
  ]

  const handleNavClick = (categoryId: string) => {
    onClose()
    onNavigate(categoryId)
  }

  const handlePlay = useCallback((movieId: string) => {
    const item = results.find(r => r.id === movieId)
    onClose()
    onPlay(movieId, item?.title)
  }, [results, onPlay, onClose])

  const handleAddToList = useCallback((movieId: string) => {
    onClose()
    onAddToList(movieId)
  }, [onAddToList, onClose])

  const handleMoreInfo = useCallback((movieId: string) => {
    const item = results.find(r => r.id === movieId)
    onClose()
    if (item) {
      onMoreInfo(movieId, item.type)
    }
  }, [results, onMoreInfo, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] bg-[rgb(18,18,18)] overflow-y-auto">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        {/* Logo */}
        <div className="flex items-center">
          <span className="text-2xl font-bold">
            <span className="text-white">MOVIE</span>
            <span className="text-red-600 bg-red-600 text-white px-1 ml-1 rounded">PIRE</span>
          </span>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center space-x-8">
          {navItems.map((item) => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center text-sm font-bold transition-colors duration-200 hover:text-white ${
                  activeCategory === item.id ? 'text-red-600' : 'text-gray-300'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies and TV shows..."
              className="bg-black/50 text-white pl-10 pr-4 py-2 rounded border border-gray-600/50 w-80 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50"
            />
          </div>
        </div>
      </nav>

      {/* Search Results Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Status */}
          <div className="mb-8">
            {!searchQuery.trim() && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
                <h2 className="text-2xl font-semibold text-gray-400 mb-2">Search Movies & TV Shows</h2>
                <p className="text-gray-500">Start typing to find your favorite content</p>
              </div>
            )}
            
            {searchQuery.trim() && loading && (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                <p className="text-gray-300 text-lg">Searching for "{searchQuery}"...</p>
              </div>
            )}
            
            {searchQuery.trim() && !loading && !error && results.length > 0 && (
              <h2 className="text-white text-2xl font-bold mb-2">
                {searchQuery}
              </h2>
            )}
            
            {searchQuery.trim() && !loading && !error && results.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
                <h2 className="text-2xl font-semibold text-gray-400 mb-2">No results found</h2>
                <p className="text-gray-500">Try searching with different keywords</p>
              </div>
            )}
            
            {error && (
              <p className="text-red-400 text-lg">{error}</p>
            )}
          </div>

          {/* Results Grid */}
          {searchQuery.trim() && results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {results.map((item) => (
                <MoviepireMovieCard
                  key={item.id}
                  movie={{
                    id: item.id,
                    title: item.title,
                    poster: item.poster,
                    backdrop: item.backdrop,
                    year: item.year,
                    rating: 0,
                    genre: [item.type === 'movie' ? 'Movie' : 'TV Show']
                  }}
                  onPlay={() => handlePlay(item.id)}
                  onAddToList={() => handleAddToList(item.id)}
                  onMoreInfo={() => handleMoreInfo(item.id)}
                  showTitle={false}
                />
              ))}
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && results.length === 0 && searchQuery.trim() && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg bg-gray-800/50 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
