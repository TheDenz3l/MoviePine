"use client"

import { useState, useEffect } from 'react'
import { TMDBAPI } from '@/lib/api/tmdb'
import { MoviepireMovieGrid } from '@/components/moviepire-movie-grid'
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExploreMovie {
  id: string
  title: string
  poster: string
  year?: number
  genre?: string[]
}

interface MoviepireExplorePageProps {
  type: 'movies' | 'series'
  onMovieSelect: (movie: ExploreMovie) => void
  onPlay: (movieId: string, title: string) => void
  onAddToList: (movie: ExploreMovie) => void
  onMoreInfo: (movie: ExploreMovie) => void
  onNavigate: (category: string) => void
  onSearch: (query: string) => void
  activeCategory: string
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

// Genre mappings based on moviepire.net structure
const movieGenres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' }
]

const tvGenres = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' }
]

export function MoviepireExplorePage({
  type,
  onMovieSelect,
  onPlay,
  onAddToList,
  onMoreInfo,
  onNavigate,
  onSearch,
  activeCategory
}: MoviepireExplorePageProps) {
  const [selectedCategory, setSelectedCategory] = useState('popular')
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [movies, setMovies] = useState<ExploreMovie[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scrollOpacity, setScrollOpacity] = useState(0)

  const genres = type === 'movies' ? movieGenres : tvGenres
  const categories = [
    { id: 'popular', name: 'Popular' },
    { id: 'top_rated', name: 'Top Rated' },
    { id: 'upcoming', name: type === 'movies' ? 'Upcoming' : 'On The Air' }
  ]

  // Progressive scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const opacity = Math.min(scrollTop / 100, 1)
      setScrollOpacity(opacity)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load content when category or genre changes
  useEffect(() => {
    loadContent()
  }, [selectedCategory, selectedGenre, currentPage, type])

  const loadContent = async () => {
    setIsLoading(true)
    try {
      let results
      
      if (selectedGenre) {
        // Load by genre
        if (type === 'movies') {
          results = await tmdbApi.getMoviesByGenre(selectedGenre, currentPage)
        } else {
          results = await tmdbApi.getTVByGenre(selectedGenre, currentPage)
        }
      } else {
        // Load by category
        if (type === 'movies') {
          switch (selectedCategory) {
            case 'popular':
              results = await tmdbApi.getPopularMovies(currentPage)
              break
            case 'top_rated':
              results = await tmdbApi.getTopRatedMovies(currentPage)
              break
            case 'upcoming':
              results = await tmdbApi.getUpcomingMovies(currentPage)
              break
            default:
              results = await tmdbApi.getPopularMovies(currentPage)
          }
        } else {
          switch (selectedCategory) {
            case 'popular':
              results = await tmdbApi.getPopularTV(currentPage)
              break
            case 'top_rated':
              results = await tmdbApi.getTopRatedTV(currentPage)
              break
            case 'upcoming':
              results = await tmdbApi.getOnTheAirTV(currentPage)
              break
            default:
              results = await tmdbApi.getPopularTV(currentPage)
          }
        }
      }

      // Transform results
      const transformedMovies: ExploreMovie[] = results.results.map((item: any) => ({
        id: item.id.toString(),
        title: type === 'movies' ? item.title : item.name,
        poster: item.poster_path
          ? tmdbApi.getPosterUrl(item.poster_path, 'w500')
          : '/placeholder-poster.svg',
        year: type === 'movies' 
          ? new Date(item.release_date || '').getFullYear() || undefined
          : new Date(item.first_air_date || '').getFullYear() || undefined,
        genre: item.genre_ids?.map((id: number) => 
          genres.find(g => g.id === id)?.name || `Genre ${id}`
        ) || []
      }))

      setMovies(transformedMovies)
      setTotalPages(Math.min(results.total_pages, 500)) // Limit to 500 pages
    } catch (error) {
      console.error('Error loading content:', error)
      setMovies([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedGenre(null)
    setCurrentPage(1)
  }

  const handleGenreSelect = (genreId: number) => {
    setSelectedGenre(genreId)
    setSelectedCategory('')
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getCurrentTitle = () => {
    if (selectedGenre) {
      const genre = genres.find(g => g.id === selectedGenre)
      return `${genre?.name || 'Genre'} ${type === 'movies' ? 'Movies' : 'Series'}`
    }
    
    const category = categories.find(c => c.id === selectedCategory)
    return `${category?.name || 'Popular'} ${type === 'movies' ? 'Movies' : 'Series'}`
  }

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
      {/* Navigation */}
      <MoviepireNavigation
        onNavigate={onNavigate}
        activeCategory={activeCategory}
        onSearch={onSearch}
      />

      {/* Content */}
      <div className="pt-20 px-6">
        {/* Categories and Genres Navigation */}
        <nav className="mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
            <div className="flex flex-wrap gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category.id && !selectedGenre
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Genres</h2>
            <div className="flex flex-wrap gap-3">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreSelect(genre.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedGenre === genre.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Content Grid */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">{getCurrentTitle()}</h1>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white text-xl">Loading...</div>
            </div>
          ) : (
            <MoviepireMovieGrid
              title=""
              movies={movies}
              onPlay={onPlay}
              onAddToList={onAddToList}
              onMoreInfo={onMoreInfo}
              showMovieTitles={true}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              PREV
            </Button>
            
            <span className="text-white font-medium">
              {currentPage}
            </span>
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              NEXT
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <MoviepireFooter />
    </div>
  )
}
