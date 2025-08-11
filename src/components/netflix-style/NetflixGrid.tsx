"use client"

import { NetflixCarousel } from './NetflixCarousel'
import { NetflixGridProps } from './types'

export function NetflixGrid({
  carousels,
  onPlay,
  onAddToList,
  onMoreInfo
}: NetflixGridProps) {
  if (!carousels || carousels.length === 0) return null

  return (
    <div className="space-y-4 pb-10">
      {carousels.map((carousel, index) => (
        <NetflixCarousel
          key={`${carousel.title}-${index}`}
          title={carousel.title}
          movies={carousel.movies}
          onPlay={onPlay}
          onAddToList={onAddToList}
          onMoreInfo={onMoreInfo}
          showMovieTitles={false}
        />
      ))}
    </div>
  )
}
