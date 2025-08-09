"use client"

import { Play, Plus, ThumbsUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import HoverPreviewGrid from "@/components/hover/hover-preview-grid"
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

interface NetflixMovieRowProps {
  title: string
  movies: Movie[]
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
  onMovieSelect: (movie: Movie) => void
}

function BaseTile({ movie, onPlay }: { movie: Movie; onPlay: (movieId: string) => void }) {
  return (
    <div className="group relative flex-none w-[150px] cursor-pointer select-none" onClick={() => onPlay(movie.id)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
  <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
      </div>
    </div>
  )
}

export function NetflixMovieRow({ title, movies, onPlay, onAddToList, onMoreInfo, onMovieSelect }: NetflixMovieRowProps) {
  return (
    <div className="relative mb-10">
      <h2 className="text-white text-xl font-semibold mb-5 px-12">{title}</h2>
      <div className="px-12">
        <HoverPreviewGrid
          items={movies}
          containerClassName="relative grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
          itemWrapperClassName=""
          renderBase={(movie) => (
            <BaseTile movie={movie} onPlay={onPlay} />
          )}
          renderPreview={(movie) => (
            <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-800">
              <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Button size="sm" className="bg-white text-black hover:bg-gray-200 h-8 w-8 p-0 rounded-full" onClick={(e) => { e.stopPropagation(); onPlay(movie.id) }}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/60 text-white hover:bg-white hover:text-black h-8 w-8 p-0 rounded-full" onClick={(e) => { e.stopPropagation(); onAddToList(movie.id) }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/60 text-white hover:bg-white hover:text-black h-8 w-8 p-0 rounded-full" onClick={(e) => { e.stopPropagation(); onMoreInfo(movie.id) }}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-white">
                  <h4 className="font-semibold text-sm mb-1 line-clamp-2">{movie.title}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span>{movie.year}</span>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">{movie.rating}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}
