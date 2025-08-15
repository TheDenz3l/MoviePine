"use client"

import CinematicRail from '@/components/cinematic/CinematicRail'
import { Search } from 'lucide-react'
import { useMyList } from '@/components/list/useMyList'
import { useCallback } from 'react'

interface SearchResult {
  id: string
  title: string
  poster: string
  backdrop?: string
  year?: number
  type: 'movie' | 'tv'
}

interface SeamlessSearchOverlayProps {
  searchResults: SearchResult[]
  searchQuery: string
  isSearching: boolean
  onPlay: (movieId: string, title?: string) => void
  onAddToList: (movie: SearchResult) => void
  onMoreInfo: (movie: SearchResult) => void
}

export function SeamlessSearchOverlay({
  searchResults,
  searchQuery,
  isSearching,
  onPlay,
  onAddToList,
  onMoreInfo
}: SeamlessSearchOverlayProps) {
  const { addWatch } = useMyList()

  // Enhanced add to list handler that provides visual feedback
  const handleAddToList = useCallback((movie: SearchResult) => {
    // Add to watchlist with proper content type
    const contentType = movie.type === 'tv' ? 'series' : 'movie'
    addWatch(movie.id, contentType)
    
    // Call the original callback
    onAddToList(movie)
    
    // Show a brief toast-like feedback (optional enhancement)
    // You could add a toast notification here if needed
  }, [addWatch, onAddToList])

  // Don't render anything if there's no search query
  if (!searchQuery.trim()) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 bg-[rgb(18,18,18)]/95 backdrop-blur-sm" data-search-overlay>
      {/* Content area with top padding to account for navigation */}
      <div className="pt-24 px-6 h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Search Status */}
          <div className="mb-6">
            {isSearching ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                <p className="text-gray-400 text-lg">Searching for "{searchQuery}"...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <p className="text-white text-lg">
                Found <span className="text-red-400 font-semibold">{searchResults.length}</span> results for "{searchQuery}"
              </p>
            ) : (
              <p className="text-gray-400 text-lg">No results found for "{searchQuery}"</p>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <CinematicRail
              id="seamless-search-results"
              title="Search Results"
              items={searchResults.map(result => ({
                id: result.id,
                title: result.title,
                poster: result.poster,
                backdrop: result.backdrop || result.poster,
                year: result.year,
                genre: [result.type === 'movie' ? 'Movie' : 'TV Show']
              })) as any}
              onPlay={(id) => { const found = searchResults.find(r=>r.id===id); if(found) onPlay(id, found.title) }}
              onAdd={(id) => { const found = searchResults.find(r=>r.id===id); if(found) handleAddToList(found) }}
              onInfo={(id) => { const found = searchResults.find(r=>r.id===id); if(found) onMoreInfo(found) }}
            />
          ) : !isSearching && searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">No results found</h2>
              <p className="text-gray-500">Try searching with different keywords</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
