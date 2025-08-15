"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RailItemBase, InteractionCallbacks, defaultAppleRailConfig, AppleRailConfig } from './rail-types'
import PosterImage from '@/components/hover/PosterImage'
import { Play, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { useWatchlistActions } from '@/components/list/useWatchlistActions'
import clsx from 'clsx'

interface AppleCinematicRailProps<T extends RailItemBase> extends InteractionCallbacks {
  id?: string
  title?: string
  items: T[]
  config?: Partial<AppleRailConfig>
  renderMeta?: (item: T) => React.ReactNode
  /** When true use reduced motion friendly minimal animations */
  respectReducedMotion?: boolean
}

interface HoverState<T> { item: T; idx: number; rect: DOMRect }

export function AppleCinematicRail<T extends RailItemBase>({
  id,
  title,
  items,
  onPlay,
  onAdd,
  onInfo,
  config,
  renderMeta,
  respectReducedMotion = true,
}: AppleCinematicRailProps<T>) {
  const merged: AppleRailConfig = { ...defaultAppleRailConfig, ...config }
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<HoverState<T> | null>(null)
  const clearTimer = useRef<number | null>(null)
  const activateTimer = useRef<number | null>(null)

  const cardHeight = useMemo(() => merged.cardWidth / merged.aspectRatio, [merged.cardWidth, merged.aspectRatio])

  const handleEnter = useCallback((item: T, idx: number, el: HTMLDivElement) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    const rect = el.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const localRect = containerRect ? new DOMRect(rect.left - containerRect.left, rect.top - containerRect.top, rect.width, rect.height) : rect
    activateTimer.current = window.setTimeout(() => {
      setHovered({ item, idx, rect: localRect })
    }, merged.activationDelayMs)
  }, [merged.activationDelayMs])

  const scheduleClear = useCallback(() => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    clearTimer.current = window.setTimeout(() => setHovered(null), 60)
  }, [])

  useEffect(() => () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    if (activateTimer.current) window.clearTimeout(activateTimer.current)
  }, [])

  const previewStyle = useMemo(() => {
    if (!hovered) return undefined
    const scale = merged.previewEnlarge
    const lift = merged.focusElevation
    const { rect } = hovered
    // Expand algorithm: grow outward centered horizontally, lifted upward
    const targetW = rect.width * scale
    const targetH = rect.height * scale
    const dx = (targetW - rect.width) / 2
    const dy = (targetH - rect.height) - lift
    return {
      left: rect.left - dx,
      top: rect.top - dy,
      width: targetW,
      height: targetH,
      transition: `all ${merged.animationMs}ms cubic-bezier(.32,.72,.24,1)` ,
    } as React.CSSProperties
  }, [hovered, merged.previewEnlarge, merged.animationMs, merged.focusElevation])

  return (
    <section id={id} className="relative group select-none px-4">
      {title && <h2 className="mb-2 text-xl font-semibold tracking-wide text-white/95">{title}</h2>}
      <div ref={containerRef} className="relative overflow-x-auto overflow-y-visible scrollbar-hide">
        <div
          className="flex py-2"
          style={{ gap: merged.gap, paddingBottom: 4 }}
          onMouseLeave={scheduleClear}
        >
          {items.map((item, idx) => {
            const isHovered = hovered?.item.id === item.id
            const dim = hovered && !isHovered
            return (
              <div
                key={item.id}
                className={clsx(
                  'relative flex-shrink-0 rounded-md bg-zinc-900/70 overflow-hidden ring-1 ring-zinc-800',
                  'transition-all duration-200 ease-out',
                  dim && `opacity-${Math.round(merged.dimOpacity * 100)}`,
                  !dim && 'opacity-100'
                )}
                style={{
                  width: merged.cardWidth,
                  height: cardHeight,
                  backdropFilter: isHovered ? 'blur(2px) saturate(1.1)' : undefined,
                }}
                onMouseEnter={(e) => handleEnter(item, idx, e.currentTarget)}
                onMouseLeave={() => { /* container handles clear */ }}
              >
                <PosterImage
                  src={item.poster || item.backdrop || ''}
                  alt={item.title || ''}
                  className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(.33,.66,.4,1)] will-change-transform group-hover:brightness-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )
          })}
          {hovered && (
            <div
              className="pointer-events-none absolute z-30 rounded-md shadow-2xl will-change-transform"
              style={previewStyle}
              onMouseEnter={() => { if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null } }}
              onMouseLeave={scheduleClear}
            >
              <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-900">
                <PosterImage
                  src={hovered.item.poster || hovered.item.backdrop || ''}
                  alt={hovered.item.title || ''}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/50 to-black/80" />
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 select-text">
                  <PreviewActions id={hovered.item.id} title={hovered.item.title} onPlay={onPlay} onAdd={onAdd} onInfo={onInfo} />
                  <div className="space-y-1 text-white">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{hovered.item.title}</h3>
                    {renderMeta ? renderMeta(hovered.item) : (
                      <p className="text-xs text-white/70 line-clamp-3">{hovered.item.year || ''} {hovered.item.genre?.slice(0,3).join(' • ')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          section#${id||''} .pointer-events-none.shadow-2xl { animation: railPreviewFade ${merged.animationMs}ms cubic-bezier(.33,.66,.4,1); }
        }
        @keyframes railPreviewFade { 0% { opacity: 0; transform: translateY(10px) scale(.98);} 55% { opacity: 1;} 100% { opacity:1; transform: translateY(0) scale(1);} }
      `}</style>
    </section>
  )
}

export default AppleCinematicRail

interface PreviewActionsProps {
  id: string
  title?: string
  onPlay?: (id: string) => void
  onAdd?: (id: string) => void
  onInfo?: (id: string) => void
}

function PreviewActions({ id, title, onPlay, onAdd, onInfo }: PreviewActionsProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlistActions()
  const inList = isInWatchlist(id)
  return (
    <div className="flex items-center space-x-2">
      <Button size="sm" className="h-8 px-3 rounded-full bg-white text-black hover:bg-white/90" onClick={(e) => { e.stopPropagation(); onPlay?.(id) }}><Play className="h-4 w-4 mr-1" />Play</Button>
      <WatchlistToggleButton
        inList={inList}
        size={32}
        className="h-8"
        variant="overlay"
        onToggle={() => {
          toggleWatchlist(id, 'movie', title)
          if (!inList) onAdd?.(id)
        }}
        ariaLabelAdd="Add to Watchlist"
        ariaLabelRemove="Remove from Watchlist"
      />
      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-white/30 text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onInfo?.(id) }}><Info className="h-4 w-4" /></Button>
    </div>
  )
}
