"use client"

import { Play, Plus } from 'lucide-react'
import { NetflixCardProps } from './types'

export function NetflixCard({ 
  movie, 
  onPlay, 
  onAddToList, 
  onMoreInfo, 
  showTitle = false 
}: NetflixCardProps) {
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPlay?.(movie)
  }

  const handleAddToList = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToList?.(movie)
  }

  const handleMoreInfo = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMoreInfo?.(movie)
  }

  return (
    <div 
      className="relative flex-shrink-0 cursor-pointer outline-none group"
      tabIndex={0}
      aria-label={`Open details for ${movie.title}`}
      onClick={handleMoreInfo}
      onKeyDown={(e) => { 
        if (e.key === 'Enter' || e.key === ' ') { 
          e.preventDefault()
          handleMoreInfo(e as any)
        } 
      }}
    >
      {/* Card Container */}
      <div className="relative w-48 aspect-[2/3] rounded-md overflow-hidden bg-zinc-900/60 shadow-sm focus-visible:ring-2 focus-visible:ring-white/40 transform-gpu transition-all duration-300 will-change-transform hover:scale-[1.02] hover:z-10 hover:-translate-y-0.5 origin-bottom">
        {/* Poster Image */}
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover select-none will-change-transform"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-zinc-700 flex items-center justify-center p-2">
            <span className="text-gray-300 text-[11px] text-center leading-tight line-clamp-3">{movie.title}</span>
          </div>
        )}
        
        {/* Hover Overlay with Circular Buttons */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-2">
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true">
            <button 
              type="button" 
              onClick={handlePlay} 
              className="pointer-events-auto h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
            >
              <Play className="h-5 w-5" />
            </button>
            <button 
              type="button" 
              onClick={handleAddToList} 
              className="pointer-events-auto h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button 
              type="button" 
              onClick={handleMoreInfo} 
              className="pointer-events-auto h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              i
            </button>
          </div>
        </div>
      </div>
      
      {/* Optional Title Below Card */}
      {showTitle && (
        <div className="mt-2 px-1">
          <h4 className="text-sm font-medium text-white/90 line-clamp-2 leading-tight">
            {movie.title}
          </h4>
          {movie.year && (
            <p className="text-xs text-white/60 mt-1">{movie.year}</p>
          )}
        </div>
      )}
    </div>
  )
}
