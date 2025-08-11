"use client"

import { Button } from "@/components/ui/button"
import { Play, Plus, Info, ChevronRight } from "lucide-react"
import CinematicRail from "@/components/cinematic/CinematicRail"
import PosterImage from "@/components/hover/PosterImage"

interface Movie {
  id: string
  title: string
  poster?: string
  backdrop?: string
  year?: number
  rating?: number
  genre?: string[]
}

interface MoviepireMovieGridProps {
  title: string
  movies: Movie[]
  onPlay?: (movie: Movie) => void
  onAddToList?: (movie: Movie) => void
  onMoreInfo?: (movie: Movie) => void
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
  if (!movies || movies.length === 0) return null

  return (
    <div className="px-4">
      <CinematicRail
        id={title.replace(/\s+/g, '-').toLowerCase() + '-rail'}
        title={title}
        items={movies as any}
        onPlay={(id)=>{ const m = movies.find(x=>x.id===id); if(m) onPlay?.(m) }}
        onAdd={(id)=>{ const m = movies.find(x=>x.id===id); if(m) onAddToList?.(m) }}
        onInfo={(id)=>{ const m = movies.find(x=>x.id===id); if(m) onMoreInfo?.(m) }}
        renderMeta={(m: any)=> (
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold leading-tight line-clamp-2">{m.title}</h4>
            <div className="flex items-center gap-2 text-[10px] text-white/70">
              {m.year && <span>{m.year}</span>}
              {m.rating && <span className="text-green-500">{m.rating}%</span>}
            </div>
          </div>
        )}
        config={{ preview: { activationDelay: 50, animationMs: 0, enlarge: 1.14, elevation: 22, dimOpacity: 0.72 } }}
      />
    </div>
  )
}
