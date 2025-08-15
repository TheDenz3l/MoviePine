"use client"
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { Play, Info } from 'lucide-react'
import PosterImage from '@/components/hover/PosterImage'
import clsx from 'clsx'
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { useWatchlistActions } from '@/components/list/useWatchlistActions'

interface BaseItem { id: string; title?: string; poster?: string; year?: number; rating?: number; genre?: string[] }

export interface NetflixPosterGridProps<T extends BaseItem> {
  items: T[]
  onPlay?: (id: string) => void
  onAdd?: (id: string) => void
  onInfo?: (id: string) => void
  className?: string
  columns?: string // tailwind grid-cols-* string set
  activationDelayMs?: number
  retainDelayMs?: number
  enlarge?: number
  lift?: number
  transitionMs?: number
  disableSizeAnimationOnSwitch?: boolean
}

interface PreviewState<T> { item: T; rect: DOMRect }

/**
 * Brand‑new Netflix style poster grid focused on glitch‑free, zero-slide switching.
 * Geometry: absolute preview layer that resizes & moves with only size anim (optional) – no positional tween to avoid lateral slide artifact.
 * Shows ONLY Play, Add, Info icons on hover overlay.
 */
export function NetflixPosterGrid<T extends BaseItem>({
  items,
  onPlay,
  onAdd,
  onInfo,
  className = '',
  columns = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8',
  activationDelayMs = 60,
  retainDelayMs = 80,
  enlarge = 1.12,
  lift = 18,
  transitionMs = 180,
  disableSizeAnimationOnSwitch = true,
}: NetflixPosterGridProps<T>) {
  // Deduplicate incoming items by id to avoid duplicate React keys
  const dedupedItems = useMemo(() => {
    const seen = new Set<string>()
    const dupes: string[] = []
    const list: T[] = []
    for (const it of items) {
      const id = it.id
      if (!id) continue
      if (seen.has(id)) { dupes.push(id); continue }
      seen.add(id)
      list.push(it)
    }
    if (dupes.length) {
      // eslint-disable-next-line no-console
      console.warn('[NetflixPosterGrid] Duplicate ids removed:', Array.from(new Set(dupes)))
    }
    return list
  }, [items])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [preview, setPreview] = useState<PreviewState<T> | null>(null)
  const activateTimer = useRef<number | null>(null)
  const clearTimer = useRef<number | null>(null)
  const lastIdRef = useRef<string | null>(null)
  const switchedRef = useRef(false)

  if (preview?.item.id !== lastIdRef.current) {
    switchedRef.current = true
    lastIdRef.current = preview?.item.id || null
  }

  const computeRect = useCallback((el: HTMLElement) => {
    const c = containerRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!c) return new DOMRect(r.left, r.top, r.width, r.height)
    return new DOMRect(r.left - c.left, r.top - c.top, r.width, r.height)
  }, [])

  const enter = useCallback((item: T, el: HTMLElement) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    const rect = computeRect(el)
    activateTimer.current = window.setTimeout(() => setPreview({ item, rect }), activationDelayMs)
  }, [activationDelayMs, computeRect])

  const scheduleClear = useCallback(() => {
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    clearTimer.current = window.setTimeout(() => setPreview(null), retainDelayMs)
  }, [retainDelayMs])

  const cancelClear = useCallback(() => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
  }, [])

  useEffect(() => () => {
    if (activateTimer.current) window.clearTimeout(activateTimer.current)
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
  }, [])

  const previewStyle: React.CSSProperties | undefined = useMemo(() => {
    if (!preview) return undefined
    const { rect } = preview
    const targetW = rect.width * enlarge
    const targetH = rect.height * enlarge
    const dx = (targetW - rect.width) / 2
    const dy = (targetH - rect.height) - lift
    const noAnim = switchedRef.current && disableSizeAnimationOnSwitch
    if (switchedRef.current) requestAnimationFrame(() => { switchedRef.current = false })
    return {
      left: rect.left - dx,
      top: rect.top - dy,
      width: targetW,
      height: targetH,
      transition: noAnim ? 'none' : `width ${transitionMs}ms ease, height ${transitionMs}ms ease`,
    }
  }, [preview, enlarge, lift, transitionMs, disableSizeAnimationOnSwitch])

  return (
    <div
      ref={containerRef}
      className={clsx('relative', className)}
      onMouseLeave={scheduleClear}
      role="grid"
      aria-label="titles grid"
    >
      <div className={clsx('grid gap-2 md:gap-3', columns)}>
        {dedupedItems.map(item => (
          <div
            key={item.id}
            role="gridcell"
            tabIndex={0}
            className={clsx('group relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 focus-visible:ring-2 focus-visible:ring-white/70 outline-none')}
            onMouseEnter={(e)=>enter(item, e.currentTarget)}
            onFocus={(e)=>enter(item, e.currentTarget)}
            onMouseLeave={()=>{}}
            onBlur={scheduleClear}
          >
            <PosterImage src={item.poster || ''} alt={item.title || ''} className="w-full h-full object-cover" />
            {/* Hover overlay icons (play/add/info) */}
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex gap-2" aria-hidden="true">
                <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(item.id) }} className="pointer-events-auto h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white">
                  <Play className="h-5 w-5" />
                </button>
                <WatchlistAddButton id={item.id} title={item.title} poster={item.poster} onExternalAdd={onAdd} variant="overlay" />
                <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(item.id) }} className="pointer-events-auto h-9 w-9 rounded-full bg-zinc-800/80 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          className="absolute z-40 pointer-events-auto rounded-md shadow-2xl ring-1 ring-black/50 overflow-hidden bg-zinc-950"
          style={previewStyle}
          onMouseEnter={cancelClear}
          onMouseLeave={scheduleClear}
        >
          <div className="relative w-full h-full">
            <PosterImage src={preview.item.poster || ''} alt={preview.item.title || ''} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-center">
              <div className="flex gap-3" aria-label={preview.item.title}>
                <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(preview.item.id) }} className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white">
                  <Play className="h-5 w-5" />
                </button>
                <WatchlistAddButton id={preview.item.id} title={preview.item.title} poster={preview.item.poster} size={40} onExternalAdd={onAdd} variant="overlay" />
                <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(preview.item.id) }} className="h-10 w-10 rounded-full bg-zinc-800/80 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Keep base cards from causing layout shift when preview shows */
        .netflix-poster-grid-preview-disable * { user-select: none; }
      `}</style>
    </div>
  )
}

interface WatchlistAddButtonProps {
  id: string
  title?: string
  poster?: string
  size?: number
  onExternalAdd?: (id: string) => void
  variant?: 'icon' | 'overlay'
}

function WatchlistAddButton({ id, title, poster, size = 36, onExternalAdd, variant = 'icon' }: WatchlistAddButtonProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlistActions()
  const inList = isInWatchlist(id)
  return (
    <WatchlistToggleButton
      inList={inList}
      size={size}
      className="pointer-events-auto"
  variant={variant}
      onToggle={() => {
        toggleWatchlist(id, 'movie', title, poster)
        if (!inList) onExternalAdd?.(id)
      }}
    />
  )
}

export default NetflixPosterGrid
