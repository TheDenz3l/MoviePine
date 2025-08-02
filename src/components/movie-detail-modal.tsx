"use client"

import { useState, useEffect } from "react"
import { X, Play, Plus, ThumbsUp, ThumbsDown, Share, Star, Clock, Calendar, Award, Volume2, VolumeX, Info } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

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

interface MovieDetailModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
}

export function MovieDetailModal({ movie, isOpen, onClose, onPlay, onAddToList }: MovieDetailModalProps) {
  const [isLiked, setIsLiked] = useState<boolean | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isInWatchlist, setIsInWatchlist] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!movie) return null

  const matchPercentage = Math.floor(movie.rating * 10) + Math.floor(Math.random() * 20)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[90vw] !max-w-[850px] !max-h-[90vh] bg-zinc-900 text-white border-0 p-0 overflow-hidden rounded-lg">
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>
        <DialogDescription className="sr-only">Movie details for {movie.title}</DialogDescription>
        
        {/* Compact Hero Section */}
        <div className="relative h-[40vh] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-transparent to-zinc-900/40" />
          </div>

          {/* Top Controls */}
          <div className="absolute top-4 right-4 z-30 flex space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-colors border border-white/20"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-colors border border-white/20"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Compact Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white drop-shadow-2xl">
              {movie.title}
            </h1>

            {/* Compact Metadata Row */}
            <div className="flex items-center space-x-4 mb-4 text-sm">
              <span className="text-green-500 font-semibold">{matchPercentage}% Match</span>
              <span className="text-white">{movie.year}</span>
              <div className="border border-gray-400 px-2 py-0.5 text-gray-300 text-xs">HD</div>
              {movie.runtime && (
                <span className="text-gray-300">
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-white text-xs">{movie.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => onPlay(movie.id)}
                className="bg-white text-black hover:bg-gray-200 px-6 py-2 text-sm font-semibold flex items-center space-x-2 rounded-sm"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play</span>
              </Button>
              
              <Button
                onClick={() => setIsInWatchlist(!isInWatchlist)}
                variant="outline"
                className={`border-2 border-gray-400 px-6 py-2 text-sm font-semibold flex items-center space-x-2 rounded-sm transition-colors ${
                  isInWatchlist 
                    ? 'bg-gray-400 text-black hover:bg-gray-300' 
                    : 'text-white hover:bg-gray-400 hover:text-black'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>My List</span>
              </Button>

              <Button
                onClick={() => setIsLiked(isLiked === true ? null : true)}
                variant="outline"
                size="icon"
                className={`border-2 border-gray-400 w-9 h-9 rounded-full transition-colors ${
                  isLiked === true 
                    ? 'bg-gray-400 text-black hover:bg-gray-300' 
                    : 'text-white hover:bg-gray-400 hover:text-black'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => setIsLiked(isLiked === false ? null : false)}
                variant="outline"
                size="icon"
                className={`border-2 border-gray-400 w-9 h-9 rounded-full transition-colors ${
                  isLiked === false 
                    ? 'bg-gray-400 text-black hover:bg-gray-300' 
                    : 'text-white hover:bg-gray-400 hover:text-black'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Content Section */}
        <div className="p-6 space-y-4">
          {/* Description and Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Description */}
            <div className="lg:col-span-2 space-y-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {movie.description}
              </p>
              
              {/* Genres */}
              <div className="flex flex-wrap gap-1">
                {movie.genre.map((genre) => (
                  <Badge key={genre} variant="secondary" className="bg-gray-800 text-gray-300 text-xs px-2 py-1">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Compact Info Sidebar */}
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400">Cast: </span>
                <span className="text-white">Jay Baruchel, America Ferrera, Christopher Mintz-Plasse</span>
              </div>
              <div>
                <span className="text-gray-400">Genres: </span>
                <span className="text-white">{movie.genre.slice(0, 3).join(', ')}</span>
              </div>
              <div>
                <span className="text-gray-400">This movie is: </span>
                <span className="text-white">Exciting, Heartwarming, Family-friendly</span>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Compact More Like This */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">More Like This</h3>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-video bg-gray-800 rounded-md overflow-hidden mb-2 group-hover:scale-105 transition-transform duration-200">
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <h4 className="text-white font-medium text-sm mb-1">Similar Movie {i}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span>2023</span>
                    <span>•</span>
                    <span>1h 45m</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>8.2</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
