"use client"

import { useState } from "react"
import { Trash2, Play, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import HoverPreviewGrid from "@/components/hover/hover-preview-grid"
import PosterImage from "@/components/hover/PosterImage"
import { RecentlyPlayedMovie, RecentlyPlayedService } from "@/lib/services/recently-played-service"

interface Movie {
  id: string
  title: string
  poster: string
  year: number
  rating: number
  genre: string[]
  description: string
}

interface RecentlyPlayedRowProps {
  movies: RecentlyPlayedMovie[]
  onPlay: (movieId: string, resumeTime?: number) => void
  onMovieSelect: (movie: Movie) => void
  onMoviesChange: () => void // Callback when movies list changes
}

export function RecentlyPlayedRow({ 
  movies, 
  onPlay, 
  onMovieSelect, 
  onMoviesChange 
}: RecentlyPlayedRowProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleRemoveMovie = (movieId: string) => {
    RecentlyPlayedService.remove(movieId)
    onMoviesChange()
  }

  const handleClearAll = () => {
    if (showClearConfirm) {
      RecentlyPlayedService.clear()
      onMoviesChange()
      setShowClearConfirm(false)
    } else {
      setShowClearConfirm(true)
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowClearConfirm(false), 5000)
    }
  }

  // Don't render if no movies
  if (movies.length === 0) {
    return null
  }

  return (
  <div className="relative group mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-12">
        <h2 className="text-white text-xl font-semibold">
          Recently Played
        </h2>
        
        {/* Clear All Button */}
        <div className="flex items-center space-x-2">
          {showClearConfirm ? (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Clear all history?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearAll}
                className="text-xs"
              >
                Yes, Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearAll}
              className="text-gray-400 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="px-12">
        <HoverPreviewGrid
          items={movies}
          containerClassName="relative grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
          itemWrapperClassName=""
          renderBase={(movie) => {
            const progressPercentage = movie.progress * 100
            const isCompleted = movie.isCompleted
            const resumeTime = RecentlyPlayedService.getResumeTime(movie.id)
            return (
              <div className="group relative flex-none w-[150px] cursor-pointer select-none" onClick={() => onMovieSelect({
                id: movie.id,
                title: movie.title,
                poster: movie.poster,
                year: movie.year || 2024,
                rating: 85,
                genre: movie.genre || ['Movie'],
                description: `Resume watching from ${RecentlyPlayedService.formatTime(movie.currentTime)}`
              })}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
                  <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                  {!isCompleted && progressPercentage > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                      <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">✓ Watched</div>
                  )}
                  {!isCompleted && progressPercentage > 5 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                      <RotateCcw className="h-3 w-3" />
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">{movie.title}</h3>
                  <div className="text-gray-400 text-xs">
                    {movie.year && <span>{movie.year} • </span>}
                    {!isCompleted && progressPercentage > 0 ? (
                      <span>Resume at {RecentlyPlayedService.formatTime(resumeTime)}</span>
                    ) : isCompleted ? (
                      <span>Watched</span>
                    ) : (
                      <span>Recently added</span>
                    )}
                  </div>
                </div>
              </div>
            )
          }}
          renderPreview={(movie) => {
            const progressPercentage = movie.progress * 100
            const isCompleted = movie.isCompleted
            const resumeTime = RecentlyPlayedService.getResumeTime(movie.id)
            return (
              <div className="relative w-full h-full rounded-md overflow-hidden bg-gray-800">
                <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50" />
                {!isCompleted && progressPercentage > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                    <div className="h-full bg-red-600" style={{ width: `${progressPercentage}%` }} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Button size="icon" className="bg-white text-black hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); onPlay(movie.id, isCompleted ? 0 : resumeTime) }}>
                      <Play className="h-4 w-4" />
                    </Button>
                    {!isCompleted && resumeTime > 0 && (
                      <div className="text-white text-xs text-center">
                        Resume from<br />
                        {RecentlyPlayedService.formatTime(resumeTime)}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button size="icon" variant="destructive" className="h-6 w-6 opacity-80 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleRemoveMovie(movie.id) }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          }}
        />
      </div>

      {/* Helper Text */}
      <div className="px-12 mt-2">
        <p className="text-gray-500 text-xs">
          {movies.length} movie{movies.length !== 1 ? 's' : ''} • 
          Hover over any movie to remove it from this list
        </p>
      </div>
    </div>
  )
}
