"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import PosterImage from '@/components/hover/PosterImage'
import { Play, Info } from 'lucide-react'
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { useWatchlistActions } from '@/components/list/useWatchlistActions'
import clsx from 'clsx'

export interface MoviepireGridItem {
  id: string
  title: string
  poster?: string
  year?: number
  rating?: number
  backdrop?: string
}

export interface MoviepireGridProps<T extends MoviepireGridItem> {
  items: T[]
  className?: string
  minCardWidth?: number
  gap?: number
  onPlay?: (id: string)=>void
  onAdd?: (id: string)=>void
  onInfo?: (id: string)=>void
  /** Triggered when scroll nears the bottom (for infinite loading) */
  onEndReached?: () => void
  /** Distance in px from bottom to fire onEndReached */
  endReachedOffset?: number
  /** Disable entrance & hover animations (prefers-reduced-motion fallback) */
  disableAnimations?: boolean
  /** Stagger batch size before resetting delay sequence */
  staggerBatch?: number
  /** When true, use animation & styling tokens approximating live browse page */
  browseReplication?: boolean
  /** Delay before activating hover state (ms) to reduce flicker */
  intentDelayMs?: number
  /** Enable arrow-key navigation & Enter/Space actions */
  enableKeyboardNav?: boolean
  /** Prefetch adjacent poster images on hover focus */
  prefetchNeighbors?: boolean
  /** Show small metadata line (year • rating) under title */
  showMetadata?: boolean
}

/**
 * MoviepireGrid
 * A self‑contained responsive poster grid intentionally styled to emulate
 * the public moviepire.net browse grid feel (clean tight poster wall with
 * subtle hover elevation + quick action buttons). No external layout touched.
 *
 * Notes:
 * - We DO NOT copy any proprietary source; this is an original implementation
 *   built from visual observation only.
 * - Pure CSS grid with auto‑fill responsive columns.
 * - Minimal transitions to avoid hover flicker.
 */
