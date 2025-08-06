"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecentlyPlayedCard } from "./recently-played-card"
import { RecentlyPlayedMovie, RecentlyPlayedService } from "@/lib/services/recently-played-service"

interface Movie {
  id: string
  title: string
  poster: string
  year: number
  rating: number
  genre: string[]
  description: string
}

interface RecentlyPlayedRowProps {
  movies: RecentlyPlayedMovie[]
  onPlay: (movieId: string, resumeTime?: number) => void
  onMovieSelect: (movie: Movie) => void
  onMoviesChange: () => void // Callback when movies list changes
}

export function RecentlyPlayedRow({ 
  movies, 
  onPlay, 
  onMovieSelect, 
  onMoviesChange 
}: RecentlyPlayedRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

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
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }

  const handleRemoveMovie = (movieId: string) => {
    RecentlyPlayedService.remove(movieId)
    onMoviesChange()
  }

  const handleClearAll = () => {
    if (showClearConfirm) {
      RecentlyPlayedService.clear()
      onMoviesChange()
      setShowClearConfirm(false)
    } else {
      setShowClearConfirm(true)
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowClearConfirm(false), 5000)
    }
  }

  useEffect(() => {
    handleScroll()
  }, [movies])

  // Don't render if no movies
  if (movies.length === 0) {
    return null
  }

  return (
    <div className="relative group mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-12">
        <h2 className="text-white text-xl font-semibold">
          Recently Played
        </h2>
        
        {/* Clear All Button */}
        <div className="flex items-center space-x-2">
          {showClearConfirm ? (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Clear all history?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearAll}
                className="text-xs"
              >
                Yes, Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearAll}
              className="text-gray-400 hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
            <RecentlyPlayedCard
              key={movie.id}
              movie={movie}
              onPlay={onPlay}
              onRemove={handleRemoveMovie}
              onMovieSelect={onMovieSelect}
            />
          ))}
        </div>
      </div>

      {/* Helper Text */}
      <div className="px-12 mt-2">
        <p className="text-gray-500 text-xs">
          {movies.length} movie{movies.length !== 1 ? 's' : ''} • 
          Hover over any movie to remove it from this list
        </p>
      </div>
    </div>
  )
}
