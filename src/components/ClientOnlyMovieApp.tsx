"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Film } from 'lucide-react'
import { StreamingService, createStreamingService } from '@/lib/services/streaming'
import { StreamingMovie } from '@/lib/services/streaming'
import { MovieCard } from '@/components/movie-card'
import { NetflixMovieGrid } from '@/components/netflix-movie-grid'
import { NetflixMovieRow } from '@/components/netflix-movie-row'
import { NetflixHeroSection } from '@/components/netflix-hero-section'
import { MovieDetailModal } from '@/components/movie-detail-modal'
import { NetflixFloatingNav } from '@/components/netflix-floating-nav'
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceStatus, setServiceStatus] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState('home')
  const [selectedMovie, setSelectedMovie] = useState<StreamingMovie | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Initialize category from URL params
  useEffect(() => {
    const category = searchParams.get('category')
    if (category) {
      setActiveCategory(category)
    }
  }, [searchParams])

  // Navigation handler
  const handleNavigate = async (category: string) => {
    setActiveCategory(category)
    setIsLoading(true)

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

  // Event handlers for movie interactions
  const handlePlay = (movieId: string) => {
    console.log('Playing movie:', movieId)
    alert(`🎬 Playing movie: ${movieId}\n\nStreaming functionality will be implemented here!`)
  }

  const handleAddToList = (movieId: string) => {
    console.log('Adding to list:', movieId)
    alert(`➕ Added movie ${movieId} to your list!`)
  }

  const handleMoreInfo = (movieId: string) => {
    const movie = movies.find(m => m.id === movieId)
    if (movie) {
      setSelectedMovie(movie)
      setIsModalOpen(true)
    }
  }

  const handleMovieSelect = (movie: StreamingMovie) => {
    setSelectedMovie(movie)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  // Transform StreamingMovie to MovieCard format
  const transformMovie = (movie: StreamingMovie) => ({
    id: movie.id,
    title: movie.title,
    poster: movie.poster || 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop',
    year: movie.year,
    rating: movie.rating,
    genre: movie.genre || [],
    description: movie.description
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
        setServiceStatus(status)

        if (status.tmdb) {
          console.log('🎬 TMDB is working, fetching real movies...')
          const popularMovies = await service.getPopularMovies()
          console.log('📽️ Fetched movies:', popularMovies.length)
          console.log('🔍 First few movies:', popularMovies.slice(0, 3))
          setMovies(popularMovies)
          setSelectedMovie(popularMovies[0] || null)
        } else {
          console.log('⚠️ TMDB not working, using fallback movies')
          setMovies(fallbackMovies)
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

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Netflix Floating Navigation */}
      <NetflixFloatingNav onNavigate={handleNavigate} activeCategory={activeCategory} />

      <div className="flex flex-col min-h-screen">
        {/* MoviePine Logo Header - Always visible */}
        <header className="absolute top-4 left-16 z-50">
          <div className="flex items-center space-x-2">
            <div className="text-red-600 font-bold text-2xl">MoviePine</div>
          </div>
        </header>

            {/* Hero Section */}
        {featuredMovie && (
          <NetflixHeroSection
            movie={transformMovie(featuredMovie)}
            onPlay={handlePlay}
            onMoreInfo={handleMoreInfo}
          />
        )}

        {/* Movie Rows */}
        <div className="flex-1 space-y-8 pb-8">
          {activeCategory === 'home' && (
            <>
              <NetflixMovieRow
                title="New this week"
                movies={movies.slice(0, 12).map(transformMovie)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
                onMovieSelect={handleMovieSelect}
              />
              <NetflixMovieRow
                title="Trending Now"
                movies={movies.slice(12, 24).map(transformMovie)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
                onMovieSelect={handleMovieSelect}
              />
              <NetflixMovieRow
                title="Popular on Netflix"
                movies={movies.slice(24, 36).map(transformMovie)}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
                onMovieSelect={handleMovieSelect}
              />
            </>
          )}

          {activeCategory === 'trending' && (
            <NetflixMovieRow
              title="Trending Now"
              movies={movies.slice(5, 17).map(transformMovie)}
              onPlay={handlePlay}
              onAddToList={handleAddToList}
              onMoreInfo={handleMoreInfo}
              onMovieSelect={handleMovieSelect}
            />
          )}

          {activeCategory === 'popular' && (
            <NetflixMovieRow
              title="Popular Movies"
              movies={movies.slice(10, 22).map(transformMovie)}
              onPlay={handlePlay}
              onAddToList={handleAddToList}
              onMoreInfo={handleMoreInfo}
              onMovieSelect={handleMovieSelect}
            />
          )}
        </div>

        {/* Service Status */}
        {serviceStatus && (
          <div className="px-12 py-8 border-t border-gray-800">
            <div className="bg-gray-900 p-4 rounded">
              <h3 className="text-lg font-bold mb-2">Service Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className={`p-2 rounded ${serviceStatus.tmdb ? 'bg-green-900' : 'bg-red-900'}`}>
                  TMDB: {serviceStatus.tmdb ? '✅' : '❌'}
                </div>
                <div className={`p-2 rounded ${serviceStatus.torrentio ? 'bg-green-900' : 'bg-red-900'}`}>
                  Torrentio: {serviceStatus.torrentio ? '✅' : '❌'}
                </div>
                <div className={`p-2 rounded ${serviceStatus.realdebrid ? 'bg-green-900' : 'bg-red-900'}`}>
                  Real-Debrid: {serviceStatus.realdebrid ? '✅' : '❌'}
                </div>
                <div className={`p-2 rounded ${serviceStatus.torbox ? 'bg-green-900' : 'bg-red-900'}`}>
                  Torbox: {serviceStatus.torbox ? '✅' : '❌'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie ? transformMovie(selectedMovie) : null}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPlay={handlePlay}
        onAddToList={handleAddToList}
      />
    </div>
  )
}
