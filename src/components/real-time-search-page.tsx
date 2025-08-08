"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { TMDBAPI } from '@/lib/api/tmdb'
import { MovieDetailModal } from '@/components/movie-detail-modal'
import { MoviepireMovieGrid } from '@/components/moviepire-movie-grid'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchMovie {
  id: string
  title: string
  poster: string
  year?: number
  genre?: string[]
}

interface RealTimeSearchPageProps {
  initialQuery?: string
  onMovieSelect: (movie: SearchMovie) => void
  onPlay: (movieId: string, title: string) => void
  onAddToList: (movie: SearchMovie) => void
  onMoreInfo: (movie: SearchMovie) => void
  onClose: () => void
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

export function RealTimeSearchPage({
  initialQuery = '',
  onMovieSelect,
  onPlay,
  onAddToList,
  onMoreInfo,
  onClose
}: RealTimeSearchPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedModalMovie, setSelectedModalMovie] = useState<{
    id: string
    title: string
    poster: string
    backdrop?: string
    year: number
    rating: number
    genre: string[]
    description: string
    runtime?: number
    tmdbId?: string | number
  } | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // When modal is open, prevent global document click handlers from closing the page
  useEffect(() => {
    if (!isModalOpen) return
    const stopBubbling = (event: Event) => {
      event.stopPropagation()
      // @ts-ignore
      if (typeof event.stopImmediatePropagation === 'function') {
        // @ts-ignore
        event.stopImmediatePropagation()
      }
    }
    document.addEventListener('mousedown', stopBubbling, false)
    document.addEventListener('click', stopBubbling, false)
    return () => {
      document.removeEventListener('mousedown', stopBubbling, false)
      document.removeEventListener('click', stopBubbling, false)
    }
  }, [isModalOpen])

  // Real-time search as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length > 0) {
      setIsSearching(true)
      setHasSearched(true)
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await tmdbApi.searchMulti(searchQuery.trim(), 1)
          const transformedResults: SearchMovie[] = results.results
            .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item: any) => ({
              id: item.id.toString(),
              title: item.media_type === 'movie' ? item.title : item.name,
              poster: item.poster_path
                ? tmdbApi.getPosterUrl(item.poster_path, 'w500')
                : '/placeholder-poster.svg',
              year: item.media_type === 'movie' 
                ? new Date(item.release_date || '').getFullYear() || undefined
                : new Date(item.first_air_date || '').getFullYear() || undefined,
              genre: item.genre_ids?.map((id: number) => `Genre ${id}`) || []
            }))
            .filter((item: SearchMovie) => item.title && item.poster)

          setSearchResults(transformedResults)
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 200) // Faster response for real-time feel
    } else {
      setSearchResults([])
      setIsSearching(false)
      setHasSearched(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const handleClosePage = useCallback(() => {
    if (isModalOpen) {
      setIsModalOpen(false)
      return
    }
    onClose()
  }, [isModalOpen, onClose])

  // Handle escape key: closes modal first, then page if no modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClosePage()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClosePage])

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleMoviePlay = (movieId: string, title: string) => {
    onPlay(movieId, title)
    // Keep the real-time search page open
  }

  const handleMovieMoreInfo = (movie: SearchMovie) => {
    // Adapt minimal data for modal. Modal will fetch more via tmdbId.
    const adaptedMovie = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster,
      backdrop: movie.poster,
      year: movie.year || new Date().getFullYear(),
      rating: 0,
      genre: movie.genre || [],
      description: '',
      tmdbId: movie.id,
    }
    setSelectedModalMovie(adaptedMovie)
    setIsModalOpen(true)
  }

  const handleMovieAddToList = (movie: SearchMovie) => {
    onAddToList(movie)
  }

  return (
    <div className={`fixed inset-0 z-50 bg-[rgb(18,18,18)] text-white overflow-hidden ${isModalOpen ? 'pointer-events-none' : ''}`}>
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-[rgb(18,18,18)]/95 backdrop-blur-sm border-b border-gray-800/50">
        <div className="flex items-center px-6 py-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for movies and TV shows..."
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50"
            />
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClosePage}
            className="ml-4 text-gray-400 hover:text-white hover:bg-gray-800/50"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Search Status */}
        <div className="px-6 pb-4">
          {isSearching && (
            <p className="text-gray-400 text-sm">Searching...</p>
          )}
          {!isSearching && hasSearched && searchQuery.trim() && (
            <p className="text-gray-400 text-sm">
              {searchResults.length > 0 
                ? `Found ${searchResults.length} results for "${searchQuery}"`
                : `No results found for "${searchQuery}"`
              }
            </p>
          )}
          {!hasSearched && (
            <p className="text-gray-400 text-sm">Start typing to search for movies and TV shows</p>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {searchResults.length > 0 ? (
            <MoviepireMovieGrid
              title=""
              movies={searchResults}
              onPlay={handleMoviePlay}
              onAddToList={handleMovieAddToList}
              onMoreInfo={handleMovieMoreInfo}
              showMovieTitles={true}
            />
          ) : hasSearched && !isSearching && searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">No results found</h2>
              <p className="text-gray-500">Try searching with different keywords</p>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">Search for content</h2>
              <p className="text-gray-500">Start typing to find movies and TV shows</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal shown on top of the real-time search page */}
      <MovieDetailModal
        movie={selectedModalMovie}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlay={(movieId) => {
          onPlay(movieId, selectedModalMovie?.title || '')
          setIsModalOpen(false)
        }}
        onAddToList={(movieId) => onAddToList({ id: movieId, title: selectedModalMovie?.title || '', poster: selectedModalMovie?.poster || '' })}
        onMovieSelect={(m) => {
          // When selecting a similar movie inside the modal, keep the modal open but update content
          setSelectedModalMovie({
            id: m.id,
            title: m.title,
            poster: m.poster,
            backdrop: m.backdrop,
            year: m.year,
            rating: m.rating,
            genre: m.genre,
            description: m.description,
            runtime: m.runtime,
            tmdbId: m.tmdbId,
          })
        }}
      />
    </div>
  )
}
