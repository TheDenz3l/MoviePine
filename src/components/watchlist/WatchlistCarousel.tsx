"use client"
import { useMemo } from 'react'
import ModernNetflixGrid from '@/components/cinematic/ModernNetflixGrid'
import { ListItem } from '@/components/list/useMyList'

interface WatchlistCarouselProps {
  items: ListItem[]
  title: string
  onPlay?: (id: string) => void
  onRemove?: (id: string) => void
  onInfo?: (id: string) => void
  className?: string
  showEmpty?: boolean
  emptyMessage?: string
}

export function WatchlistCarousel({
  items,
  title,
  onPlay,
  onRemove,
  onInfo,
  className = '',
  showEmpty = true,
  emptyMessage = 'No items in this section'
}: WatchlistCarouselProps) {
  
  // Transform watchlist items to grid format
  const gridItems = useMemo(() => {
    return items.map(item => ({
      id: item.content_id,
      title: item.title || `${item.content_type.charAt(0).toUpperCase()}${item.content_type.slice(1)} ${item.content_id}`,
      poster: item.poster || '',
      backdrop: item.poster || '',
      year: item.year,
      rating: item.rating,
      genre: [item.content_type === 'movie' ? 'Movie' : 'TV Show'],
      // Add metadata for sorting/filtering
      addedAt: item.added_at,
      contentType: item.content_type
    }))
  }, [items])

  if (!items.length && !showEmpty) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </h2>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">{emptyMessage}</div>
        </div>
      ) : (
        <div className="h-[400px] overflow-hidden">
          <ModernNetflixGrid
            items={gridItems}
            onPlay={onPlay}
            onAdd={onRemove} // This will remove since items are already in watchlist
            onInfo={onInfo}
            className="h-full"
            minCardWidth={150}
            aspectRatio={2/3}
            gap={12}
            activationDelayMs={100}
            retainDelayMs={120}
            enlarge={1.15}
            lift={20}
            transitionMs={200}
            overscanRows={1}
          />
        </div>
      )}
    </div>
  )
}

export default WatchlistCarousel
