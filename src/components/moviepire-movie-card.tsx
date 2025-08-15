"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Info } from "lucide-react"
import Image from "next/image"
import { useState, useCallback } from "react"
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { useMyList } from '@/components/list/useMyList'

interface MoviepireMovieCardProps {
  movie: {
    id: string
    title: string
    poster?: string
    backdrop?: string
    year?: number
    rating?: number
    genre?: string[]
  }
  onPlay?: (movie: MoviepireMovieCardProps['movie']) => void
  onAddToList?: (movie: MoviepireMovieCardProps['movie']) => void
  onMoreInfo?: (movie: MoviepireMovieCardProps['movie']) => void
  showTitle?: boolean
}

export function MoviepireMovieCard({ 
  movie, 
  onPlay, 
  onAddToList, 
  onMoreInfo,
  showTitle = false 
}: MoviepireMovieCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { watchlist, addWatch, removeWatch } = useMyList()

  const isInWatchlist = watchlist.some(w => w.content_id === movie.id)
  
  const handleWatchlistToggle = useCallback(() => {
    if (isInWatchlist) {
      removeWatch(movie.id)
    } else {
      addWatch(movie.id, 'movie')
    }
    // Call the optional callback
    onAddToList?.(movie)
  }, [isInWatchlist, removeWatch, addWatch, movie, onAddToList])

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <Card
      className="moviepire-card relative flex-shrink-0 cursor-pointer group will-change-transform transform-gpu"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPlay && onPlay(movie)}
    >
      <div className="relative">
        {/* Movie Poster */}
        <div className="movie-poster relative bg-gray-800 rounded-lg overflow-hidden">
          {movie.poster && !imageError ? (
            <Image
              src={movie.poster}
              alt={movie.title}
              width={200}
              height={300}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <div className="text-center p-4">
                <div className="text-4xl mb-2">🎬</div>
                <div className="text-sm text-gray-300 font-medium line-clamp-2">
                  {movie.title}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Hover Overlay */}
        <div className={`movie-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-lg transition-opacity duration-300 pointer-events-none ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Buttons positioned at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-auto">
            <div className="flex items-center space-x-2">
              {onPlay && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="overlay-btn-circular h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlay(movie)
                  }}
                >
                  <Play className="w-4 h-4 fill-current" />
                </Button>
              )}
              <div onClick={(e) => e.stopPropagation()}>
                <WatchlistToggleButton
                  inList={isInWatchlist}
                  size={32}
                  variant="overlay"
                  onToggle={handleWatchlistToggle}
                  className="overlay-btn-circular"
                />
              </div>
              {onMoreInfo && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="overlay-btn-circular h-8 w-8 rounded-full"
                  aria-label="More info"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoreInfo(movie)
                  }}
                >
                  <Info className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Movie Title (Optional) */}
      {showTitle && (
        <div className="mt-2 px-1">
          <h3 className="text-sm font-medium text-white line-clamp-2">
            {movie.title}
          </h3>
          {movie.year && (
            <p className="text-xs text-gray-400 mt-1">
              {movie.year}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
