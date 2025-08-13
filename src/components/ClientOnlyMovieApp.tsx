"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Film } from 'lucide-react'
import { StreamingService, createStreamingService } from '@/lib/services/streaming'
import { StreamingMovie, StreamingSeries } from '@/lib/services/streaming'
import { TMDBAPI } from '@/lib/api/tmdb'
import { MovieCard } from '@/components/movie-card'
import { NetflixMovieRow } from '@/components/netflix-movie-row'
import { NetflixHeroSection } from '@/components/netflix-hero-section'
import { MovieDetailModal } from '@/components/movie-detail-modal'
import { NetflixFloatingNav } from '@/components/netflix-floating-nav'
import { VideoPlayerModal } from '@/components/video-player-modal'
import { detectSafari, getBrowserInfo } from '@/lib/utils/browser-detection'
import { RecentlyPlayedRow } from '@/components/recently-played-row'
// Moviepire components
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireHeroSection } from '@/components/moviepire-hero-section'
// Removed CinematicRail in favor of unified NetflixCarousel styling everywhere
// import CinematicRail from '@/components/cinematic/CinematicRail'
import { NetflixGrid, NetflixCarousel as NewNetflixCarousel } from '@/components/netflix-style'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { MoviepireModal } from '@/components/moviepire-modal'
// Legacy explore page replaced by new MoviesGridPage grid design for movies
import { MoviesGridPage } from '@/components/movies-grid-page'
import { TVSeriesPage } from '@/components/tv-series-page'
import { TVGardenLiveTVPage } from '@/components/tv-garden-live-tv-page'
import { LiveTVPage } from '@/components/live-tv-page'
import { RealTimeSearchGridOverlay } from '@/components/search/RealTimeSearchGridOverlay'
import { RecentlyPlayedService, RecentlyPlayedMovie } from '@/lib/services/recently-played-service'
// import MoviepireGrid from '@/components/moviepire-grid' // Replaced by unified NetflixCarousel style
// Removed MoviepireRails in favor of full NetflixPosterGrid replacement
// import { SearchResultsPage } from '@/components/search-results-page'
// Fallback movies data
const fallbackMovies: StreamingMovie[] = [
  {
    id: 'fallback-1',
    title: 'Configure Your APIs',
    poster: undefined,
    backdrop: undefined,
    year: 2024,
    rating: 0,
    genre: ['Setup'],
    description: 'To see real movie data, please configure your TMDB API key in the environment variables.',
    runtime: undefined,
    imdbId: undefined,
    tmdbId: undefined
  }
]

