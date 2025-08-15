"use client"

import { Play, ThumbsUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMyList } from '@/components/list/useMyList'
import NetflixCarousel from "@/components/cinematic/NetflixCarousel"
import PosterImage from "@/components/hover/PosterImage"

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

function BaseTile({ movie, onPlay }: { movie: Movie; onPlay: (movieId: string) => void }) {
  return (
    <div className="group relative flex-none w-[150px] cursor-pointer select-none" onClick={() => onPlay(movie.id)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
  <PosterImage src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
      </div>
    </div>
  )
}

export function NetflixMovieRow({ title, movies, onPlay, onAddToList, onMoreInfo, onMovieSelect }: NetflixMovieRowProps) {
  const { watchlist, addWatch, removeWatch } = useMyList()
  const inWatch = (id: string) => !!watchlist?.some(w => w.content_id === id)
  const toggle = (id: string) => {
    if (inWatch(id)) {
      removeWatch(id)
    } else {
      addWatch(id, 'movie')
    }
    onAddToList?.(id)
  }
  return (
    <div className="relative mb-10 px-12">
      <NetflixCarousel
        id={`${title.replace(/\s+/g, '-').toLowerCase()}-rail`}
        title={title}
        items={movies as any}
        onPlay={(id)=>onPlay(id)}
        onAdd={(id)=>toggle(id)}
        isInList={(id)=>inWatch(id)}
        onInfo={(id)=>onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={70}
        prefetchNeighbors
        showMetadata={false}
        showTitle={false}
        actionButtonSize={40}
        frameLift
        frameLiftScale={1.045}
        frameLiftTranslateY={-8}
      />
    </div>
  )
}
