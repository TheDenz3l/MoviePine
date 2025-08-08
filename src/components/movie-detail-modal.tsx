"use client"

import { useState, useEffect } from "react"
import { X, Play, Plus, ThumbsUp } from "lucide-react"
import { ImdbRating } from '@/components/imdb-rating'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TMDBAPI, TMDBCastMember } from "@/lib/api/tmdb"

interface Movie {
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
}

interface MovieDetailModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMovieSelect?: (movie: Movie) => void
}

export function MovieDetailModal({ movie, isOpen, onClose, onPlay, onAddToList, onMovieSelect }: MovieDetailModalProps) {
  const [isLiked, setIsLiked] = useState<boolean | null>(null)
  const [cast, setCast] = useState<TMDBCastMember[]>([])
  const [isLoadingCast, setIsLoadingCast] = useState(false)
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)

  // Fetch cast and similar movies information when movie changes
  useEffect(() => {
    if (!movie || !isOpen) return

    const fetchMovieDetails = async () => {
      // Extract TMDB ID from movie data
      let tmdbId: number | null = null

      if (movie.tmdbId) {
        tmdbId = typeof movie.tmdbId === 'string' ? parseInt(movie.tmdbId) : movie.tmdbId
      } else if (movie.id.startsWith('tmdb_')) {
        tmdbId = parseInt(movie.id.replace('tmdb_', ''))
      }

      if (!tmdbId) {
        console.warn('No TMDB ID found for movie:', movie.title)
        return
      }

      // Get TMDB API key from environment
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      if (!tmdbApiKey) {
        console.warn('TMDB API key not configured')
        return
      }

      const tmdbApi = new TMDBAPI(tmdbApiKey)

      // Fetch cast information
      setIsLoadingCast(true)
      try {
        const credits = await tmdbApi.getMovieCredits(tmdbId)
        setCast(credits.cast.slice(0, 5)) // Get top 5 cast members
      } catch (error) {
        console.error('Error fetching cast information:', error)
        setCast([])
      } finally {
        setIsLoadingCast(false)
      }

      // Fetch similar movies
      setIsLoadingSimilar(true)
      try {
        // Try similar movies first, fallback to recommendations
        let similarResponse
        try {
          similarResponse = await tmdbApi.getSimilarMovies(tmdbId)
        } catch (error) {
          console.warn('Similar movies not available, trying recommendations:', error)
          similarResponse = await tmdbApi.getRecommendedMovies(tmdbId)
        }

        // Convert TMDB movies to our Movie format
        const genres = await tmdbApi.getMovieGenres()
        const convertedSimilarMovies = similarResponse.results
          .slice(0, 6) // Get top 6 similar movies
          .map((tmdbMovie: any) => tmdbApi.convertToMovie(tmdbMovie, genres.genres))

        setSimilarMovies(convertedSimilarMovies)
      } catch (error) {
        console.error('Error fetching similar movies:', error)
        setSimilarMovies([])
      } finally {
        setIsLoadingSimilar(false)
      }
    }

    fetchMovieDetails()
  }, [movie, isOpen])

  // Handle similar movie click
  const handleSimilarMovieClick = (similarMovie: Movie) => {
    if (onMovieSelect) {
      onMovieSelect(similarMovie)
    }
  }

  // Remove body overflow hidden to allow background scrolling
  // Netflix modal allows background to remain visible and scrollable

  if (!movie) return null

  const matchPercentage = Math.floor(movie.rating * 10) + Math.floor(Math.random() * 20)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="pointer-events-auto w-[60vw] max-w-none h-[95vh] bg-black text-white border-0 p-0 overflow-hidden rounded-lg fixed top-[5vh] left-1/2 transform -translate-x-1/2 translate-y-0 z-50 shadow-2xl"
        showCloseButton={false}
        style={{ width: '60vw', maxWidth: 'none' }}
      >
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>
        <DialogDescription className="sr-only">Movie details for {movie.title}</DialogDescription>

        {/* Netflix-style Floating Modal */}
        <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'rgb(18, 18, 18)' }}>
          {/* Hero Section - Netflix-style backdrop with integrated gradient */}
          <div className="relative h-[60vh] w-full overflow-visible flex-shrink-0">
            {/* Backdrop Image */}
            <div
              className="absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: `url(${movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
                backgroundSize: '120%',
                backgroundPosition: 'center 20%',
              }}
            />

            {/* Subtle side gradient for depth */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background: `linear-gradient(
                  to right,
                  rgba(0, 0, 0, 0.3) 0%,
                  transparent 30%,
                  transparent 70%,
                  rgba(0, 0, 0, 0.1) 100%
                )`
              }}
            />

            {/* Netflix-style Bottom Gradient - Creates seamless transition */}
            <div
              className="absolute inset-x-0 bottom-0 h-[200px] pointer-events-none z-20"
              style={{
                background: `linear-gradient(
                  to bottom,
                  transparent 0%,
                  rgba(18, 18, 18, 0.1) 20%,
                  rgba(18, 18, 18, 0.3) 40%,
                  rgba(18, 18, 18, 0.6) 60%,
                  rgba(18, 18, 18, 0.8) 80%,
                  rgb(18, 18, 18) 100%
                )`
              }}
            />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full w-10 h-10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Title and Actions Overlay - Netflix style */}
            <div className="absolute bottom-4 left-4 right-4 z-30">
              <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white leading-tight max-w-xl">
                {movie.title}
              </h1>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onPlay(movie.id)}
                  className="bg-white text-black hover:bg-gray-200 font-semibold px-4 py-1.5 rounded text-sm flex items-center space-x-1.5"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Play</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-2 border-gray-400 text-white hover:bg-white hover:text-black rounded-full w-8 h-8"
                  onClick={() => onAddToList(movie.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`border-2 border-gray-400 rounded-full w-8 h-8 ${
                    isLiked === true ? 'bg-white text-black' : 'text-white hover:bg-white hover:text-black'
                  }`}
                  onClick={() => setIsLiked(isLiked === true ? null : true)}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Section - No background, relies on gradient transition */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="px-6 py-4">

              {/* Match percentage and metadata - Netflix style */}
              <div className="flex items-center space-x-3 text-sm mb-4">
                <span className="text-green-400 font-semibold">{matchPercentage}% Match</span>
                  <ImdbRating rating={movie.rating} />
                  <span className="text-white">{movie.year}</span>
                  <span className="text-gray-300">{movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '2h 8m'}
                </span>
                <div className="border border-gray-400 px-1.5 py-0.5 text-gray-300 text-xs">HD</div>
                <div className="border border-gray-400 px-1.5 py-0.5 text-gray-300 text-xs">13+</div>
              </div>

              {/* Description */}
              <p className="text-white text-sm leading-relaxed mb-8 max-w-4xl">
                {movie.description || "At a stuffy New England prep school, an unconventional teacher inspires students to view their studies and lives from a more meaningful perspective."}
              </p>

              {/* Cast and Crew Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mb-8">
                <div>
                  <span className="text-gray-400">Cast: </span>
                  <span className="text-white">
                    {isLoadingCast
                      ? 'Loading cast information...'
                      : cast.length > 0
                        ? cast.map(actor => actor.name).join(', ') + (cast.length >= 5 ? ', more' : '')
                        : 'Cast information not available'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Genres: </span>
                  <span className="text-white">
                    {movie.genre && movie.genre.length > 0
                      ? movie.genre.slice(0, 3).join(', ')
                      : 'No genres available'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">This movie is: </span>
                  <span className="text-white">
                    {movie.genre && movie.genre.length > 0
                      ? movie.genre.slice(0, 2).map(g => g.toLowerCase()).join(', ')
                      : 'Information not available'
                    }
                  </span>
                </div>
              </div>

              {/* Similar Section - Compact vertical poster grid */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-white">Similar</h3>
                <div className="grid grid-cols-6 gap-2">
                  {isLoadingSimilar ? (
                    // Loading state
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-md animate-pulse"></div>
                    ))
                  ) : similarMovies.length > 0 ? (
                    // Dynamic similar movies
                    similarMovies.map((similarMovie, i) => (
                      <div
                        key={similarMovie.id}
                        className="aspect-[2/3] group cursor-pointer relative overflow-hidden rounded-md bg-zinc-800 hover:scale-105 transition-transform duration-200"
                        onClick={() => handleSimilarMovieClick(similarMovie)}
                      >
                        {similarMovie.poster ? (
                          <img
                            src={similarMovie.poster}
                            alt={similarMovie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                            <span className="text-gray-400 text-[10px] text-center px-1 leading-tight">{similarMovie.title}</span>
                          </div>
                        )}

                        {/* Hover overlay with movie info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-2">
                          <div className="text-white">
                            <h4 className="font-semibold text-xs mb-1 line-clamp-2 leading-tight drop-shadow-lg">{similarMovie.title}</h4>
                            <p className="text-gray-200 text-[10px] mb-1 drop-shadow">{similarMovie.year}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-green-400 text-[10px] drop-shadow">
                                ⭐ {similarMovie.rating ? similarMovie.rating.toFixed(1) : 'N/A'}
                              </span>
                              <Play className="h-3 w-3 text-white drop-shadow" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // No similar movies found
                    <div className="col-span-6 text-center py-8">
                      <p className="text-gray-400 text-sm">No similar movies found.</p>
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
