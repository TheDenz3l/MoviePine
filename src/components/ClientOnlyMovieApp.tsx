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
import { RecentlyPlayedRow } from '@/components/recently-played-row'
// Moviepire components
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireHeroSection } from '@/components/moviepire-hero-section'
// Removed CinematicRail in favor of unified NetflixCarousel styling everywhere
// import CinematicRail from '@/components/cinematic/CinematicRail'
import NetflixPosterGrid from '@/components/cinematic/NetflixPosterGrid'
import NetflixCarousel from '@/components/cinematic/NetflixCarousel'
import ModernNetflixGrid from '@/components/cinematic/ModernNetflixGrid'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { MoviepireModal } from '@/components/moviepire-modal'
import { MoviepireExplorePage } from '@/components/moviepire-explore-page'
import { RealTimeSearchPage } from '@/components/real-time-search-page'
import { SeamlessSearchOverlay } from '@/components/seamless-search-overlay'
import { RecentlyPlayedService, RecentlyPlayedMovie } from '@/lib/services/recently-played-service'
import MoviepireGrid from '@/components/moviepire-grid'
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
  const [seamlessSearchResults, setSeamlessSearchResults] = useState<any[]>([])
  const [seamlessSearchQuery, setSeamlessSearchQuery] = useState("")
  const [isSeamlessSearching, setIsSeamlessSearching] = useState(false)
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
    return () => {
      window.removeEventListener('app:openModal', handleGlobalOpenModal)
      window.removeEventListener('app:playMovie', handleGlobalPlayMovie)
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
  const handlePlay = (movieId: string, titleOverride?: string, resumeFromTime?: number) => {
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

    // Find the movie to get its data - check main arrays first, then search results
    let movie = movies.find(m => m.id === movieId) || trendingSeries.find(s => s.id === movieId)
    let title = movie?.title || titleOverride || 'Unknown Movie'

    // If not found in main arrays, check if we have search results
    if (!movie && seamlessSearchResults.length > 0) {
      const searchResult = seamlessSearchResults.find(r => r.id === movieId)
      if (searchResult) {
        // Create a movie-like object from search result
        movie = {
          id: searchResult.id,
          title: searchResult.title,
          poster: searchResult.poster,
          year: searchResult.year,
          genre: [searchResult.type === 'movie' ? 'Movie' : 'TV Show'],
          rating: 0,
          description: 'Loading...',
          runtime: undefined,
          imdbId: undefined,
          tmdbId: searchResult.id
        } as StreamingMovie
        title = searchResult.title
      }
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
      year: undefined,
      genre: []
    }

    setPlayingMovieId(movieId)
    setPlayingMovieTitle(title)
    setPlayingMovieData(movieData)
  setResumeTime(resumeFromTime || 0)
    setIsVideoPlayerOpen(true)
  }

  const handleAddToList = (movieId: string) => {
    console.log('Adding to list:', movieId)
    alert(`➕ Added movie ${movieId} to your list!`)
  }

  const handleMoreInfo = (movieId: string) => {
    const movie = movies.find(m => m.id === movieId) || trendingSeries.find(s => s.id === movieId)
    if (movie) setModalMovie(movie)
    setIsModalOpen(true)
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
    // Search in both movies and series arrays
    const movie = movies.find(m => m.id === movieId)
    const series = trendingSeries.find(s => s.id === movieId)
    const selectedItem = movie || series

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
    setIsVideoPlayerOpen(false)
    setPlayingMovieId(null)
    setPlayingMovieTitle('')
    setPlayingMovieData(null)
    setResumeTime(0)
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
  }, [])

  const handleNavigateToSearch = (query: string) => {
    setShowSearchResults(true)
    // Update URL to include search query
  const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('q', query)
    router.push(`?${params.toString()}`)
  }

  const handleGetStreamingUrl = async (movieId: string): Promise<string | null> => {
    try {
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()

      if (configData.success) {
        const service = createStreamingService(configData.config)
        return await service.getStreamingUrl(movieId)
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
    try {
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
        const result = await service.getStreamingResult(movieId)
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
          // Fetch popular (main grids), trending weekly movies (for hero), and trending series in parallel
          const [popularMovies, trendingMoviesData, trendingSeriesData] = await Promise.all([
            service.getPopularMovies(),
            service.getTrendingMovies(), // weekly by default in wrapper
            service.getTrendingSeries()
          ])
          console.log('📽️ Fetched movies:', popularMovies.length)
          console.log('� Fetched trending movies:', trendingMoviesData.length)
          console.log('�📺 Fetched trending series:', trendingSeriesData.length)
          console.log('🔍 First few movies:', popularMovies.slice(0, 3))
          setMovies(popularMovies)
          setTrendingMovies(trendingMoviesData)
          setTrendingSeries(trendingSeriesData)
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
      <MoviepireExplorePage
        type="movies"
  onMovieSelect={(movie) => handleSearchResultSelect({ id: movie.id, title: movie.title, year: movie.year, poster: movie.poster })}
        onPlay={handlePlay}
  onAddToList={(movie) => handleAddToList(movie.id)}
  onMoreInfo={(movie) => handleMoreInfo(movie.id)}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        activeCategory={activeCategory}
      />
    )
  }

  if (activeCategory === 'explore-series') {
    return (
      <MoviepireExplorePage
        type="series"
  onMovieSelect={(movie) => handleSearchResultSelect({ id: movie.id, title: movie.title, year: movie.year, poster: movie.poster })}
        onPlay={handlePlay}
  onAddToList={(movie) => handleAddToList(movie.id)}
  onMoreInfo={(movie) => handleMoreInfo(movie.id)}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        activeCategory={activeCategory}
      />
    )
  }

  // Show real-time search page
  if (showRealTimeSearch) {
    return (
      <RealTimeSearchPage
  onMovieSelect={(movie) => handleSearchResultSelect({ id: movie.id, title: movie.title, year: movie.year, poster: movie.poster })}
        onPlay={handlePlay}
  onAddToList={(movie) => handleAddToList(movie.id)}
  onMoreInfo={(movie) => handleMoreInfo(movie.id)}
        onClose={handleCloseRealTimeSearch}
      />
    )
  }

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
        <div className="relative z-10 space-y-0 pb-16 bg-[rgb(18,18,18)] overflow-visible">
          <div className="pointer-events-none absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent via-[rgba(18,18,18,0.55)] to-[rgb(18,18,18)]" />
          {activeCategory === 'home' && (
            <>
              {/* Moviepire Browse Replication Grid */}
              <section className="px-2 md:px-6 mb-16" aria-label="Browse Poster Wall">
                <h2 className="text-xl font-semibold mb-4">Browse</h2>
                <MoviepireGrid
                  items={movies.map(transformMovie)}
                  browseReplication
                  intentDelayMs={90}
                  enableKeyboardNav
                  prefetchNeighbors
                  showMetadata
                  minCardWidth={150}
                  gap={8}
                  className="max-h-[70vh] rounded-lg ring-1 ring-white/5 bg-black/10 backdrop-blur-sm"
                  onPlay={(id)=>handlePlay(id)}
                  onAdd={(id)=>handleAddToList(id)}
                  onInfo={(id)=>handleMoreInfo(id)}
                />
              </section>
              {/* Replacing all legacy rails with categorized poster grids */}
              <div className="space-y-12">
                <section className="px-2 md:px-6" aria-label="Trending This Week Carousel">
                  <NetflixCarousel
                    id="carousel-trending"
                    title="Trending This Week"
                    items={effectiveTrending.slice(0,36).map(transformMovie)}
                    onPlay={id=>handlePlay(id)}
                    onAdd={id=>handleAddToList(id)}
                    onInfo={id=>handleMoreInfo(id)}
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
                </section>
                <section className="px-2 md:px-6" aria-label="Popular Movies Carousel">
                  <NetflixCarousel
                    id="carousel-popular"
                    title="Popular Movies"
                    items={movies.slice(0,36).map(transformMovie)}
                    onPlay={id=>handlePlay(id)}
                    onAdd={id=>handleAddToList(id)}
                    onInfo={id=>handleMoreInfo(id)}
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
                </section>
                <section className="px-2 md:px-6" aria-label="Series Picks Carousel">
                  <NetflixCarousel
                    id="carousel-series"
                    title="Series Picks"
                    items={trendingSeries.slice(0,30).map(transformSeries)}
                    onPlay={id=>handlePlay(id)}
                    onAdd={id=>handleAddToList(id)}
                    onInfo={id=>handleMoreInfo(id)}
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
                </section>
              </div>
            </>
          )}
          {/* Unified NetflixCarousel style for category pages */}
          {activeCategory === 'trending' && (
            <section className="px-2 md:px-6" aria-label="Trending Category Carousel">
              <NetflixCarousel
                id="category-trending"
                title="Trending This Week"
                items={effectiveTrending.slice(0,36).map(transformMovie)}
                onPlay={id=>handlePlay(id)}
                onAdd={id=>handleAddToList(id)}
                onInfo={id=>handleMoreInfo(id)}
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
            </section>
          )}
          {activeCategory === 'popular' && (
            <section className="px-2 md:px-6" aria-label="Popular Category Carousel">
              <NetflixCarousel
                id="category-popular"
                title="Popular Movies"
                items={movies.slice(0,36).map(transformMovie)}
                onPlay={id=>handlePlay(id)}
                onAdd={id=>handleAddToList(id)}
                onInfo={id=>handleMoreInfo(id)}
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
            </section>
          )}
          {activeCategory === 'recently-played' && recentlyPlayedMovies.length > 0 && (
            <section className="px-2 md:px-6" aria-label="Continue Watching Carousel">
              <NetflixCarousel
                id="category-recently-played"
                title="Continue Watching"
                items={recentlyPlayedMovies.slice(0,36).map(r => transformMovie({
                  id: r.id,
                  title: r.title,
                  poster: r.poster,
                  backdrop: r.poster,
                  year: r.year,
                  rating: 0,
                  genre: r.genre,
                  description: '',
                  runtime: undefined,
                  imdbId: undefined,
                  tmdbId: undefined
                } as StreamingMovie))}
                onPlay={id=>handlePlay(id)}
                onAdd={id=>handleAddToList(id)}
                onInfo={id=>handleMoreInfo(id)}
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

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={isVideoPlayerOpen}
        onClose={handleCloseVideoPlayer}
        movieId={playingMovieId}
        movieTitle={playingMovieTitle}
        onGetStreamingUrl={handleGetStreamingUrl}
        onGetStreamingResult={handleGetStreamingResult}
        movieData={playingMovieData || undefined}
        startTime={resumeTime}
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

      {/* Seamless Search Overlay */}
      <SeamlessSearchOverlay
        searchResults={seamlessSearchResults}
        searchQuery={seamlessSearchQuery}
        isSearching={isSeamlessSearching}
        onPlay={handlePlay}
        onAddToList={(movie) => {
          handleAddToList(movie.id)
        }}
        onMoreInfo={(movie) => {
          // Convert search result to movie format and show SEARCH modal
          const movieData = {
            id: movie.id,
            title: movie.title,
            poster: movie.poster,
            backdrop: movie.backdrop,
            year: movie.year ?? new Date().getFullYear(),
            type: movie.type
          }
          handleSearchResultSelect(movieData)
        }}
      />
    </div>
  )
}