export function MoviepireGrid<T extends MoviepireGridItem>({
  items,
  className = '',
  minCardWidth = 150,
  gap = 12,
  onPlay,
  onAdd,
  onInfo,
  onEndReached,
  endReachedOffset = 600,
  disableAnimations = false,
  staggerBatch = 24,
  browseReplication = false,
  intentDelayMs = 80,
  enableKeyboardNav = true,
  prefetchNeighbors = true,
  showMetadata = true,
}: MoviepireGridProps<T>) {
  const { isInWatchlist, toggleWatchlist } = useWatchlistActions()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [visible, setVisible] = useState<Set<string>>(()=>new Set())
  const [hasFiredEnd, setHasFiredEnd] = useState(false)
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null)
  const hoverTimers = useRef<Record<string, number>>({})
  const colsRef = useRef<number>(0)

  // Entrance intersection tracking
  useEffect(()=>{
    if (disableAnimations) return
    observerRef.current = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        const id = entry.target.getAttribute('data-mid')
        if (id && entry.isIntersecting) {
          setVisible(prev => {
            if (prev.has(id)) return prev
            const next = new Set(prev); next.add(id); return next
          })
          observerRef.current?.unobserve(entry.target)
        }
      })
    }, { root: containerRef.current, threshold: 0.15 })
    const nodes = containerRef.current?.querySelectorAll('[data-mid]') || []
    nodes.forEach(n=>observerRef.current?.observe(n))
    return () => observerRef.current?.disconnect()
  }, [items, disableAnimations])

  // Infinite scroll detection
  const handleScroll = useCallback(()=>{
    if (!onEndReached || hasFiredEnd) return
    const el = containerRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < endReachedOffset) {
      setHasFiredEnd(true)
      onEndReached()
      // reset after slight delay to allow subsequent loads
      setTimeout(()=>setHasFiredEnd(false), 1200)
    }
  }, [onEndReached, hasFiredEnd, endReachedOffset])

  useEffect(()=>{
    if (!onEndReached) return
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return ()=> el.removeEventListener('scroll', handleScroll)
  }, [handleScroll, onEndReached])

  // Compute column count for keyboard navigation (approx based on element top offsets)
  const computeColumns = useCallback(()=>{
    if (!enableKeyboardNav) return
    const nodes = containerRef.current?.querySelectorAll<HTMLDivElement>('[data-mid]')
    if (!nodes || nodes.length === 0) return
    const firstTop = nodes[0].offsetTop
    let count = 0
    for (let i=0;i<nodes.length;i++) {
      if (nodes[i].offsetTop !== firstTop) break
      count++
    }
    if (count > 0) colsRef.current = count
  }, [enableKeyboardNav])

  useEffect(()=>{
    computeColumns()
    const handleResize = () => computeColumns()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [items, computeColumns])

  // Keyboard navigation handler (roving focus)
  useEffect(()=>{
    if (!enableKeyboardNav) return
    const el = containerRef.current
    if (!el) return
    const handler = (e: KeyboardEvent)=>{
      const target = e.target as HTMLElement
      if (!target || !el.contains(target) || !target.hasAttribute('data-mid')) return
      const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-mid]'))
      const index = nodes.indexOf(target)
      if (index === -1) return
      const cols = colsRef.current || 1
      let nextIndex: number | null = null
      switch (e.key) {
        case 'ArrowRight': nextIndex = index + 1 < nodes.length ? index + 1 : null; break
        case 'ArrowLeft': nextIndex = index - 1 >= 0 ? index - 1 : null; break
        case 'ArrowDown': nextIndex = index + cols < nodes.length ? index + cols : null; break
        case 'ArrowUp': nextIndex = index - cols >= 0 ? index - cols : null; break
        case 'Enter': case ' ': { // activate primary action (Play)
          const id = target.getAttribute('data-mid')
          if (id) {
            onPlay?.(id)
            e.preventDefault()
          }
          return
        }
      }
      if (nextIndex != null) {
        e.preventDefault()
        const next = nodes[nextIndex]
        next?.focus()
      }
    }
    el.addEventListener('keydown', handler)
    return ()=> el.removeEventListener('keydown', handler)
  }, [enableKeyboardNav, onPlay])

  // Prefetch helper
  const prefetchImage = useCallback((url?: string)=>{
    if (!prefetchNeighbors || !url) return
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  }, [prefetchNeighbors])

  const scheduleHover = useCallback((id: string, index: number)=>{
    // Clear any existing timer for this id
    const existing = hoverTimers.current[id]
    if (existing) window.clearTimeout(existing)
    hoverTimers.current[id] = window.setTimeout(()=>{
      setActiveHoverId(id)
      // Prefetch neighbor posters
      if (prefetchNeighbors) {
        const prev = items[index - 1]
        const next = items[index + 1]
        prefetchImage(prev?.poster || prev?.backdrop)
        prefetchImage(next?.poster || next?.backdrop)
      }
    }, intentDelayMs)
  }, [intentDelayMs, items, prefetchNeighbors, prefetchImage])

  const clearHover = useCallback((id: string)=>{
    const t = hoverTimers.current[id]
    if (t) window.clearTimeout(t)
    delete hoverTimers.current[id]
    if (activeHoverId === id) setActiveHoverId(null)
  }, [activeHoverId])

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const animate = !disableAnimations && !reduceMotion

  return (
    <div
      ref={containerRef}
      className={clsx('moviepire-grid relative w-full overflow-y-auto', className)}
      role="grid"
      aria-rowcount={Math.ceil(items.length / Math.max(1, Math.floor(1200 / (minCardWidth + gap))))}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
          gap,
        }}
      >
        {items.map((item, index) => {
          const shown = !animate || visible.has(item.id)
          const batchIndex = index % staggerBatch
          const delay = animate ? (browseReplication ? 0 : batchIndex * 18) : 0 // no stagger in replication mode
          // Tokens derived / approximated from browse page inspection
          const hoverScale = browseReplication ? 'group-hover:scale-[1.045]' : 'group-hover:scale-[1.05]'
          const overlayDuration = browseReplication ? 'duration-200 ease-in-out' : 'duration-400 ease-out'
          const transformDuration = browseReplication ? 'duration-200 ease-in-out' : 'duration-500 ease-[cubic-bezier(.16,.8,.34,1)]'
          const isActive = activeHoverId === item.id
          const metadata: string[] = []
          if (item.year) metadata.push(String(item.year))
          if (item.rating != null) metadata.push(`${Math.round(item.rating * 10) / 10}★`)
          return (
            <div
              key={item.id}
              data-mid={item.id}
              role="gridcell"
              tabIndex={0}
              style={animate ? {
                transition: browseReplication
                  ? 'opacity 260ms ease-in-out, transform 260ms ease-in-out'
                  : 'opacity 480ms cubic-bezier(.16,.8,.34,1), transform 600ms cubic-bezier(.16,.8,.34,1)',
                transitionDelay: `${delay}ms`,
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateY(0)' : 'translateY(14px)'
              } : undefined}
              className={clsx(
                'group relative aspect-[2/3] overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 focus-visible:ring-2 focus-visible:ring-white/70 outline-none',
                browseReplication ? 'rounded-[5px] shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-transform' : 'rounded-md',
                animate && 'will-change-transform',
                isActive && 'z-20'
              )}
              aria-label={item.title}
              onPointerEnter={()=> scheduleHover(item.id, index)}
              onPointerLeave={()=> clearHover(item.id)}
              onFocus={()=> scheduleHover(item.id, index)}
              onBlur={()=> clearHover(item.id)}
            >
              <PosterImage
                src={item.poster || item.backdrop || ''}
                alt={item.title}
                className={clsx('h-full w-full object-cover transition-transform', transformDuration, hoverScale, isActive && 'scale-[1.045] group-hover:scale-105')}
              />
              <div className={clsx('pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent', overlayDuration,
                (isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'),
              )}>
                {/* Removed gradient overlay */}
                <div className="p-2 text-center">
                  <p className="text-[11px] font-medium line-clamp-2 leading-tight text-white/90">{item.title}</p>
                  {showMetadata && metadata.length > 0 && (
                    <p className="mt-0.5 text-[10px] tracking-wide text-white/55">{metadata.join(' • ')}</p>
                  )}
                  <div className="mt-2 flex items-center justify-center gap-2" aria-label="Item actions">
                    <button
                      type="button"
                      aria-label={`Play ${item.title}`}
                      onClick={(e)=>{ e.stopPropagation(); onPlay?.(item.id) }}
                      className="pointer-events-auto h-7 w-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <WatchlistToggleButton
                      inList={isInWatchlist(item.id)}
                      size={28}
                      variant="overlay"
                      onToggle={() => {
                        toggleWatchlist(item.id, 'movie', item.title, item.poster)
                        if (!isInWatchlist(item.id)) onAdd?.(item.id)
                      }}
                      className="pointer-events-auto h-7"
                      ariaLabelAdd={`Add ${item.title} to Watchlist`}
                      ariaLabelRemove={`Remove ${item.title} from Watchlist`}
                    />
                    <button
                      type="button"
                      aria-label={`More info about ${item.title}`}
                      onClick={(e)=>{ e.stopPropagation(); onInfo?.(item.id) }}
                      className="pointer-events-auto h-7 w-7 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        .moviepire-grid::-webkit-scrollbar{display:none}
        .moviepire-grid{scrollbar-width:none}
      `}</style>
    </div>
  )
}

export default MoviepireGrid
