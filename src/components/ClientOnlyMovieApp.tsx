"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Film } from 'lucide-react'
import { StreamingService, createStreamingService } from '@/lib/services/streaming'
import { StreamingMovie, StreamingSeries } from '@/lib/services/streaming'
import { MovieCard } from '@/components/movie-card'
import { NetflixMovieGrid } from '@/components/netflix-movie-grid'
import { NetflixMovieRow } from '@/components/netflix-movie-row'
import { NetflixHeroSection } from '@/components/netflix-hero-section'
import { MovieDetailModal } from '@/components/movie-detail-modal'
import { NetflixFloatingNav } from '@/components/netflix-floating-nav'
import { VideoPlayerModal } from '@/components/video-player-modal'
import { RecentlyPlayedRow } from '@/components/recently-played-row'
// Moviepire components
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireHeroSection } from '@/components/moviepire-hero-section'
import { MoviepireMovieGrid } from '@/components/moviepire-movie-grid'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { RecentlyPlayedService, RecentlyPlayedMovie } from '@/lib/services/recently-played-service'
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
  const [trendingSeries, setTrendingSeries] = useState<StreamingSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeCategory, setActiveCategory] = useState('home')
  const [selectedMovie, setSelectedMovie] = useState<StreamingMovie | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false)
  const [playingMovieId, setPlayingMovieId] = useState<string | null>(null)
  const [playingMovieTitle, setPlayingMovieTitle] = useState<string>('')
  const [showSearchResults, setShowSearchResults] = useState(false)
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
    const category = searchParams.get('category')
    const searchQuery = searchParams.get('q')

    if (category) {
      setActiveCategory(category)
    }

    if (searchQuery) {
      setShowSearchResults(true)
    }
  }, [searchParams])

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
    const params = new URLSearchParams(searchParams.toString())
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
    const params = new URLSearchParams(searchParams.toString())
    params.set('q', query)
    router.push(`?${params.toString()}`)
  }

  // Event handlers for movie interactions
  const handlePlay = (movieId: string, resumeFromTime?: number) => {
    console.log('🎬 Playing movie:', movieId, resumeFromTime ? `(resume from ${resumeFromTime}s)` : '')

    // Find the movie to get its data
    const movie = movies.find(m => m.id === movieId) || trendingSeries.find(s => s.id === movieId)
    const title = movie?.title || 'Unknown Movie'

    // Prepare movie data for recently played tracking
    const movieData = movie ? {
      id: movie.id,
      title: movie.title,
      poster: movie.poster || '',
      year: movie.year,
      genre: movie.genre
    } : null

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
    // Search in both movies and series arrays
    const movie = movies.find(m => m.id === movieId)
    const series = trendingSeries.find(s => s.id === movieId)
    const selectedItem = movie || series

    if (selectedItem) {
      setSelectedMovie(selectedItem)
      setIsModalOpen(true)
    }
  }

  const handleMovieSelect = (movie: StreamingMovie | StreamingSeries) => {
    setSelectedMovie(movie as StreamingMovie) // Cast since modal expects StreamingMovie format
    // Only update hero section, don't open modal
  }

  const handleMovieSelectWithModal = (movie: StreamingMovie | StreamingSeries) => {
    setSelectedMovie(movie as StreamingMovie) // Cast since modal expects StreamingMovie format
    setIsModalOpen(true) // Open modal when movie/series is selected
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
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

  // Search handlers
  const handleSearchResultSelect = (result: { id: string; title: string; year: number; poster: string; type: 'movie' | 'tv' }) => {
    // Convert search result to movie format and select it
    const searchMovie: StreamingMovie = {
      id: result.id,
      title: result.title,
      poster: result.poster,
      year: result.year,
      rating: 0,
      genre: [],
      description: 'Loading...',
      runtime: undefined,
      imdbId: undefined,
      tmdbId: result.id
    }
    setSelectedMovie(searchMovie)
    setIsModalOpen(true)
  }

  const handleBackFromSearch = () => {
    setShowSearchResults(false)
  }

  const handleNavigateToSearch = (query: string) => {
    setShowSearchResults(true)
    // Update URL to include search query
    const params = new URLSearchParams(searchParams.toString())
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
      const configResponse = await fetch('/api/config')
      const configData = await configResponse.json()

      if (configData.success) {
        const service = createStreamingService(configData.config)
        const result = await service.getStreamingResult(movieId)
        return result ? {
          url: result.url,
          subtitles: result.subtitles,
          realSubtitles: result.realSubtitles
        } : null
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
    description: movie.description
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
          const [popularMovies, trendingSeriesData] = await Promise.all([
            service.getPopularMovies(),
            service.getTrendingSeries()
          ])
          console.log('📽️ Fetched movies:', popularMovies.length)
          console.log('📺 Fetched trending series:', trendingSeriesData.length)
          console.log('🔍 First few movies:', popularMovies.slice(0, 3))
          // Add a test movie with known torrent availability for testing streaming
          const testMovie: StreamingMovie = {
            id: 'tt0111161', // The Shawshank Redemption - definitely has torrents
            title: 'The Shawshank Redemption (Test)',
            description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
            poster: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflyCy3FpPiy3BXI.jpg',
            backdrop: 'https://image.tmdb.org/t/p/original/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
            year: 1994,
            rating: 9.3,
            genre: ['Drama'],
            runtime: 142,
            imdbId: 'tt0111161',
            tmdbId: 278
          }

          // Add test movie to the beginning of the list
          const moviesWithTest = [testMovie, ...popularMovies]

          setMovies(moviesWithTest)
          setTrendingSeries(trendingSeriesData)
          setSelectedMovie(testMovie) // Set test movie as featured
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

  // Check if we should show search results page
  if (showSearchResults) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Search functionality temporarily disabled</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen text-white relative transition-all duration-300 ${
      isScrolled ? 'bg-[rgb(18,18,18)]' : 'bg-transparent'
    }`}>
      {/* Moviepire Navigation */}
      <MoviepireNavigation
        onNavigate={handleNavigate}
        activeCategory={activeCategory}
        onSearch={handleSearch}
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

        {/* Movie Grids - Moviepire style with tighter spacing */}
        <div className="relative z-10 space-y-0 pb-16 bg-[rgb(18,18,18)]">
          {activeCategory === 'home' && (
            <>
              {/* Recently Played Section */}
              {recentlyPlayedMovies.length > 0 && (
                <MoviepireMovieGrid
                  title="Continue Watching"
                  movies={recentlyPlayedMovies.map(movie => ({
                    id: movie.id,
                    title: movie.title,
                    poster: movie.poster,
                    year: movie.year,
                    genre: movie.genre
                  }))}
                  onPlay={handlePlay}
                  onAddToList={handleAddToList}
                  onMoreInfo={handleMoreInfo}
                />
              )}

              <MoviepireMovieGrid
                title="Trending movies this week"
                movies={movies.slice(0, 12).map(transformMovie)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
              />
              <MoviepireMovieGrid
                title="Popular movies"
                movies={movies.slice(12, 24).map(transformMovie)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
              />
              <MoviepireMovieGrid
                title="TV Series"
                movies={trendingSeries.slice(0, 12).map(transformSeries)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
              />
              <MoviepireMovieGrid
                title="Top Rated Movies"
                movies={movies.slice(24, 36).map(transformMovie)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
              />
            </>
          )}

          {activeCategory === 'trending' && (
            <MoviepireMovieGrid
              title="Trending movies this week"
              movies={movies.slice(0, 20).map(transformMovie)}
              onPlay={handlePlay}
              onAddToList={handleAddToList}
              onMoreInfo={handleMoreInfo}
            />
          )}

          {activeCategory === 'popular' && (
            <MoviepireMovieGrid
              title="Popular movies"
              movies={movies.slice(0, 20).map(transformMovie)}
              onPlay={handlePlay}
              onAddToList={handleAddToList}
              onMoreInfo={handleMoreInfo}
            />
          )}

          {activeCategory === 'recently-played' && recentlyPlayedMovies.length > 0 && (
            <MoviepireMovieGrid
              title="Continue Watching"
              movies={recentlyPlayedMovies.map(movie => ({
                id: movie.id,
                title: movie.title,
                poster: movie.poster,
                year: movie.year,
                genre: movie.genre
              }))}
              onPlay={handlePlay}
              onAddToList={handleAddToList}
              onMoreInfo={handleMoreInfo}
              showMovieTitles={true}
            />
          )}

          {activeCategory === 'recently-played' && recentlyPlayedMovies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">No Recently Played Movies</h2>
              <p className="text-gray-500">Movies you watch will appear here</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <MoviepireFooter />
      </div>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie ? transformMovie(selectedMovie) : null}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPlay={handlePlay}
        onAddToList={handleAddToList}
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
    </div>
  )
}
