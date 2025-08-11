"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NetflixSearchItem {
  id: string
  title: string
  poster: string
  backdrop?: string
  year?: number
  rating?: number
  type: 'movie' | 'tv'
}

interface NetflixGridSearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  onPlay: (id: string, title: string) => void
  onAddToList: (id: string) => void
  onMoreInfo: (id: string, type: 'movie' | 'tv') => void
}

export default function NetflixGridSearchOverlay({
  isOpen,
  onClose,
  onPlay,
  onAddToList,
  onMoreInfo
}: NetflixGridSearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NetflixSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  const debounceRef = useRef<NodeJS.Timeout>()

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      // Arrow key navigation for grid
      if (e.key === 'ArrowDown' && selectedIndex < results.length - 1) {
        e.preventDefault()
        setSelectedIndex(prev => prev + 1)
      }
      if (e.key === 'ArrowUp' && selectedIndex > 0) {
        e.preventDefault()
        setSelectedIndex(prev => prev - 1)
      }
      if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault()
        handlePlay(results[selectedIndex].id, results[selectedIndex].title)
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, selectedIndex, results, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Real-time search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&include_adult=false`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      
      const searchResults: NetflixSearchItem[] = data.results
        .filter((item: any) => 
          item && 
          (item.media_type === 'movie' || item.media_type === 'tv') &&
          item.poster_path
        )
        .map((item: any) => ({
          id: String(item.id),
          title: item.media_type === 'movie' ? item.title : item.name,
          poster: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
          backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : undefined,
          year: item.media_type === 'movie' 
            ? item.release_date 
              ? new Date(item.release_date).getFullYear() 
              : undefined
            : item.first_air_date
              ? new Date(item.first_air_date).getFullYear()
              : undefined,
          rating: item.vote_average,
          type: item.media_type
        }))

      setResults(searchResults)
    } catch (err) {
      setError('Failed to search. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        performSearch(query)
      }, 300)
    } else {
      setResults([])
      setLoading(false)
      setError(null)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, performSearch])

  const handlePlay = (id: string, title: string) => {
    onPlay(id, title)
    onClose()
  }

  const handleAdd = (id: string) => {
    onAddToList(id)
  }

  const handleMoreInfo = (id: string, type: 'movie' | 'tv') => {
    onMoreInfo(id, type)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
      <div 
        ref={searchRef}
        className="relative max-w-7xl mx-auto h-full flex flex-col"
      >
        {/* Netflix-style search header */}
        <div className="flex-shrink-0 bg-black/90 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center gap-4 p-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for movies, TV shows..."
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          {/* Search status */}
          <div className="px-6 pb-4">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </div>
            )}
            {error && (
              <div className="text-sm text-red-400">
                {error}
              </div>
            )}
            {results.length > 0 && !loading && (
              <div className="text-sm text-gray-400">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
        </div>

        {/* Netflix-style grid results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!query && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Search className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                What do you want to watch?
              </h2>
              <p className="text-gray-500">
                Search for movies, TV shows, and more.
              </p>
            </div>
          )}

          {query && loading && results.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {query && !loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Search className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                No results found
              </h2>
              <p className="text-gray-500">
                Try different keywords or check your spelling.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative aspect-[2/3] cursor-pointer transform transition-all duration-200 hover:scale-105 hover:z-10 ${
                    selectedIndex === index ? 'ring-2 ring-red-600 scale-105 z-10' : ''
                  }`}
                  onClick={() => handlePlay(item.id, item.title)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseLeave={() => setSelectedIndex(-1)}
                >
                  {/* Poster image */}
                  <div className="w-full h-full overflow-hidden rounded-lg bg-gray-900">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {/* Title */}
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                        {item.title}
                      </h3>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-2 text-xs text-gray-300 mb-3">
                        {item.year && <span>{item.year}</span>}
                        {item.rating && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-400">★</span>
                              {item.rating.toFixed(1)}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="uppercase">{item.type}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlay(item.id, item.title)
                          }}
                          className="flex-1 bg-white text-black py-2 px-3 rounded text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Play
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAdd(item.id)
                          }}
                          className="bg-gray-800/80 text-white p-2 rounded hover:bg-gray-700/80 transition-colors"
                          title="Add to My List"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoreInfo(item.id, item.type)
                          }}
                          className="bg-gray-800/80 text-white p-2 rounded hover:bg-gray-700/80 transition-colors"
                          title="More Info"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}