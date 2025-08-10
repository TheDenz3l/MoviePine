"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TMDBAPI } from '@/lib/api/tmdb'
// Unified carousel style replaces CinematicRail
import NetflixCarousel from '@/components/cinematic/NetflixCarousel'
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SearchMovie {
  id: string
  title: string
  poster: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
  runtime?: number
}

interface SearchResultsPageProps {
  onMovieSelect: (movie: SearchMovie) => void
  onBack: () => void
  onNavigate?: (category: string) => void
  onSearch?: (query: string) => void
  activeCategory?: string
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

export function SearchResultsPage({ onMovieSelect, onBack, onNavigate, onSearch, activeCategory = 'search' }: SearchResultsPageProps) {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // Get initial query from URL params
  useEffect(() => {
  const query = searchParams?.get('q')
    if (query) {
      setSearchQuery(query)
      performSearch(query, 1)
    }
  }, [searchParams])

  // Perform search function
  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const results = await tmdbApi.searchMulti(query.trim(), page)
      
      // Transform TMDB results to our SearchMovie format
      const transformedResults: SearchMovie[] = results.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => ({
          id: item.id.toString(),
          title: item.media_type === 'movie' ? item.title : item.name,
          poster: item.poster_path
            ? tmdbApi.getPosterUrl(item.poster_path, 'w500')
            : '/placeholder-poster.svg',
          backdrop: item.backdrop_path 
            ? tmdbApi.getBackdropUrl(item.backdrop_path, 'w1280')
            : undefined,
          year: item.media_type === 'movie' 
            ? new Date(item.release_date || '').getFullYear() || 0
            : new Date(item.first_air_date || '').getFullYear() || 0,
          rating: item.vote_average || 0,
          genre: item.genre_ids?.map((id: number) => `Genre ${id}`) || [],
          description: item.overview || 'No description available.',
          runtime: undefined
        }))
        .filter((item: SearchMovie) => item.title && item.year) // Filter out items without title or year

      if (page === 1) {
        setSearchResults(transformedResults)
      } else {
        setSearchResults(prev => [...prev, ...transformedResults])
      }
      
      setCurrentPage(page)
      setTotalPages(results.total_pages || 1)
      setIsLoading(false)
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search. Please try again.')
      setIsLoading(false)
    }
  }

  // Handle new search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setCurrentPage(1)
      performSearch(searchQuery.trim(), 1)
      // Update URL
      const url = new URL(window.location.href)
      url.searchParams.set('q', searchQuery.trim())
      window.history.pushState({}, '', url.toString())
    }
  }

  // Load more results
  const loadMore = () => {
    if (currentPage < totalPages && !isLoading) {
      performSearch(searchQuery, currentPage + 1)
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
      {/* Moviepire Navigation */}
      <MoviepireNavigation
        onNavigate={onNavigate || (() => {})}
        activeCategory={activeCategory}
      />

      {/* Search Header */}
      <div className="pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
              <Input
                type="text"
                placeholder="Search movies, shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 rounded-lg"
              />
            </div>
          </form>

          {searchQuery && (
            <h1 className="text-3xl font-bold mb-8">
              Search results for "{searchQuery}"
            </h1>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="text-red-500 text-center py-8">
              {error}
            </div>
          )}

          {isLoading && searchResults.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-xl">Searching...</div>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <NetflixCarousel
                id="search-results-rail-full"
                title="Search Results"
                items={searchResults.slice(0,72).map(r => ({ id: r.id, title: r.title, poster: r.poster, backdrop: r.backdrop || r.poster, year: r.year, genre: r.genre })) as any}
                onPlay={(id) => { const mv = searchResults.find(x=>x.id===id); if(mv) onMovieSelect(mv) }}
                onAdd={(id) => { /* no-op add list placeholder */ }}
                onInfo={(id) => { const mv = searchResults.find(x=>x.id===id); if(mv) onMovieSelect(mv) }}
                browseReplication
                titlePopOut
                intentDelayMs={70}
                prefetchNeighbors
                showMetadata={false}
                showTitle={false}
                actionButtonSize={40}
                frameLift
                frameLiftScale={1.045}
                frameLiftTranslateY={-8}
              />

              {/* Load More Button */}
              {currentPage < totalPages && (
                <div className="text-center mt-8">
                  <Button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          ) : searchQuery && !isLoading ? (
            <div className="text-center py-12">
              <div className="text-xl text-gray-400">
                No results found for "{searchQuery}"
              </div>
              <div className="text-gray-500 mt-2">
                Try searching with different keywords
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <MoviepireFooter />
    </div>
  )
}
