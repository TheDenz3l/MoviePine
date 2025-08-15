import React from 'react'
import { X, Play, ThumbsUp, ChevronDown } from 'lucide-react'
import { useMyList } from '@/components/list/useMyList'
import { Button } from '@/components/ui/button'
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { ImdbRating } from '@/components/imdb-rating'

interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  runtime?: number
  genres?: Array<{ id: number; name: string }>
  tagline?: string
}

interface MoviepireModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  onPlay: (movieId: number) => void
  onAddToList?: (movieId: number) => void // optional; internal watchlist toggles
  relatedMovies?: Movie[]
  onMovieSelect?: (movieId: number) => void
}

export function MoviepireModal({ 
  movie, 
  isOpen, 
  onClose, 
  onPlay, 
  onAddToList,
  relatedMovies = [],
  onMovieSelect
}: MoviepireModalProps) {
  if (!isOpen || !movie) return null

  const { watchlist, addWatch, removeWatch } = useMyList()
  const inList = !!watchlist?.some(w => w.content_id === String(movie.id))
  const toggleList = () => {
    inList ? removeWatch(String(movie.id)) : addWatch(String(movie.id), 'movie')
    onAddToList?.(movie.id)
  }

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatRating = (rating: number) => {
    return rating.toFixed(1)
  }

  const getYear = (dateString: string) => {
    return new Date(dateString).getFullYear()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Netflix-style Modal Container */}
      <div className="relative w-[85vw] h-[85vh] max-w-[1200px] max-h-[800px] bg-black rounded-lg overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Content - Netflix Style */}
        <div className="h-full flex flex-col relative bg-zinc-900">
          {/* Hero Section with Backdrop and Integrated Gradient */}
          <div className="relative h-[40vh] min-h-[300px] w-full overflow-visible flex-shrink-0">
            {/* Backdrop Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path})`,
              }}
            />

            {/* Side gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

            {/* Netflix-style Bottom Gradient - Creates seamless transition */}
            <div
              className="absolute inset-x-0 bottom-0 h-[200px] pointer-events-none"
              style={{
                background: `linear-gradient(
                  to bottom,
                  transparent 0%,
                  rgba(24, 24, 27, 0.1) 20%,
                  rgba(24, 24, 27, 0.3) 40%,
                  rgba(24, 24, 27, 0.6) 60%,
                  rgba(24, 24, 27, 0.8) 80%,
                  rgb(24, 24, 27) 100%
                )`
              }}
            />

            {/* Title and Actions Overlay */}
            <div className="absolute bottom-6 left-6 right-6 z-10">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white leading-tight max-w-2xl">
                {movie.title}
              </h1>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => onPlay(movie.id)}
                  className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 text-base font-semibold"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Play
                </Button>
                <div className="flex items-center">
                  <div className="h-10 w-10 mr-3 flex items-center justify-center" onClick={(e)=>e.stopPropagation()}>
                    <WatchlistToggleButton inList={inList} size={40} variant="overlay" onToggle={toggleList} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section - No background, relies on gradient transition */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="px-6 py-6">
              {/* Movie Metadata */}
              <div className="flex items-center gap-4 text-sm mb-4">
                <span className="text-green-400 font-semibold">
                  {Math.floor(movie.vote_average * 10)}% Match
                </span>
                <span className="text-white">{getYear(movie.release_date)}</span>
                {movie.runtime && (
                  <span className="text-gray-300">{formatRuntime(movie.runtime)}</span>
                )}
                <div className="border border-gray-400 px-2 py-0.5 text-gray-300 text-xs">HD</div>
              </div>

              {/* Tagline */}
              {movie.tagline && (
                <h4 className="text-lg font-medium text-gray-300 italic mb-3">
                  {movie.tagline}
                </h4>
              )}

              {/* Description */}
              <p className="text-gray-300 leading-relaxed text-base mb-6 max-w-3xl">
                {movie.overview}
              </p>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="mb-6">
                  <span className="text-gray-400 text-sm">Genres: </span>
                  <span className="text-white text-sm">
                    {movie.genres.map(genre => genre.name).join(', ')}
                  </span>
                </div>
              )}

              {/* More Like This Section */}
              {relatedMovies.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-white mb-4">More Like This</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {relatedMovies.slice(0, 8).map((relatedMovie) => (
                      <div
                        key={relatedMovie.id}
                        className="group relative cursor-pointer will-change-transform transform-gpu outline-none"
                        role="button"
                        tabIndex={0}
                        aria-label={`Open details for ${relatedMovie.title}`}
                        data-testid="more-like-tile"
                        onClick={() => onMovieSelect?.(relatedMovie.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMovieSelect?.(relatedMovie.id) } }}
                      >
                        {/* Poster */}
                        <img
                          src={`https://image.tmdb.org/t/p/w300${relatedMovie.poster_path}`}
                          alt={relatedMovie.title}
                          className="w-full h-auto rounded-lg block"
                          draggable={false}
                        />

                        {/* Hover gradient / darken layer (hidden until hover/focus) */}
                        <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" />

                        {/* Bottom-left stack: title above IMDb rating (reserve space on right for play button) */}
                        <div className="absolute left-2 bottom-2 right-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                          <div className="text-white text-[11px] font-semibold leading-snug line-clamp-2 drop-shadow-md pr-1">
                            {relatedMovie.title}
                          </div>
                          <div>
                            <ImdbRating rating={relatedMovie.vote_average} size="compact" />
                          </div>
                        </div>

                        {/* Small play button bottom-right */}
                        <Button
                          size="sm"
                          className="absolute bottom-2 right-2 bg-white text-black hover:bg-gray-200 h-7 w-7 p-0 rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-200 shadow-md"
                          onClick={(e) => { e.stopPropagation(); onPlay(relatedMovie.id) }}
                          aria-label={`Play ${relatedMovie.title}`}
                          data-testid="tile-play"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
