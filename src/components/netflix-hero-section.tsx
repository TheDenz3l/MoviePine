"use client"

import { Play, Info, Volume2, VolumeX } from "lucide-react"
import { ImdbRating } from '@/components/imdb-rating'
import { useState } from "react"
import { Button } from "@/components/ui/button"

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
  onPlay: (movieId: string, title?: string) => void
  onMoreInfo: (movieId: string) => void
  onSearchResultSelect?: (result: { id: string; title: string; year: number; poster: string; type: 'movie' | 'tv' }) => void
  onNavigateToSearch?: (query: string) => void
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
            <p className="text-lg text-white leading-relaxed line-clamp-3 mb-4">
              {movie.description}
            </p>
            <div className="flex items-center space-x-4 text-white">
              <ImdbRating rating={movie.rating} size="md" />
              <span className="text-gray-300 text-sm">{movie.year}</span>
              {movie.genre.slice(0, 3).map(g => (
                <span key={g} className="text-gray-300 text-sm">{g}</span>
              ))}
            </div>
          </div>

          {/* Action Buttons - Netflix style */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => onPlay(movie.id, movie.title)}
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

        {/* Age Rating - Netflix style */}
        <div className="absolute bottom-24 right-8 lg:right-16">
          <div className="border-2 border-gray-400 px-3 py-1 text-gray-300 text-lg font-bold">
            13+
          </div>
        </div>

        {/* Volume Control */}
        <div className="absolute bottom-24 right-24 lg:right-32">
          <Button
            variant="outline"
            size="icon"
            className="border-2 border-gray-400 text-white hover:bg-white hover:text-black rounded-full w-12 h-12"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
