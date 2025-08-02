"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Info, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"

interface HeroSectionProps {
  featuredMovie: {
    id: string
    title: string
    description: string
    backdrop: string
    year: number
    rating: number
    genre: string[]
  }
  onPlay: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
}

export function HeroSection({ featuredMovie, onPlay, onMoreInfo }: HeroSectionProps) {
  const [isMuted, setIsMuted] = useState(true)

  return (
    <section className="relative h-screen flex items-center justify-start">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={featuredMovie.backdrop || "/placeholder-backdrop.jpg"}
          alt={featuredMovie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 max-w-2xl">
        <div className="space-y-4">
          {/* Title */}
          <h1 className="text-white text-4xl md:text-6xl font-bold leading-tight">
            {featuredMovie.title}
          </h1>

          {/* Movie Info */}
          <div className="flex items-center space-x-4 text-white">
            <span className="text-green-500 font-semibold">{featuredMovie.rating}% Match</span>
            <span>{featuredMovie.year}</span>
            <div className="flex space-x-2">
              {featuredMovie.genre.slice(0, 3).map((genre) => (
                <Badge key={genre} variant="outline" className="border-white text-white">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="text-white text-lg leading-relaxed max-w-xl">
            {featuredMovie.description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 pt-4">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-200 font-semibold"
              onClick={() => onPlay(featuredMovie.id)}
            >
              <Play className="mr-2 h-5 w-5" />
              Play
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-black"
              onClick={() => onMoreInfo(featuredMovie.id)}
            >
              <Info className="mr-2 h-5 w-5" />
              More Info
            </Button>
          </div>
        </div>
      </div>

      {/* Audio Control */}
      <div className="absolute bottom-24 right-8 z-10">
        <Button
          size="icon"
          variant="outline"
          className="border-white text-white hover:bg-white hover:text-black rounded-full"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>
    </section>
  )
}
