"use client"

import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Play, Plus, ThumbsUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Movie {
  id: string
  title: string
  poster: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
}

interface NetflixMovieRowProps {
  title: string
  movies: Movie[]
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
  onMovieSelect: (movie: Movie) => void
}

function NetflixPortraitCard({ movie, onPlay, onAddToList, onMoreInfo, onMovieSelect }: {
  movie: Movie
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
  onMovieSelect: (movie: Movie) => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="group relative flex-none w-[150px] cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPlay(movie.id)}
    >
      {/* Portrait Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
        <img
          src={movie.poster || "/placeholder-movie.jpg"}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {/* Action Buttons */}
              <div className="flex items-center space-x-2 mb-2">
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-gray-200 h-8 w-8 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlay(movie.id)
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/60 text-white hover:bg-white hover:text-black h-8 w-8 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToList(movie.id)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/60 text-white hover:bg-white hover:text-black h-8 w-8 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoreInfo(movie.id)
                  }}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Movie Info */}
              <div className="text-white">
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{movie.title}</h4>
                <div className="flex items-center space-x-2 text-xs text-gray-300">
                  <span>{movie.year}</span>
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">{movie.rating}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function NetflixMovieRow({ title, movies, onPlay, onAddToList, onMoreInfo, onMovieSelect }: NetflixMovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    
    const scrollAmount = 600
    const newScrollLeft = direction === 'left' 
      ? scrollRef.current.scrollLeft - scrollAmount
      : scrollRef.current.scrollLeft + scrollAmount
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  return (
    <div className="group relative mb-8">
      {/* Row Title */}
      <h2 className="text-white text-xl font-semibold mb-4 px-12">
        {title}
      </h2>
      
      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white h-12 w-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        
        {/* Right Arrow */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white h-12 w-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
        
        {/* Movies Scroll Area */}
        <div
          ref={scrollRef}
          className="flex space-x-2 overflow-x-auto scrollbar-hide px-12 pb-4"
          onScroll={handleScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            <NetflixPortraitCard
              key={movie.id}
              movie={movie}
              onPlay={onPlay}
              onAddToList={onAddToList}
              onMoreInfo={onMoreInfo}
              onMovieSelect={onMovieSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
