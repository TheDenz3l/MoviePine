"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Info } from "lucide-react"
import { useMyList } from '@/components/list/useMyList'
import { ImdbRating } from '@/components/imdb-rating'
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'

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
  const { watchlist, addWatch, removeWatch } = useMyList()
  const inWatch = !!watchlist?.some(w=>w.content_id===movie.id)
  const toggle = () => { inWatch ? removeWatch(movie.id) : addWatch(movie.id,'movie'); onAddToList(movie.id) }
  return (
    <Card
      className="group relative bg-gray-900 border-gray-800 cursor-pointer will-change-transform transform-gpu"
      onClick={() => onPlay(movie.id)}
    >
      <CardContent className="p-0">
        {/* Poster & Hover content inside a scaling wrapper to avoid layout shift */}
        <div className="relative aspect-[2/3] overflow-visible">
          <div className="absolute inset-0 rounded-md bg-gray-800 overflow-hidden transition-transform duration-300 ease-out will-change-transform transform-gpu group-hover:scale-[1.08] group-hover:-translate-y-0.5 group-hover:z-20 shadow-none group-hover:shadow-2xl">
            <img
              src={movie.poster || "/placeholder-movie.jpg"}
              alt={movie.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Persistent overlay; only fade opacity to prevent mount/unmount flicker */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="flex space-x-2 pointer-events-auto">
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
                <div className="h-8 w-8" onClick={(e)=>e.stopPropagation()}>
                  <WatchlistToggleButton inList={inWatch} size={32} variant="overlay" onToggle={toggle} />
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-white/70 text-white hover:bg-white hover:text-black h-8 w-8 rounded-full"
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
