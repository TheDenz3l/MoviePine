"use client"

import { useState, useEffect, useCallback } from 'react'
import { TMDBAPI } from '@/lib/api/tmdb'

interface SearchResult {
  id: string
  title: string
  year: number
  poster: string
  type: 'movie' | 'tv'
}

interface UseSearchReturn {
  searchResults: SearchResult[]
  isLoading: boolean
  error: string | null
  search: (query: string) => void
  clearResults: () => void
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

export function useSearch(): UseSearchReturn {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Debounced search function
  const search = useCallback((query: string) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([])
      setIsLoading(false)
      setError(null)
      return
    }

    // Set loading state
    setIsLoading(true)
    setError(null)

    // Debounce search by 300ms
    const timeout = setTimeout(async () => {
      try {
        const results = await tmdbApi.searchMulti(query.trim())
        
        // Transform TMDB results to our SearchResult format
        const transformedResults: SearchResult[] = results.results
          .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
          .map((item: any) => ({
            id: item.id.toString(),
            title: item.media_type === 'movie' ? item.title : item.name,
            year: item.media_type === 'movie' 
              ? new Date(item.release_date || '').getFullYear() || 0
              : new Date(item.first_air_date || '').getFullYear() || 0,
            poster: item.poster_path
              ? tmdbApi.getPosterUrl(item.poster_path, 'w342')
              : '/placeholder-poster.svg',
            type: item.media_type as 'movie' | 'tv'
          }))
          .filter((item: SearchResult) => item.title && item.year) // Filter out items without title or year

        setSearchResults(transformedResults)
        setIsLoading(false)
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to search. Please try again.')
        setSearchResults([])
        setIsLoading(false)
      }
    }, 300)

    setSearchTimeout(timeout)
  }, [searchTimeout])

  // Clear results function
  const clearResults = useCallback(() => {
    setSearchResults([])
    setIsLoading(false)
    setError(null)
    if (searchTimeout) {
      clearTimeout(searchTimeout)
      setSearchTimeout(null)
    }
  }, [searchTimeout])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  return {
    searchResults,
    isLoading,
    error,
    search,
    clearResults
  }
}
