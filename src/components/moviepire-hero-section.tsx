"use client"

import { Button } from "@/components/ui/button"
import { Play, Info } from "lucide-react"

interface MoviepireHeroSectionProps {
  movie: {
    id: string
    title: string
    description?: string
    backdrop?: string
    year?: number
    rating?: number
    genre?: string[]
  }
  onPlay: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
}

export function MoviepireHeroSection({ movie, onPlay, onMoreInfo }: MoviepireHeroSectionProps) {
  return (
    <section
      className="hero-section relative min-h-[70vh] flex items-start pt-20"
      style={{
        backgroundImage: movie.backdrop ? `url("${movie.backdrop}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: '50% 50%',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for text readability - exactly like moviepire.net */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom gradient fade for smooth transition to content sections - Netflix style */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[rgb(18,18,18)] via-[rgba(18,18,18,0.9)] via-[rgba(18,18,18,0.7)] via-[rgba(18,18,18,0.4)] to-transparent z-5" />

      <div className="relative z-10 w-full px-8 md:px-16">
        <div className="hero-content space-y-6 max-w-2xl">
          <h1 className="hero-title text-5xl font-bold text-white leading-tight">
            {movie.title}
          </h1>

          {movie.description && (
            <p className="hero-description text-lg text-gray-300 line-clamp-3">
              {movie.description}
            </p>
          )}

          {/* Movie Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {movie.year && <span>{movie.year}</span>}
            {movie.rating && (
              <span className="flex items-center">
                ⭐ {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.genre && movie.genre.length > 0 && (
              <span>{movie.genre.slice(0, 3).join(', ')}</span>
            )}
          </div>

          <div className="hero-actions flex space-x-4">
            <Button
              className="moviepire-btn-play"
              size="lg"
              onClick={() => onPlay(movie.id)}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              Play
            </Button>
            <Button
              variant="secondary"
              className="moviepire-btn-info"
              size="lg"
              onClick={() => onMoreInfo(movie.id)}
            >
              <Info className="w-5 h-5 mr-2" />
              More Info
            </Button>
          </div>

          <p className="hero-notice text-sm text-gray-400">
            If the movies aren't working, try turning off your VPN.
            You don't need a VPN to access this site, so feel free to ignore any messages suggesting otherwise.
          </p>
        </div>
      </div>
    </section>
  )
}
