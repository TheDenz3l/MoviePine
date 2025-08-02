"use client"

import { Play, Info, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
}

interface NetflixHeroSectionProps {
  movie: Movie
  onPlay: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
}

export function NetflixHeroSection({ movie, onPlay, onMoreInfo }: NetflixHeroSectionProps) {
  const [isMuted, setIsMuted] = useState(true)

  if (!movie) return null

  return (
    <div
      className="relative h-screen overflow-hidden animate-fade-in bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
      }}
    >
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex items-end h-full px-4 sm:px-8 lg:px-16 pt-20 pb-8 sm:pb-16">
        <div className="max-w-2xl">
          {/* MoviePine Series Badge */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-red-600 flex items-center justify-center text-white font-bold text-xs">
                M
              </div>
              <span className="text-gray-300 text-sm font-medium">SERIES</span>
            </div>
          </div>

          {/* Movie Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight">
            <span className="line-clamp-2">{movie.title}</span>
          </h1>

          {/* Movie Metadata */}
          <div className="flex items-center space-x-4 mb-6 min-h-[2rem]">
            <div className="flex items-center space-x-1">
              <div className="bg-yellow-500 text-black px-2 py-1 rounded text-sm font-bold">
                IMDb
              </div>
              <span className="text-white font-semibold">{movie.rating.toFixed(1)}</span>
            </div>
            <span className="text-gray-300">{movie.year}</span>
            <span className="text-gray-300">
              {movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : ''}
            </span>
            <div className="border border-gray-400 px-2 py-1 text-gray-300 text-xs">
              HD
            </div>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-6 min-h-[2.5rem]">
            {movie.genre.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="border-gray-400 text-gray-300 bg-transparent">
                {genre}
              </Badge>
            ))}
          </div>

          {/* Description */}
          <div className="mb-8 min-h-[4.5rem]">
            <p className="text-lg text-gray-200 max-w-xl leading-relaxed line-clamp-3">
              {movie.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 min-h-[3rem]">
            <Button
              onClick={() => onPlay(movie.id)}
              className="bg-white text-black hover:bg-gray-200 px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-semibold flex items-center space-x-2"
              size="lg"
            >
              <Play className="h-4 sm:h-5 w-4 sm:w-5 fill-current" />
              <span>Play</span>
            </Button>

            <Button
              onClick={() => onMoreInfo(movie.id)}
              variant="outline"
              className="border-gray-400 text-white hover:bg-white hover:text-black px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-semibold flex items-center space-x-2"
              size="lg"
            >
              <Info className="h-4 sm:h-5 w-4 sm:w-5" />
              <span>More Info</span>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-gray-400 text-sm">
            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold mr-2">
              2K+ Streams
            </span>
            <span>Trending now</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="absolute bottom-16 right-8 lg:right-16">
          <Button
            variant="outline"
            size="icon"
            className="border-gray-400 text-white hover:bg-white hover:text-black rounded-full"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
