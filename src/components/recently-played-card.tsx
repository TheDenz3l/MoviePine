"use client"

import { useState } from "react"
import { Play, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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

interface RecentlyPlayedCardProps {
  movie: RecentlyPlayedMovie
  onPlay: (movieId: string, resumeTime?: number) => void
  onRemove: (movieId: string) => void
  onMovieSelect: (movie: Movie) => void
}

export function RecentlyPlayedCard({ 
  movie, 
  onPlay, 
  onRemove, 
  onMovieSelect 
}: RecentlyPlayedCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const progressPercentage = movie.progress * 100
  const isCompleted = movie.isCompleted
  const resumeTime = RecentlyPlayedService.getResumeTime(movie.id)

  const handleCardClick = () => {
    // Transform recently played movie to regular movie format for modal
    const transformedMovie: Movie = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster,
      year: movie.year || 2024,
      rating: 85, // Default rating since we don't store this
      genre: movie.genre || ['Movie'],
      description: `Resume watching from ${RecentlyPlayedService.formatTime(movie.currentTime)}`
    }
    onMovieSelect(transformedMovie)
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCompleted) {
      // Start from beginning for completed movies
      onPlay(movie.id, 0)
    } else {
      // Resume from saved position
      onPlay(movie.id, resumeTime)
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showRemoveConfirm) {
      onRemove(movie.id)
      setShowRemoveConfirm(false)
    } else {
      setShowRemoveConfirm(true)
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowRemoveConfirm(false), 3000)
    }
  }

  const handleCancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowRemoveConfirm(false)
  }

  return (
    <div 
      className="group relative flex-none w-[150px] cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowRemoveConfirm(false)
      }}
      onClick={handleCardClick}
    >
      {/* Portrait Poster with inner scaling wrapper */}
      <div className="relative aspect-[2/3] overflow-visible">
        <div className="absolute inset-0 rounded-md bg-gray-800 overflow-hidden transition-transform duration-300 ease-out will-change-transform transform-gpu group-hover:scale-[1.08]">
          <img
            src={movie.poster || "/placeholder-movie.jpg"}
            alt={movie.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Badges & progress remain inside scaling wrapper */}
          {!isCompleted && progressPercentage > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
              <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
          {isCompleted && (
            <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
              ✓ Watched
            </div>
          )}
          {!isCompleted && progressPercentage > 5 && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
              <RotateCcw className="h-3 w-3" />
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          )}
          {/* Persistent overlay & action layer */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60">
            <div className="flex flex-col items-center space-y-2">
              <Button
                size="icon"
                className="bg-white text-black hover:bg-gray-200"
                onClick={handlePlayClick}
              >
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
              {showRemoveConfirm ? (
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs h-6 px-2"
                    onClick={handleRemoveClick}
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-6 px-2 bg-white text-black"
                    onClick={handleCancelRemove}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-6 w-6 opacity-80 hover:opacity-100"
                  onClick={handleRemoveClick}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Movie Info */}
      <div className="mt-2">
        <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
          {movie.title}
        </h3>
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
}
