"use client"
import { Play, Plus, ThumbsUp, ChevronDown } from "lucide-react"
import { ImdbRating } from '@/components/imdb-rating'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import CinematicGrid from '@/components/cinematic/CinematicGrid'
import PosterImage from "@/components/hover/PosterImage"

interface Movie {
  id: string
  title: string
  poster: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
}

interface NetflixMovieGridProps {
  movies: Movie[]
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
  onMovieSelect: (movie: Movie) => void
}

function BaseCard({ movie, onPlay }: { movie: Movie; onPlay: (movieId: string) => void }) {
  return (
    <div className="group relative cursor-pointer" onClick={() => onPlay(movie.id)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
  <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
      </div>
    </div>
  )
}

export function NetflixMovieGrid({ movies, onPlay, onAddToList, onMoreInfo, onMovieSelect }: NetflixMovieGridProps) {
  return (
    <CinematicGrid
      items={movies}
      containerClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3"
      renderBase={(movie) => <BaseCard movie={movie} onPlay={onPlay} />}
      renderPreview={(movie) => (
        <div className="relative w-full h-full">
          <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Button size="icon" className="bg-white text-black hover:bg-gray-200 h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); onPlay(movie.id) }}>
                <Play className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="border-gray-400 text-white hover:bg-white hover:text-black h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); onAddToList(movie.id) }}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="border-gray-400 text-white hover:bg-white hover:text-black h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); onMoreInfo(movie.id) }}>
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="border-gray-400 text-white hover:bg-white hover:text-black h-8 w-8 ml-auto rounded-full" onClick={(e) => { e.stopPropagation(); onMoreInfo(movie.id) }}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-white">
              <h3 className="font-bold text-sm mb-1 line-clamp-1">{movie.title}</h3>
              <div className="flex items-center space-x-2 mb-2">
                <ImdbRating rating={movie.rating} />
                <span className="text-gray-300 text-xs">{movie.year}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {movie.genre.slice(0, 3).map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs bg-gray-700 text-gray-200 px-1 py-0">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    />
  )
}
