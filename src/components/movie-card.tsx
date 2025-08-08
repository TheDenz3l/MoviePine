"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Plus, Info } from "lucide-react"
import { ImdbRating } from '@/components/imdb-rating'

interface MovieCardProps {
  movie: {
    id: string
    title: string
    poster: string
    year: number
    rating: number
    genre: string[]
    description: string
  }
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
}

export function MovieCard({ movie, onPlay, onAddToList, onMoreInfo }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className="group relative bg-gray-900 border-gray-800 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPlay(movie.id)}
    >
      <CardContent className="p-0">
        {/* Movie Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={movie.poster || "/placeholder-movie.jpg"}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          
          {/* Hover Overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {/* Buttons positioned at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex space-x-2">
                  <Button
                    size="icon"
                    className="bg-white text-black hover:bg-gray-200 h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlay(movie.id)
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToList(movie.id)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoreInfo(movie.id)
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Movie Info */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs">{movie.year}</span>
            <ImdbRating rating={movie.rating} />
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {movie.genre.slice(0, 2).map((g) => (
              <Badge key={g} variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                {g}
              </Badge>
            ))}
          </div>
          <p className="text-gray-400 text-xs line-clamp-3">
            {movie.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
