"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { MoviepireMovieCard } from "./moviepire-movie-card"
import { useRef } from "react"

interface Movie {
  id: string
  title: string
  poster?: string
  year?: number
  rating?: number
  genre?: string[]
}

interface MoviepireMovieGridProps {
  title: string
  movies: Movie[]
  onPlay?: (movieId: string) => void
  onAddToList?: (movieId: string) => void
  onMoreInfo?: (movieId: string) => void
  showMovieTitles?: boolean
}

export function MoviepireMovieGrid({ 
  title, 
  movies, 
  onPlay, 
  onAddToList, 
  onMoreInfo,
  showMovieTitles = false 
}: MoviepireMovieGridProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const scrollRight = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollBy({ left: 400, behavior: 'smooth' })
      }
    }
  }

  if (!movies || movies.length === 0) {
    return null
  }

  return (
    <section className="moviepire-section px-4">
      <h2 className="section-title text-2xl font-semibold text-white mb-0">
        {title}
      </h2>
      <div className="relative group">
        <ScrollArea className="w-full whitespace-nowrap" ref={scrollAreaRef}>
          <div className="flex space-x-3 pb-0">
            {movies.map((movie) => (
              <MoviepireMovieCard
                key={movie.id}
                movie={movie}
                onPlay={onPlay}
                onAddToList={onAddToList}
                onMoreInfo={onMoreInfo}
                showTitle={showMovieTitles}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
        
        {/* Scroll Arrow - Only show on hover and when there are enough movies */}
        {movies.length > 6 && (
          <Button
            variant="ghost"
            size="icon"
            className="scroll-arrow absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={scrollRight}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </Button>
        )}
      </div>
    </section>
  )
}
