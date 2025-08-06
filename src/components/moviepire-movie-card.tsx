"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Plus, Info } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

interface MoviepireMovieCardProps {
  movie: {
    id: string
    title: string
    poster?: string
    year?: number
    rating?: number
    genre?: string[]
  }
  onPlay?: (movieId: string) => void
  onAddToList?: (movieId: string) => void
  onMoreInfo?: (movieId: string) => void
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

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <Card 
      className="moviepire-card relative flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        <div className={`movie-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-lg transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Buttons positioned at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center space-x-2">
              {onPlay && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="overlay-btn-circular h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlay(movie.id)
                  }}
                >
                  <Play className="w-4 h-4 fill-current" />
                </Button>
              )}
              {onAddToList && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="overlay-btn-circular h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToList(movie.id)
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              {onMoreInfo && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="overlay-btn-circular h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoreInfo(movie.id)
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