export default function ClientOnlyMovieApp() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [movies, setMovies] = useState<StreamingMovie[]>([])
  const [trendingMovies, setTrendingMovies] = useState<StreamingMovie[]>([])
  const [trendingSeries, setTrendingSeries] = useState<StreamingSeries[]>([])
  const [popularSeries, setPopularSeries] = useState<StreamingSeries[]>([])
  const [topRatedMovies, setTopRatedMovies] = useState<StreamingMovie[]>([])
  const [topRatedSeries, setTopRatedSeries] = useState<StreamingSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeCategory, setActiveCategory] = useState('home')
  const [selectedMovie, setSelectedMovie] = useState<StreamingMovie | null>(null)
  // Separate modal movie so hero remains static when opening info / browsing similar
  const [modalMovie, setModalMovie] = useState<StreamingMovie | StreamingSeries | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false)
  const [playingMovieId, setPlayingMovieId] = useState<string | null>(null)
  const [playingMovieTitle, setPlayingMovieTitle] = useState<string>('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showRealTimeSearch, setShowRealTimeSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [seamlessSearchResults, setSeamlessSearchResults] = useState<any[]>([])
  const [seamlessSearchQuery, setSeamlessSearchQuery] = useState("")
  const [isSeamlessSearching, setIsSeamlessSearching] = useState(false)
  // Remove legacy overlay state
  const [recentlyPlayedMovies, setRecentlyPlayedMovies] = useState<RecentlyPlayedMovie[]>([])
  const [playingMovieData, setPlayingMovieData] = useState<{
    id: string
    title: string
    poster: string
    year?: number
    genre?: string[]
  } | null>(null)
  const [resumeTime, setResumeTime] = useState<number>(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMoviepireModalOpen, setIsMoviepireModalOpen] = useState(false)
  const [selectedMoviepireMovie, setSelectedMoviepireMovie] = useState<StreamingMovie | null>(null)
  // Guard to prevent double-opening modal when global events fire rapidly
  const openingModalRef = useRef(false)

  // Separate modal state for search results
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [selectedSearchMovie, setSelectedSearchMovie] = useState<StreamingMovie | null>(null)

  // Direct streaming URL for Live TV streams
  const [directStreamingUrl, setDirectStreamingUrl] = useState<string | null>(null)

  // Safari browser detection for compatibility filtering
  const [isSafari, setIsSafari] = useState<boolean>(false)

  // Add a force update state to trigger re-renders
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0)

  // Ref to prevent React Strict Mode double invocation issues
  const isVideoPlayerOpenRef = useRef(false)

  // Robust video player state setter that prevents Strict Mode issues
  const setVideoPlayerOpen = useCallback((open: boolean) => {
    console.log('🎬 [DEBUG] setVideoPlayerOpen called with:', open)
    
    // Use functional update to avoid stale closure issues
    setIsVideoPlayerOpen(prev => {
      console.log('🎬 [DEBUG] Functional update: prev=', prev, 'new=', open)
      isVideoPlayerOpenRef.current = open
      return open
    })
    
    console.log('🎬 [DEBUG] setIsVideoPlayerOpen called, ref set to:', open)
  }, []) // Empty dependency array is correct since we use functional updates

  // Debug: Monitor isVideoPlayerOpen changes (can be removed after testing)
  useEffect(() => {
    console.log('🎬 [DEBUG STATE] isVideoPlayerOpen changed to:', isVideoPlayerOpen)
  }, [isVideoPlayerOpen])

  // Safari browser detection for optimal streaming compatibility
  useEffect(() => {
    const browserInfo = getBrowserInfo()
    setIsSafari(browserInfo.isSafari)
    
    if (browserInfo.isSafari) {
      console.log(`🍎 Safari browser detected (v${browserInfo.safariVersion?.major}.${browserInfo.safariVersion?.minor}) - Safari-compatible streams will be prioritized`)
    } else {
      console.log(`🌐 Non-Safari browser detected (${browserInfo.isChrome ? 'Chrome' : browserInfo.isFirefox ? 'Firefox' : browserInfo.isEdge ? 'Edge' : 'Unknown'})`)
    }
  }, [])

  // Scroll detection for dynamic background transparency
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Initialize category and search from URL params
  useEffect(() => {
  const category = searchParams?.get('category')
  const searchQuery = searchParams?.get('q')

    if (category) {
      setActiveCategory(category)
    }

    if (searchQuery) {
      setShowSearchResults(true)
    }
  }, [searchParams])

  // Global event listener (radically different approach) to decouple real-time search overlay from modal open
  // Any component can dispatch window.dispatchEvent(new CustomEvent('app:openModal', { detail: { id: movieId } }))
  useEffect(() => {
    const handleGlobalOpenModal = (e: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom.detail || {}
      if (openingModalRef.current || isModalOpen) return
      openingModalRef.current = true
      // Close real-time search overlay first (state update flush)
      if (showRealTimeSearch) setShowRealTimeSearch(false)
      // Open modal if id provided
      if (detail && typeof detail.id === 'string') {
        try { handleMoreInfo(detail.id) } catch (err) { console.warn('Global openModal handler failed', err) }
      }
      // Release guard after a short delay to ignore burst events
      setTimeout(() => { openingModalRef.current = false }, 400)
    }
    window.addEventListener('app:openModal', handleGlobalOpenModal)
    
    // Global play listener for unified event-driven Play action
    const handleGlobalPlayMovie = (e: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom.detail || {}
      const movieId: string | undefined = typeof detail.id === 'string' ? detail.id : undefined
      const title: string | undefined = typeof detail.title === 'string' ? detail.title : undefined
      if (!movieId) return
      // Close overlays first
      if (showRealTimeSearch) setShowRealTimeSearch(false)
      // Slight debounce/guard: if a modal open sequence just started, delay play a bit to avoid overlap
      const playDelay = openingModalRef.current ? 420 : 0
      setTimeout(() => {
        handlePlay(movieId, title)
      }, playDelay)
    }
    window.addEventListener('app:playMovie', handleGlobalPlayMovie)
    
    // Global event to open real-time search
    const handleOpenRealTimeSearch = (e?: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom?.detail || {}
      const initialQuery = typeof detail.query === 'string' ? detail.query : ''
      
      // Only open if not already open to prevent double-opening
      if (!showRealTimeSearch) {
        setShowRealTimeSearch(true)
        // Set the initial search query if provided
        if (initialQuery) {
          setSeamlessSearchQuery(initialQuery)
        }
      }
    }
    window.addEventListener('app:openRealTimeSearch', handleOpenRealTimeSearch)
    
    // Global navigation event from search overlay
    const handleGlobalNavigate = (e: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom.detail || {}
      if (detail.category) {
        handleNavigate(detail.category)
      }
    }
    window.addEventListener('app:navigate', handleGlobalNavigate)
    
    // RADICAL NEW APPROACH: Direct event handlers for search overlay
    // These bypass the traditional prop-based callback system for better reliability
    const handleSearchPlayMovie = (e: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom.detail || {}
      console.log('🎬 [EVENT] Search play movie received:', detail)
      
      if (detail.id && detail.title) {
        // Close search overlay first
        setShowRealTimeSearch(false)
        
        // Create a complete movie object from search data
        const movieData = {
          id: detail.id,
          title: detail.title,
          poster: detail.poster || '',
          year: detail.year || new Date().getFullYear(),
          genre: detail.type ? [detail.type === 'movie' ? 'Movie' : 'TV Show'] : ['Unknown']
        }
        
        console.log('🎬 [EVENT] Opening video player for search result:', detail.title)
        setPlayingMovieId(detail.id)
        setPlayingMovieTitle(detail.title)
        setPlayingMovieData(movieData)
        setResumeTime(0)
        setVideoPlayerOpen(true)
      }
    }
    window.addEventListener('app:searchPlayMovie', handleSearchPlayMovie)
    
    const handleSearchAddToList = (e: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom.detail || {}
      console.log('➕ [EVENT] Search add to list received:', detail)
      
      if (detail.id && detail.title) {
        alert(`➕ Added "${detail.title}" to your list!`)
      }
    }
    window.addEventListener('app:searchAddToList', handleSearchAddToList)
    
    const handleSearchMoreInfo = async (e: Event) => {
      const custom = e as CustomEvent<any>
      const detail = custom.detail || {}
      console.log('ℹ️ [EVENT] Search more info received:', detail)
      
      if (detail.id) {
        // Close search overlay first
        setShowRealTimeSearch(false)
        
        // Use the enhanced handleMoreInfo which can fetch from TMDB
        await handleMoreInfo(detail.id)
      }
    }
    window.addEventListener('app:searchMoreInfo', handleSearchMoreInfo)
    
    return () => {
      window.removeEventListener('app:openModal', handleGlobalOpenModal)
      window.removeEventListener('app:playMovie', handleGlobalPlayMovie)
      window.removeEventListener('app:openRealTimeSearch', handleOpenRealTimeSearch)
      window.removeEventListener('app:navigate', handleGlobalNavigate)
      window.removeEventListener('app:searchPlayMovie', handleSearchPlayMovie)
      window.removeEventListener('app:searchAddToList', handleSearchAddToList)
      window.removeEventListener('app:searchMoreInfo', handleSearchMoreInfo)
    }
  }, [showRealTimeSearch, isModalOpen])

  // Load recently played movies
  useEffect(() => {
    loadRecentlyPlayedMovies()
  }, [])

  const loadRecentlyPlayedMovies = () => {
    const movies = RecentlyPlayedService.getAll()
    setRecentlyPlayedMovies(movies)
  }

  // Navigation handler
  const handleNavigate = async (category: string) => {
    if (category === 'search') {
      setShowSearchResults(true)
      return
    }

    setActiveCategory(category)
    setIsLoading(true)
    setShowSearchResults(false)

    // Update URL
  const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('category', category)
    router.push(`?${params.toString()}`)

    try {
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()

      if (configData.success) {
        const service = createStreamingService(configData.config)

        let newMovies: StreamingMovie[] = []

        switch (category) {
          case 'trending':
            newMovies = await service.getTrendingMovies()
            break
          case 'popular':
            newMovies = await service.getPopularMovies()
            break
          case 'now playing':
            newMovies = await service.getNowPlayingMovies()
            break
          case 'recently-played':
            // For recently played, we don't need to fetch new movies
            setIsLoading(false)
            return
          case 'home':
          default:
            newMovies = await service.getPopularMovies()
            break
        }

        setMovies(newMovies)
        setSelectedMovie(newMovies[0] || null)
      }
    } catch (error) {
      console.error('Error fetching movies for category:', category, error)
    } finally {
      setIsLoading(false)
    }
  }

  // Search handler for moviepire navigation
  const handleSearch = async (query: string) => {
    console.log('🔍 Searching for:', query)
    // For now, just show search results page
    setShowSearchResults(true)

    // Update URL with search query
  const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', query)
    router.push(`?${params.toString()}`)
  }

  // Event handlers for movie interactions
  const handlePlay = (movieIdOrUrl: string, titleOverride?: string, resumeFromTime?: number) => {
    console.log('🎬 [DEBUG] handlePlay called with:', {
      movieIdOrUrl: movieIdOrUrl.substring(0, 100) + (movieIdOrUrl.length > 100 ? '...' : ''),
      titleOverride,
      resumeFromTime
    })
    
    // Check if this is a direct URL (for Live TV streams)
  // Treat absolute http(s), blob, and app-relative URLs (e.g., /api/stream-transcoder?...) as direct
  const isDirectUrl = movieIdOrUrl.startsWith('http://') || movieIdOrUrl.startsWith('https://') || movieIdOrUrl.startsWith('blob:') || movieIdOrUrl.startsWith('/')
    console.log('🎬 [DEBUG] isDirectUrl:', isDirectUrl)
    
    if (isDirectUrl) {
      // Handle direct streaming URL (Live TV)
      const liveId = `live_tv_${Date.now()}`
      console.log('🎬 [DEBUG] Playing direct stream URL:', movieIdOrUrl.substring(0, 50) + '...')
      console.log('🎬 [DEBUG] Setting Live TV state:', {
        directStreamingUrl: movieIdOrUrl.substring(0, 50) + '...',
        playingMovieId: liveId,
        playingMovieTitle: titleOverride || 'Live TV Stream'
      })
      
      setDirectStreamingUrl(movieIdOrUrl)
      setPlayingMovieId(liveId) // Generate a unique ID for tracking
      setPlayingMovieTitle(titleOverride || 'Live TV Stream')
      setPlayingMovieData({
        id: liveId,
        title: titleOverride || 'Live TV Stream',
        poster: '',
        year: new Date().getFullYear(),
        genre: ['Live TV']
      })
      setResumeTime(0) // Live TV doesn't support resume
      
      console.log('🎬 [DEBUG] Opening video player modal for Live TV')
      setVideoPlayerOpen(true)
      
      // Force a re-render
      setForceUpdateCounter(prev => prev + 1)
      
      return
    }

    // Original movie ID handling
    const movieId = movieIdOrUrl
    
    // If no explicit resumeFromTime provided, try RecentlyPlayedService
    if (resumeFromTime == null) {
      try {
        const storedResume = RecentlyPlayedService.getResumeTime(movieId)
        if (storedResume > 0) {
          resumeFromTime = storedResume
        }
      } catch {}
    }
    console.log('🎬 Playing movie:', movieId, resumeFromTime ? `(resume from ${resumeFromTime}s)` : '')

    // Find the movie to get its data - check main arrays first
    let movie = movies.find(m => m.id === movieId) || 
                trendingMovies.find(m => m.id === movieId) ||
                trendingSeries.find(s => s.id === movieId)
    let title = movie?.title || titleOverride || 'Unknown Movie'

    // If not found in main arrays, create a basic movie object for search results
    if (!movie && titleOverride) {
      console.log('🔍 Creating movie object for search result:', movieId, titleOverride)
      // Create a basic movie-like object from the provided title
      movie = {
        id: movieId,
        title: titleOverride,
        poster: '', // Will be populated if needed
        year: new Date().getFullYear(), // Default to current year
        genre: ['Unknown'],
        rating: 0,
        description: 'Search result - details loading...',
        runtime: undefined,
        imdbId: undefined,
        tmdbId: parseInt(movieId, 10) || undefined
      } as StreamingMovie
      title = titleOverride
    }

    // Prepare movie data for recently played tracking
    const movieData = movie ? {
      id: movie.id,
      title: movie.title,
      poster: movie.poster || '',
      year: movie.year,
      genre: movie.genre
    } : {
      id: movieId,
      title: title,
      poster: '',
      year: new Date().getFullYear(),
      genre: ['Unknown']
    }

    console.log('🎬 Opening video player for:', title)
    setPlayingMovieId(movieId)
    setPlayingMovieTitle(title)
    setPlayingMovieData(movieData)
    setResumeTime(resumeFromTime || 0)
    setVideoPlayerOpen(true)
  }

  const handleAddToList = (movieId: string) => {
    console.log('Adding to list:', movieId)
    alert(`➕ Added movie ${movieId} to your list!`)
  }

  const handleMoreInfo = async (movieId: string) => {
    console.log('ℹ️ [HANDLER] More info requested for:', movieId)
    
    // First, try to find the movie in existing arrays (current behavior)
    const movie = movies.find(m => m.id === movieId) || 
                  trendingMovies.find(m => m.id === movieId) || 
                  trendingSeries.find(s => s.id === movieId) ||
                  popularSeries.find(s => s.id === movieId) ||
                  topRatedMovies.find(m => m.id === movieId) ||
                  topRatedSeries.find(s => s.id === movieId)
    
    if (movie) {
      console.log('✅ [HANDLER] Found movie in existing arrays:', movie.title)
      setModalMovie(movie)
      setIsModalOpen(true)
      return
    }

    // If not found in existing arrays, fetch from TMDB API
    console.log('🔍 [HANDLER] Fetching movie details from TMDB for ID:', movieId)
    
    try {
      // Get configuration to access TMDB API key
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()

      if (!configData.success || !configData.config.tmdbApiKey) {
        console.error('❌ [HANDLER] TMDB API key not available')
        setIsModalOpen(true) // Still open modal to prevent user confusion
        return
      }

      const tmdbApi = new TMDBAPI(configData.config.tmdbApiKey)
      const numericId = parseInt(movieId, 10)
      
      if (isNaN(numericId)) {
        console.error('❌ [HANDLER] Invalid movie ID for TMDB fetch:', movieId)
        return
      }

      // First try to get it as a movie
      let tmdbData
      let isMovie = true
      
      try {
        tmdbData = await tmdbApi.getMovie(numericId)
        console.log('✅ [HANDLER] Successfully fetched movie data from TMDB:', tmdbData.title)
      } catch (movieError) {
        // If movie fetch fails, try as TV show
        try {
          tmdbData = await tmdbApi.getTVShow(numericId)
          isMovie = false
          console.log('✅ [HANDLER] Successfully fetched TV show data from TMDB:', (tmdbData as any).name)
        } catch (tvError) {
          console.error('❌ [HANDLER] Failed to fetch from TMDB as both movie and TV:', movieError, tvError)
          setIsModalOpen(true) // Still open modal to prevent user confusion
          return
        }
      }

      // Transform TMDB data to StreamingMovie/StreamingSeries format
      const transformedMovie: StreamingMovie | StreamingSeries = isMovie ? {
        // Movie format
        id: movieId,
        title: (tmdbData as any).title,
        poster: tmdbData.poster_path ? tmdbApi.getPosterUrl(tmdbData.poster_path, 'w500') : '',
        backdrop: tmdbData.backdrop_path ? tmdbApi.getBackdropUrl(tmdbData.backdrop_path, 'original') : '',
        year: new Date((tmdbData as any).release_date || '').getFullYear() || new Date().getFullYear(),
        rating: tmdbData.vote_average || 0,
        genre: tmdbData.genres?.map((g: any) => g.name) || [],
        description: tmdbData.overview || 'No description available.',
        runtime: (tmdbData as any).runtime,
        imdbId: (tmdbData as any).imdb_id,
        tmdbId: tmdbData.id
      } : {
        // TV Series format
        id: movieId,
        title: (tmdbData as any).name,
        poster: tmdbData.poster_path ? tmdbApi.getPosterUrl(tmdbData.poster_path, 'w500') : '',
        backdrop: tmdbData.backdrop_path ? tmdbApi.getBackdropUrl(tmdbData.backdrop_path, 'original') : '',
        year: new Date((tmdbData as any).first_air_date || '').getFullYear() || new Date().getFullYear(),
        rating: tmdbData.vote_average || 0,
        genre: tmdbData.genres?.map((g: any) => g.name) || [],
        description: tmdbData.overview || 'No description available.',
        seasons: (tmdbData as any).number_of_seasons,
        episodes: (tmdbData as any).number_of_episodes,
        imdbId: (tmdbData as any).imdb_id,
        tmdbId: tmdbData.id
      }

      setModalMovie(transformedMovie)
      setIsModalOpen(true)
      console.log('🎬 [HANDLER] Modal opened with fetched movie data:', transformedMovie.title)
    } catch (error) {
      console.error('❌ [HANDLER] Error fetching movie details for modal:', error)
      // Still open modal to prevent user confusion, but with minimal data
      setIsModalOpen(true)
    }
  }

  const handleMovieSelect = (_movie: StreamingMovie | StreamingSeries) => {
    // Intentionally no-op to keep hero static per new requirement
  }

  const handleMovieSelectWithModal = (movie: StreamingMovie | StreamingSeries) => {
    setModalMovie(movie)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalMovie(null)
  }

  const handleModalMovieSelect = (movie: any) => {
    const streamingMovie: StreamingMovie = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster,
      backdrop: movie.backdrop,
      year: movie.year,
      rating: movie.rating,
      genre: movie.genre || [],
      description: movie.description || '',
      runtime: movie.runtime,
      imdbId: movie.imdbId,
      tmdbId: movie.tmdbId
    }
    setModalMovie(streamingMovie)
  }

  const handleMoviepireMoreInfo = (movieId: string) => {
    // Search in all movie and series arrays
    const movie = movies.find(m => m.id === movieId)
    const trendingMovie = trendingMovies.find(m => m.id === movieId)
    const series = trendingSeries.find(s => s.id === movieId)
    const popularSeriesItem = popularSeries.find(s => s.id === movieId)
    const topRatedMovie = topRatedMovies.find(m => m.id === movieId)
    const topRatedSeriesItem = topRatedSeries.find(s => s.id === movieId)
    const selectedItem = movie || trendingMovie || series || popularSeriesItem || topRatedMovie || topRatedSeriesItem

    if (selectedItem) {
      setSelectedMoviepireMovie(selectedItem)
      setIsMoviepireModalOpen(true)
    }
  }

  const handleCloseMoviepireModal = () => {
    setIsMoviepireModalOpen(false)
    setSelectedMoviepireMovie(null)
  }

  // Search modal handlers - separate from main app modal
  const handleSearchModalClose = () => {
    setIsSearchModalOpen(false)
    setSelectedSearchMovie(null)
  }

  const handleCloseVideoPlayer = () => {
    console.log('🎬 [DEBUG] handleCloseVideoPlayer called')
    console.log('🎬 [DEBUG] Stack trace for close:', new Error().stack)
    setVideoPlayerOpen(false)
    setPlayingMovieId(null)
    setPlayingMovieTitle('')
    setPlayingMovieData(null)
    setResumeTime(0)
    setDirectStreamingUrl(null) // Clear direct streaming URL
    // Refresh recently played list when video player closes
    loadRecentlyPlayedMovies()
  }

  // Search handlers - separate from main app to avoid affecting hero section
  const handleSearchResultSelect = (result: { id: string; title: string; year?: number; poster: string; backdrop?: string; type?: 'movie' | 'tv' }) => {
    // Detach async work so the handler type is void
    void (async () => {
      // Create initial movie object with better initial data
      const initialMovie: StreamingMovie = {
        id: result.id,
        title: result.title,
        poster: result.poster,
        backdrop: result.backdrop,
        year: result.year ?? new Date().getFullYear(),
        rating: 0,
        genre: result.type ? [result.type === 'movie' ? 'Movie' : 'TV Show'] : [],
        description: 'Loading detailed information...',
        runtime: undefined,
        imdbId: undefined,
        tmdbId: parseInt(result.id)
      }

      // Set initial movie and open SEARCH modal (not main modal)
      setSelectedSearchMovie(initialMovie)
      setIsSearchModalOpen(true)

      // Fetch full movie details from TMDB
      try {
        // Get configuration to access TMDB API key
        const configResponse = await fetch('/api/config')
        const configData = await configResponse.json()

        if (!configData.success || !configData.config.tmdbApiKey) {
          console.warn('TMDB API key not available')
          return
        }

        const tmdbApi = new TMDBAPI(configData.config.tmdbApiKey)
        const tmdbNumericId = parseInt(result.id)

        // If we know the type, use it. Otherwise, try movie then TV.
        if (result.type === 'movie') {
          const movieDetails = await tmdbApi.getMovieDetails(tmdbNumericId)
          const genres = await tmdbApi.getMovieGenres()
          const fullMovie = tmdbApi.convertToMovie(movieDetails, genres.genres)
          setSelectedSearchMovie(fullMovie)
        } else if (result.type === 'tv') {
          const seriesDetails = await tmdbApi.getTVShow(tmdbNumericId)
          const genres = await tmdbApi.getTVGenres()
          const fullSeries = tmdbApi.convertToSeries(seriesDetails, genres.genres)
          const adaptedMovie: StreamingMovie = {
            id: fullSeries.id,
            title: fullSeries.title,
            poster: fullSeries.poster,
            backdrop: fullSeries.backdrop,
            year: fullSeries.year,
            rating: fullSeries.rating,
            genre: fullSeries.genre,
            description: fullSeries.description,
            runtime: undefined,
            imdbId: undefined,
            tmdbId: fullSeries.tmdbId
          }
          setSelectedSearchMovie(adaptedMovie)
        } else {
          // Unknown type: attempt movie first, then TV
          try {
            const movieDetails = await tmdbApi.getMovieDetails(tmdbNumericId)
            const genres = await tmdbApi.getMovieGenres()
            const fullMovie = tmdbApi.convertToMovie(movieDetails, genres.genres)
            setSelectedSearchMovie(fullMovie)
          } catch {
            try {
              const seriesDetails = await tmdbApi.getTVShow(tmdbNumericId)
              const genres = await tmdbApi.getTVGenres()
              const fullSeries = tmdbApi.convertToSeries(seriesDetails, genres.genres)
              const adaptedMovie: StreamingMovie = {
                id: fullSeries.id,
                title: fullSeries.title,
                poster: fullSeries.poster,
                backdrop: fullSeries.backdrop,
                year: fullSeries.year,
                rating: fullSeries.rating,
                genre: fullSeries.genre,
                description: fullSeries.description,
                runtime: undefined,
                imdbId: undefined,
                tmdbId: fullSeries.tmdbId
              }
              setSelectedSearchMovie(adaptedMovie)
            } catch (e) {
              console.warn('Failed to fetch details as movie or TV', e)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching full movie details:', error)
        // Keep the initial movie object if fetch fails
      }
    })()
  }

  const handleBackFromSearch = () => {
    setShowSearchResults(false)
  }

  // Real-time search handlers
  const handleOpenRealTimeSearch = () => {
    setShowRealTimeSearch(true)
  }

  const handleCloseRealTimeSearch = () => {
    setShowRealTimeSearch(false)
  }

  // Seamless search handlers
  const handleSeamlessSearchResults = useCallback((results: any[], query: string, isSearching: boolean) => {
    setSeamlessSearchResults(results)
    setSeamlessSearchQuery(query)
    setIsSeamlessSearching(isSearching)
    setSearchQuery(query) // Track the search query for overlay
    
    // Show search overlay when there's a query (user is actively searching)
    if (query.trim() && !showRealTimeSearch) {
      setShowRealTimeSearch(true)
    }
    
    // Hide search overlay when search is cleared
    if (!query.trim() && showRealTimeSearch) {
      setShowRealTimeSearch(false)
    }
  }, [showRealTimeSearch])

  const handleNavigateToSearch = (query: string) => {
    setShowSearchResults(true)
    // Update URL to include search query
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', query)
    router.push(`?${params.toString()}`)
  }

  const handleGetStreamingUrl = async (movieId: string): Promise<string | null> => {
    console.log('🎬 [DEBUG] handleGetStreamingUrl called with:', movieId)
    console.log('🎬 [DEBUG] Current directStreamingUrl state:', directStreamingUrl ? directStreamingUrl.substring(0, 50) + '...' : 'null')
    
    try {
      // If we have a direct streaming URL (Live TV), return it directly
      if (directStreamingUrl && movieId.startsWith('live_tv_')) {
        console.log('🎬 [DEBUG] Returning direct streaming URL for Live TV')
        return directStreamingUrl
      }
      
      console.log('🎬 [DEBUG] Fetching streaming URL from service for movieId:', movieId)
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()

      if (configData.success) {
        const service = createStreamingService(configData.config)
        return await service.getStreamingUrl(movieId, undefined, isSafari)
      }

      throw new Error('Failed to load streaming configuration')
    } catch (error) {
      console.error('Error getting streaming URL:', error)
      throw error
    }
  }

  const handleGetStreamingResult = async (movieId: string): Promise<{
    url: string;
    subtitles: string[];
    realSubtitles?: Array<{
      language: string
      label: string
      url: string
      isExternal: boolean
    }>
  } | null> => {
    console.log('🎬 [DEBUG] handleGetStreamingResult called with:', movieId)
    console.log('🎬 [DEBUG] Current directStreamingUrl state:', directStreamingUrl ? directStreamingUrl.substring(0, 50) + '...' : 'null')
    
    try {
      // If we have a direct streaming URL (Live TV), return it directly
      if (directStreamingUrl && movieId.startsWith('live_tv_')) {
        console.log('🎬 [DEBUG] Returning direct streaming result for Live TV')
        return {
          url: directStreamingUrl,
          subtitles: [], // Live TV typically doesn't have subtitle files
          realSubtitles: []
        }
      }
      
      console.log('🎬 [DEBUG] Fetching streaming result from service for movieId:', movieId)
      
      // Try to reuse previous stream if available to ensure seamless resume
      try {
        const stored = RecentlyPlayedService.getStreamInfo(movieId)
        if (stored) {
          return { url: stored.url, subtitles: stored.subtitles }
        }
      } catch {}

      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()

      if (configData.success) {
        const service = createStreamingService(configData.config)
        const result = await service.getStreamingResult(movieId, undefined, isSafari)
        if (result) {
          // Persist chosen stream for resume
          try { RecentlyPlayedService.setStreamInfo(movieId, result.url, result.subtitles) } catch {}
          return {
            url: result.url,
            subtitles: result.subtitles,
            realSubtitles: result.realSubtitles
          }
        }
        return null
      }

      throw new Error('Failed to load streaming configuration')
    } catch (error) {
      console.error('Error getting streaming result:', error)
      throw error
    }
  }

  // Transform StreamingMovie to MovieCard format
  const transformMovie = (movie: StreamingMovie) => ({
    id: movie.id,
    title: movie.title,
    poster: movie.poster || 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop',
    backdrop: movie.backdrop,
    year: movie.year,
    rating: movie.rating,
    genre: movie.genre || [],
    description: movie.description,
    runtime: movie.runtime,
    tmdbId: movie.tmdbId
  })

  // Transform StreamingMovie to MoviepireModal format
  const transformMovieForModal = (movie: StreamingMovie) => ({
    id: parseInt(movie.id) || 0,
    title: movie.title,
    overview: movie.description || 'No description available.',
    poster_path: movie.poster?.replace('https://image.tmdb.org/t/p/w500', '') || '',
    backdrop_path: movie.backdrop?.replace('https://image.tmdb.org/t/p/original', '') || '',
    release_date: `${movie.year}-01-01`,
    vote_average: movie.rating || 0,
    runtime: movie.runtime,
    genres: movie.genre?.map((g, index) => ({ id: index, name: g })) || [],
    tagline: ''
  })

  // Transform StreamingSeries to MovieCard format (reusing the same interface)
  const transformSeries = (series: StreamingSeries) => ({
    id: series.id,
    title: series.title,
    poster: series.poster || 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop',
    year: series.year,
    rating: series.rating,
    genre: series.genre || [],
    description: series.description,
    backdrop: series.backdrop
  })

  useEffect(() => {
    console.log('🚀 ClientOnlyMovieApp useEffect triggered')
    
    const initializeApp = async () => {
      try {
        console.log('🔄 Fetching configuration from API...')
        
        // Fetch configuration from API
        const configResponse = await fetch('/api/config')
        console.log('📡 Config API response status:', configResponse.status)
        
        const configData = await configResponse.json()
        console.log('📊 Config API response data:', configData)
        
        if (!configData.success) {
          throw new Error(configData.error || 'Failed to load configuration')
        }
        
        console.log('✅ Configuration loaded from API:', configData.configSource)
        const config = configData.config
        
        const service = createStreamingService(config)

        // Validate service configuration
        const status = await service.validateConfiguration()
        console.log('🔧 Service status:', status)

        if (status.tmdb) {
          console.log('🎬 TMDB is working, fetching real movies and series...')
          // Fetch popular (main grids), trending weekly movies (for hero), trending series, and additional content in parallel
          const [popularMovies, trendingMoviesData, trendingSeriesData, popularSeriesData, topRatedMoviesData, topRatedSeriesData] = await Promise.all([
            service.getPopularMovies(),
            service.getTrendingMovies(), // weekly by default in wrapper
            service.getTrendingSeries(),
            service.getPopularSeries(),
            service.getTopRatedMovies(),
            service.getTopRatedSeries()
          ])
          console.log('📽️ Fetched movies:', popularMovies.length)
          console.log('🔥 Fetched trending movies:', trendingMoviesData.length)
          console.log('📺 Fetched trending series:', trendingSeriesData.length)
          console.log('🌟 Fetched popular series:', popularSeriesData.length)
          console.log('🏆 Fetched top-rated movies:', topRatedMoviesData.length)
          console.log('👑 Fetched top-rated series:', topRatedSeriesData.length)
          setMovies(popularMovies)
          setTrendingMovies(trendingMoviesData)
          setTrendingSeries(trendingSeriesData)
          setPopularSeries(popularSeriesData)
          setTopRatedMovies(topRatedMoviesData)
          setTopRatedSeries(topRatedSeriesData)
          // Hero logic: always show the single most popular/highest vote trending movie (weekly) with a backdrop
          const sortedTrending = [...trendingMoviesData].filter(m => !!m.backdrop).sort((a, b) => (b.rating || 0) - (a.rating || 0))
          const hero = sortedTrending[0] || popularMovies.find(m => m.backdrop) || popularMovies[0]
          setSelectedMovie(hero || null)

          // Using TMDB vote_average directly as displayed rating (no external IMDb refresh)
        } else {
          console.log('⚠️ TMDB not working, using fallback movies')
          setMovies(fallbackMovies)
          setTrendingSeries([])
          setSelectedMovie(fallbackMovies[0] || null)
        }

        setIsLoading(false)

      } catch (err) {
        console.error('❌ Failed to initialize app:', err)
        setError('Failed to initialize streaming service')
        setMovies(fallbackMovies)
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading movies...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }

  const featuredMovie = selectedMovie || movies[0]
  // Simple derived fallback (no hook) to avoid hook order changes when early returns occur.
  const effectiveTrending = (trendingMovies && trendingMovies.length > 0) ? trendingMovies : movies.slice(0, 36)

  // Check if we should show search results page
  if (showSearchResults) {
    const SearchResultsPage = dynamic(() => import('@/components/search-results-page').then(mod => ({ default: mod.SearchResultsPage })), {
      ssr: false,
      loading: () => (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-xl">Loading search...</div>
        </div>
      )
    })

    return (
      <SearchResultsPage
  onMovieSelect={(movie) => handleSearchResultSelect({ id: movie.id, title: movie.title, year: movie.year, poster: movie.poster })}
        onBack={handleBackFromSearch}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        activeCategory="search"
      />
    )
  }

  // Check if we should show explore pages
  if (activeCategory === 'explore-movies') {
    return (
      <MoviesGridPage
        onNavigate={handleNavigate}
        activeCategory={activeCategory}
        onPlay={(id, title) => handlePlay(id, title)}
        onAddToList={(id) => handleAddToList(id)}
        onMoreInfo={(id) => handleMoreInfo(id)}
      />
    )
  }

  if (activeCategory === 'tv-series') {
    return (
      <TVSeriesPage
        onPlay={handlePlay}
        onAddToList={handleAddToList}
        onMoreInfo={handleMoreInfo}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        activeCategory={activeCategory}
      />
    )
  }

  if (activeCategory === 'live-tv') {
    return (
      <>
        <LiveTVPage
          onPlay={(streamUrl: string, title: string) => {
            console.log('🎯 Live TV onPlay called with:', { streamUrl, title })
            // Always route Live TV through the transcoder unless it is already wrapped.
            // Many live HLS endpoints omit the .m3u8 extension, causing native playback to fail.
            const alreadyWrapped = typeof streamUrl === 'string' && streamUrl.startsWith('/api/stream-transcoder')
            const targetUrl = alreadyWrapped
              ? streamUrl
              : `/api/stream-transcoder?url=${encodeURIComponent(streamUrl)}&safari=true&optimize=true&force=1`
            console.log('� Live TV resolved target URL:', targetUrl.substring(0, 100) + (targetUrl.length > 100 ? '...' : ''))
            handlePlay(targetUrl, title)
          }}
          onAddToList={(streamId: string) => {
            console.log('➕ Add to list called for stream:', streamId)
            // Could implement watchlist functionality for live channels
          }}
          onMoreInfo={(streamId: string) => {
            console.log('ℹ️ More info called for stream:', streamId)
            // Could show network/channel information
          }}
          onNavigate={handleNavigate}
          onSearch={handleSearch}
          activeCategory={activeCategory}
        />

        {/* Ensure the video player modal is mounted on Live TV pages too */}
        <VideoPlayerModal
          isOpen={isVideoPlayerOpen}
          onClose={handleCloseVideoPlayer}
          movieId={playingMovieId}
          movieTitle={playingMovieTitle}
          onGetStreamingUrl={handleGetStreamingUrl}
          onGetStreamingResult={handleGetStreamingResult}
          movieData={playingMovieData || undefined}
          startTime={resumeTime}
          directStreamingUrl={directStreamingUrl}
        />
      </>
    )
  }

  // Legacy explore-series path disabled during new movies grid rollout; fallback to tv-series category handling above

  // Show real-time search page
  if (showRealTimeSearch) {
    return (
      <RealTimeSearchGridOverlay
        initialQuery={seamlessSearchQuery}
        activeCategory={activeCategory}
        onClose={handleCloseRealTimeSearch}
        onPlay={handlePlay}
        onAddToList={handleAddToList}
        onMoreInfo={handleMoreInfo}
      />
    )
  }

  console.log('🎬 [DEBUG PARENT] Main component render - isVideoPlayerOpen:', isVideoPlayerOpen, 'directStreamingUrl:', directStreamingUrl ? directStreamingUrl.substring(0, 50) + '...' : 'null')

  // Force re-render verification
  const renderTime = new Date().getTime()
  console.log('🎬 [DEBUG RENDER] Component rendering at:', renderTime, 'isVideoPlayerOpen:', isVideoPlayerOpen, 'forceUpdateCounter:', forceUpdateCounter)

  return (
  <div className="min-h-screen text-white relative bg-[rgb(18,18,18)] transition-colors duration-300">
      {/* Moviepire Navigation */}
      <MoviepireNavigation
        onNavigate={handleNavigate}
        activeCategory={activeCategory}
        onSearchResults={handleSeamlessSearchResults}
      />

      <div className="flex flex-col min-h-screen">
        {/* Hero Section - MoviepireHeroSection handles its own spacing */}
        {featuredMovie && (
          <div>
            <MoviepireHeroSection
              movie={transformMovie(featuredMovie)}
              onPlay={handlePlay}
              onMoreInfo={handleMoreInfo}
            />
          </div>
        )}

        {/* Movie Grids / Rails */}
        <div className="relative z-10 space-y-0 pb-20 bg-[rgb(18,18,18)] overflow-visible">
          <div className="pointer-events-none absolute -top-40 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[rgba(18,18,18,0.55)] to-[rgb(18,18,18)]" />
          {activeCategory === 'home' && (
            <>
              {/* Replacing all legacy rails with categorized poster grids */}
              <div className="space-y-6">
                <section className="px-6 md:px-12" aria-label="Trending This Week Carousel">
                  <NewNetflixCarousel
                    title="Trending This Week"
                    movies={effectiveTrending.slice(0,36).map(movie => ({
                      id: movie.id,
                      title: movie.title,
                      poster: movie.poster,
                      backdrop: movie.backdrop,
                      year: movie.year,
                      rating: movie.rating,
                      genre: movie.genre
                    }))}
                    onPlay={(movie) => handlePlay(movie.id)}
                    onAddToList={(movie) => handleAddToList(movie.id)}
                    onMoreInfo={(movie) => handleMoreInfo(movie.id)}
                  />
                </section>
                <section className="px-6 md:px-12" aria-label="Popular Movies Carousel">
                  <NewNetflixCarousel
                    title="Popular Movies"
                    movies={movies.slice(0,36).map(movie => ({
                      id: movie.id,
                      title: movie.title,
                      poster: movie.poster,
                      backdrop: movie.backdrop,
                      year: movie.year,
                      rating: movie.rating,
                      genre: movie.genre
                    }))}
                    onPlay={(movie) => handlePlay(movie.id)}
                    onAddToList={(movie) => handleAddToList(movie.id)}
                    onMoreInfo={(movie) => handleMoreInfo(movie.id)}
                  />
                </section>
                <section className="px-6 md:px-12" aria-label="Popular Series Carousel">
                  <NewNetflixCarousel
                    title="Popular Series"
                    movies={popularSeries.slice(0,30).map(series => ({
                      id: series.id,
                      title: series.title,
                      poster: series.poster,
                      backdrop: series.backdrop,
                      year: series.year,
                      rating: series.rating,
                      genre: series.genre
                    }))}
                    onPlay={(movie) => handlePlay(movie.id)}
                    onAddToList={(movie) => handleAddToList(movie.id)}
                    onMoreInfo={(movie) => handleMoreInfo(movie.id)}
                  />
                </section>
                <section className="px-6 md:px-12" aria-label="Series Picks Carousel">
                  <NewNetflixCarousel
                    title="Series Picks"
                    movies={trendingSeries.slice(0,30).map(series => ({
                      id: series.id,
                      title: series.title,
                      poster: series.poster,
                      backdrop: series.backdrop,
                      year: series.year,
                      rating: series.rating,
                      genre: series.genre
                    }))}
                    onPlay={(movie) => handlePlay(movie.id)}
                    onAddToList={(movie) => handleAddToList(movie.id)}
                    onMoreInfo={(movie) => handleMoreInfo(movie.id)}
                  />
                </section>
                <section className="px-6 md:px-12" aria-label="Top Rated Movies Carousel">
                  <NewNetflixCarousel
                    title="Top Rated Movies"
                    movies={topRatedMovies.slice(0,30).map(movie => ({
                      id: movie.id,
                      title: movie.title,
                      poster: movie.poster,
                      backdrop: movie.backdrop,
                      year: movie.year,
                      rating: movie.rating,
                      genre: movie.genre
                    }))}
                    onPlay={(movie) => handlePlay(movie.id)}
                    onAddToList={(movie) => handleAddToList(movie.id)}
                    onMoreInfo={(movie) => handleMoreInfo(movie.id)}
                  />
                </section>
                <section className="px-6 md:px-12" aria-label="Top Rated Series Carousel">
                  <NewNetflixCarousel
                    title="Top Rated Series"
                    movies={topRatedSeries.slice(0,30).map(series => ({
                      id: series.id,
                      title: series.title,
                      poster: series.poster,
                      backdrop: series.backdrop,
                      year: series.year,
                      rating: series.rating,
                      genre: series.genre
                    }))}
                    onPlay={(movie) => handlePlay(movie.id)}
                    onAddToList={(movie) => handleAddToList(movie.id)}
                    onMoreInfo={(movie) => handleMoreInfo(movie.id)}
                  />
                </section>
              </div>
            </>
          )}
          {/* Unified NetflixCarousel style for category pages */}
          {activeCategory === 'trending' && (
            <section className="px-6 md:px-12" aria-label="Trending Category Carousel">
              <NewNetflixCarousel
                title="Trending This Week"
                movies={effectiveTrending.slice(0,36).map(movie => ({
                  id: movie.id,
                  title: movie.title,
                  poster: movie.poster,
                  backdrop: movie.backdrop,
                  year: movie.year,
                  rating: movie.rating,
                  genre: movie.genre
                }))}
                onPlay={(movie) => handlePlay(movie.id)}
                onAddToList={(movie) => handleAddToList(movie.id)}
                onMoreInfo={(movie) => handleMoreInfo(movie.id)}
              />
            </section>
          )}
          {activeCategory === 'popular' && (
            <section className="px-6 md:px-12" aria-label="Popular Category Carousel">
              <NewNetflixCarousel
                title="Popular Movies"
                movies={movies.slice(0,36).map(movie => ({
                  id: movie.id,
                  title: movie.title,
                  poster: movie.poster,
                  backdrop: movie.backdrop,
                  year: movie.year,
                  rating: movie.rating,
                  genre: movie.genre
                }))}
                onPlay={(movie) => handlePlay(movie.id)}
                onAddToList={(movie) => handleAddToList(movie.id)}
                onMoreInfo={(movie) => handleMoreInfo(movie.id)}
              />
            </section>
          )}
          {activeCategory === 'recently-played' && recentlyPlayedMovies.length > 0 && (
            <section className="px-6 md:px-12" aria-label="Continue Watching Carousel">
              <NewNetflixCarousel
                title="Continue Watching"
                movies={recentlyPlayedMovies.slice(0,36).map(r => ({
                  id: r.id,
                  title: r.title,
                  poster: r.poster,
                  backdrop: r.poster,
                  year: r.year,
                  rating: 0,
                  genre: r.genre
                }))}
                onPlay={(movie) => handlePlay(movie.id)}
                onAddToList={(movie) => handleAddToList(movie.id)}
                onMoreInfo={(movie) => handleMoreInfo(movie.id)}
              />
            </section>
          )}
          {activeCategory === 'recently-played' && recentlyPlayedMovies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">No Recently Played Movies</h2>
              <p className="text-gray-500">Movies you watch will appear here</p>
            </div>
          )}
        </div>
        <MoviepireFooter />
      </div>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={modalMovie ? transformMovie(modalMovie as StreamingMovie) : null}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPlay={handlePlay}
        onAddToList={handleAddToList}
        onMovieSelect={handleModalMovieSelect}
      />

      {/* Debug logging for VideoPlayerModal props */}
      {(() => {
        console.log('🎬 [DEBUG PARENT] Rendering VideoPlayerModal with props:', {
          isOpen: isVideoPlayerOpen,
          movieId: playingMovieId,
          movieTitle: playingMovieTitle,
          directStreamingUrl: directStreamingUrl ? directStreamingUrl.substring(0, 50) + '...' : null,
          timestamp: Date.now()
        })
        return null
      })()}
      <VideoPlayerModal
        isOpen={isVideoPlayerOpen}
        onClose={handleCloseVideoPlayer}
        movieId={playingMovieId}
        movieTitle={playingMovieTitle}
        onGetStreamingUrl={handleGetStreamingUrl}
        onGetStreamingResult={handleGetStreamingResult}
        movieData={playingMovieData || undefined}
        startTime={resumeTime}
        directStreamingUrl={directStreamingUrl} // Pass direct URL as prop
      />

      {/* Moviepire Modal */}
      <MoviepireModal
        movie={selectedMoviepireMovie ? transformMovieForModal(selectedMoviepireMovie) : null}
        isOpen={isMoviepireModalOpen}
        onClose={handleCloseMoviepireModal}
  onPlay={(movieId) => handlePlay(movieId.toString())}
  onAddToList={(movieId) => handleAddToList(movieId.toString())}
        relatedMovies={movies.slice(0, 8).map(transformMovieForModal)}
        onMovieSelect={(movieId) => {
          // Find the selected movie in our movies list and update the modal content without closing it
          const next = movies.find(m => m.tmdbId === movieId || parseInt(m.id) === movieId)
          if (next) {
            setSelectedMoviepireMovie(next)
          }
        }}
      />

      {/* Search Results Modal - Separate from main modal */}
      <MovieDetailModal
        movie={selectedSearchMovie ? transformMovie(selectedSearchMovie) : null}
        isOpen={isSearchModalOpen}
        onClose={handleSearchModalClose}
        onPlay={handlePlay}
        onAddToList={handleAddToList}
        onMovieSelect={(movie) => {
          // Update search modal movie, not main app movie
          const streamingMovie: StreamingMovie = {
            id: movie.id,
            title: movie.title,
            poster: movie.poster,
            backdrop: movie.backdrop,
            year: movie.year,
            rating: movie.rating,
            genre: movie.genre || [],
            description: movie.description || '',
            runtime: movie.runtime,
            tmdbId: typeof movie.tmdbId === 'string' ? parseInt(movie.tmdbId) : movie.tmdbId
          }
          setSelectedSearchMovie(streamingMovie)
        }}
      />

    </div>
  )
}
