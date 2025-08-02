"use client"

import { MovieCard } from "./movie-card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Movie {
  id: string
  title: string
  poster: string
  year: number
  rating: number
  genre: string[]
  description: string
}

interface MovieGridProps {
  title: string
  movies: Movie[]
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
}

export function MovieGrid({ title, movies, onPlay, onAddToList, onMoreInfo }: MovieGridProps) {
  return (
    <section className="mb-8">
      <h2 className="text-white text-xl font-semibold mb-4 px-4">
        {title}
      </h2>
      <ScrollArea className="w-full">
        <div className="flex space-x-4 px-4 pb-4">
          {movies.map((movie) => (
            <div key={movie.id} className="flex-none w-48">
              <MovieCard
                movie={movie}
                onPlay={onPlay}
                onAddToList={onAddToList}
                onMoreInfo={onMoreInfo}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  )
}
