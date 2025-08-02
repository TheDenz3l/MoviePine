"use client"

import { useState, useEffect, useCallback } from 'react'
import { StreamingService, StreamingMovie, StreamingSource, createStreamingService } from '@/lib/services/streaming'
import { getConfig, getConfigOrDefault } from '@/lib/config'

// Force client-side rendering
const isClient = typeof window !== 'undefined'

interface UseStreamingReturn {
  // Data
  trendingMovies: StreamingMovie[]
  popularMovies: StreamingMovie[]
  topRatedMovies: StreamingMovie[]
  searchResults: StreamingMovie[]
  
  // Loading states
  isLoading: boolean
  isSearching: boolean
  
  // Error states
  error: string | null
  
  // Methods
  searchMovies: (query: string) => Promise<void>
  getMovieStreams: (movieId: string) => Promise<StreamingSource[]>
  getStreamingUrl: (movieId: string, preferredQuality?: string) => Promise<string | null>
  clearSearch: () => void
  
  // Service status
  serviceStatus: {
    tmdb: boolean
    torbox: boolean
    torrentio: boolean
    realdebrid: boolean
  } | null
}

export function useStreaming(): UseStreamingReturn {
  console.log('🎬 useStreaming hook called')

  const [streamingService, setStreamingService] = useState<StreamingService | null>(null)
  const [trendingMovies, setTrendingMovies] = useState<StreamingMovie[]>([])
  const [popularMovies, setPopularMovies] = useState<StreamingMovie[]>([])
  const [topRatedMovies, setTopRatedMovies] = useState<StreamingMovie[]>([])
  const [searchResults, setSearchResults] = useState<StreamingMovie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceStatus, setServiceStatus] = useState<{
    tmdb: boolean
    torbox: boolean
    torrentio: boolean
    realdebrid: boolean
  } | null>(null)

  // Initialize streaming service
  useEffect(() => {
    console.log('🚀 useStreaming useEffect triggered')

    // Only run on client side
    if (!isClient) {
      console.log('⚠️ Not on client side, skipping initialization')
      return
    }

    console.log('✅ Running on client side, proceeding with initialization')
    setIsLoading(false) // Temporary: just set loading to false to see if useEffect runs

    // Temporary: just return early to test if useEffect runs
    return

    const initializeService = async () => {
      try {
        console.log('🔄 Fetching configuration from API...')
        setIsLoading(true)

        // Fetch configuration from API
        const configResponse = await fetch('/api/config')
        console.log('📡 Config API response status:', configResponse.status)

        const configData = await configResponse.json()
        console.log('📊 Config API response data:', configData)

        if (!configData.success) {
          throw new Error(configData.error || 'Failed to load configuration')
        }

        console.log('✅ Configuration loaded from API:', configData.configSource)
        console.log('🔧 Config details:', {
          tmdbApiKey: configData.config.tmdbApiKey ? 'SET' : 'NOT SET',
          debridService: configData.config.debridService || 'NOT SET',
          debridApiKey: configData.config.debridApiKey ? 'SET' : 'NOT SET'
        })

        const config = configData.config

        const service = createStreamingService(config)
        setStreamingService(service)

        // Validate service configuration
        service.validateConfiguration().then(status => {
          console.log('🔧 Service status:', status)
          setServiceStatus(status)
          setIsLoading(false)
          if (!status.tmdb && config.tmdbApiKey) {
            setError('TMDB API is not configured properly. Please check your API key.')
          }
        }).catch(err => {
          console.error('Service validation failed:', err)
          setError('Failed to validate streaming service configuration')
          setIsLoading(false)
        })

      } catch (err) {
        console.error('❌ Failed to initialize streaming service:', err)
        setError('Failed to initialize streaming service')
        setIsLoading(false)
      }
    }

    initializeService()
  }, [])

  // Load initial data
  useEffect(() => {
    if (!streamingService) return

    const loadInitialData = async () => {
      // Only show loading if we have a valid API key
      const config = getConfigOrDefault()
      if (config.tmdbApiKey) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const [trending, popular, topRated] = await Promise.all([
          streamingService.getTrendingMovies(),
          streamingService.getPopularMovies(),
          streamingService.getTopRatedMovies(),
        ])

        setTrendingMovies(trending)
        setPopularMovies(popular)
        setTopRatedMovies(topRated)
      } catch (err) {
        console.error('Failed to load initial data:', err)
        if (config.tmdbApiKey) {
          setError('Failed to load movie data')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [streamingService])

  // Search movies
  const searchMovies = useCallback(async (query: string) => {
    if (!streamingService) return

    setIsSearching(true)
    setError(null)

    try {
      const results = await streamingService.searchMovies(query)
      setSearchResults(results)
    } catch (err) {
      console.error('Search failed:', err)
      setError('Search failed')
    } finally {
      setIsSearching(false)
    }
  }, [streamingService])

  // Get movie streams
  const getMovieStreams = useCallback(async (movieId: string): Promise<StreamingSource[]> => {
    if (!streamingService) return []

    try {
      return await streamingService.getMovieStreams(movieId)
    } catch (err) {
      console.error('Failed to get movie streams:', err)
      return []
    }
  }, [streamingService])

  // Get streaming URL
  const getStreamingUrl = useCallback(async (movieId: string, preferredQuality?: string): Promise<string | null> => {
    if (!streamingService) return null

    try {
      return await streamingService.getStreamingUrl(movieId, preferredQuality)
    } catch (err) {
      console.error('Failed to get streaming URL:', err)
      return null
    }
  }, [streamingService])

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults([])
  }, [])

  return {
    // Data
    trendingMovies,
    popularMovies,
    topRatedMovies,
    searchResults,
    
    // Loading states
    isLoading,
    isSearching,
    
    // Error states
    error,
    
    // Methods
    searchMovies,
    getMovieStreams,
    getStreamingUrl,
    clearSearch,
    
    // Service status
    serviceStatus,
  }
}

// Hook for getting streams for a specific movie
export function useMovieStreams(movieId: string | null) {
  const [streams, setStreams] = useState<StreamingSource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getMovieStreams } = useStreaming()

  useEffect(() => {
    if (!movieId) {
      setStreams([])
      return
    }

    const loadStreams = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const movieStreams = await getMovieStreams(movieId)
        setStreams(movieStreams)
      } catch (err) {
        console.error('Failed to load streams:', err)
        setError('Failed to load streams')
      } finally {
        setIsLoading(false)
      }
    }

    loadStreams()
  }, [movieId, getMovieStreams])

  return {
    streams,
    isLoading,
    error,
  }
}
