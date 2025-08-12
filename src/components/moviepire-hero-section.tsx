"use client"

import { Button } from "@/components/ui/button"
import { Play, Info } from "lucide-react"
import { ImdbRating } from '@/components/imdb-rating'

interface MoviepireHeroSectionProps {
  movie: {
    id: string
    title: string
    description?: string
    backdrop?: string
    poster?: string
    year?: number
    rating?: number
    genre?: string[]
  }
  onPlay: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
}

export function MoviepireHeroSection({ movie, onPlay, onMoreInfo }: MoviepireHeroSectionProps) {
  return (
    <div
      className="relative h-screen overflow-hidden animate-fade-in bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
      }}
    >
      {/* Gradient Overlays - Netflix style */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
      {/* Bottom gradient height reduced to reveal more backdrop while retaining legibility */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/70 via-black/40 to-transparent" />

      {/* Content - Netflix positioning */}
      <div className="relative z-10 flex items-center h-full px-4 sm:px-8 lg:px-16 pt-24">
        <div className="max-w-2xl">
          {/* Netflix-style Film Badge */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-600 flex items-center justify-center text-white font-bold text-xs">
                N
              </div>
              <span className="text-gray-300 text-sm font-medium tracking-wider">ФИЛЬМ</span>
            </div>
          </div>

          {/* Movie Title - Netflix style */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-none">
            {movie.title}
          </h1>

          {/* Netflix-style description */}
          <div className="mb-6 max-w-lg">
            {movie.description && (
              <p className="text-lg text-white leading-relaxed line-clamp-3 mb-4">
                {movie.description}
              </p>
            )}
            <div className="flex items-center space-x-4 text-white">
              {movie.rating && <ImdbRating rating={movie.rating} size="md" />}
              {movie.year && <span className="text-gray-300 text-sm">{movie.year}</span>}
              {movie.genre && movie.genre.slice(0, 3).map(g => (
                <span key={g} className="text-gray-300 text-sm">{g}</span>
              ))}
            </div>
          </div>

          {/* Action Buttons - Netflix style */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => onPlay(movie.id)}
              className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg font-semibold flex items-center space-x-3 rounded-md"
              size="lg"
            >
              <Play className="h-6 w-6 fill-current" />
              <span>Watch</span>
            </Button>

            <Button
              onClick={() => onMoreInfo(movie.id)}
              variant="outline"
              className="bg-gray-600/70 border-0 text-white hover:bg-gray-500/70 px-8 py-3 text-lg font-semibold flex items-center space-x-3 rounded-md"
              size="lg"
            >
              <Info className="h-6 w-6" />
              <span>More details</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
