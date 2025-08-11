"use client"

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NetflixCard } from './NetflixCard'
import { NetflixCarouselProps } from './types'

export function NetflixCarousel({
  title,
  movies,
  onPlay,
  onAddToList,
  onMoreInfo,
  showMovieTitles = false
}: NetflixCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false })

  const updateScrollState = () => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const canScrollLeft = container.scrollLeft > 0
    const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth
    
    setScrollState({ canScrollLeft, canScrollRight })
  }

  useEffect(() => {
    updateScrollState()
  }, [movies])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const scrollAmount = container.clientWidth * 0.8 // Scroll 80% of visible width
    
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
    
    // Update scroll state after a short delay to account for smooth scrolling
    setTimeout(updateScrollState, 100)
  }

  if (!movies || movies.length === 0) return null

  return (
    <div className="relative mb-1">
      {/* Section Title */}
      <h2 className="text-xl font-semibold text-white/95 mb-2 px-10">
        {title}
      </h2>

      {/* Carousel Container */}
      <div className="relative px-12">
        {/* Left Scroll Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 z-30 
            bg-black/80 hover:bg-black/90 text-white
            w-12 h-12 rounded-full
            transition-opacity duration-200
            ${scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        {/* Right Scroll Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`
            absolute right-0 top-1/2 -translate-y-1/2 z-30
            bg-black/80 hover:bg-black/90 text-white
            w-12 h-12 rounded-full
            transition-opacity duration-200
            ${scrollState.canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        {/* Scrollable Cards Container */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth pb-4 pt-4 pl-2 pr-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          onScroll={updateScrollState}
        >
          {movies.map((movie) => (
            <NetflixCard
              key={movie.id}
              movie={movie}
              onPlay={onPlay}
              onAddToList={onAddToList}
              onMoreInfo={onMoreInfo}
              showTitle={showMovieTitles}
            />
          ))}
        </div>
      </div>

      {/* Custom scrollbar hide styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
