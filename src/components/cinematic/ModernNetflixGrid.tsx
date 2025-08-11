"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Plus, Info } from 'lucide-react'
import PosterImage from '@/components/hover/PosterImage'
import clsx from 'clsx'

export interface ModernGridItemBase { id: string; title?: string; poster?: string; backdrop?: string; year?: number; rating?: number; genre?: string[] }

interface Rect { left: number; top: number; width: number; height: number }
interface PreviewState<T> { item: T; rect: Rect }

export interface ModernNetflixGridProps<T extends ModernGridItemBase> {
  items: T[]
  onPlay?: (id: string) => void
  onAdd?: (id: string) => void
  onInfo?: (id: string) => void
  className?: string
  minCardWidth?: number
  aspectRatio?: number
  gap?: number
  activationDelayMs?: number
  retainDelayMs?: number
  enlarge?: number
  lift?: number
  transitionMs?: number
  disableSizeAnimationOnSwitch?: boolean
  overscanRows?: number
}

export function ModernNetflixGrid<T extends ModernGridItemBase>({
  items,
  onPlay,
  onAdd,
  onInfo,
  className = '',
  minCardWidth = 180,
  aspectRatio = 2/3,
  gap = 12,
  activationDelayMs = 60,
  retainDelayMs = 80,
  enlarge = 1.12,
  lift = 18,
  transitionMs = 180,
  disableSizeAnimationOnSwitch = true,
  overscanRows = 2,
}: ModernNetflixGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const overlayLayerRef = useRef<HTMLDivElement | null>(null)
  const [columns, setColumns] = useState(6)
  const [cardWidth, setCardWidth] = useState(minCardWidth)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [preview, setPreview] = useState<PreviewState<T> | null>(null)
  const activateTimer = useRef<number | null>(null)
  const clearTimer = useRef<number | null>(null)
  const lastIdRef = useRef<string | null>(null)
  const switchedRef = useRef(false)
  const [loadedPoster, setLoadedPoster] = useState<string | null>(null)
  const pendingPosterRef = useRef<string | null>(null)
  const focusIndexRef = useRef<number>(0)

  if (preview?.item.id !== lastIdRef.current) {
    switchedRef.current = true
    lastIdRef.current = preview?.item.id || null
  }

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.clientWidth
      const rawCols = Math.max(1, Math.floor((w + gap) / (minCardWidth + gap)))
      const fullWidthForCols = (w - (rawCols - 1) * gap)
      const actualCardWidth = Math.floor(fullWidthForCols / rawCols)
      setColumns(rawCols)
      setCardWidth(actualCardWidth)
      setViewportHeight(window.innerHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [gap, minCardWidth])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const cardHeight = useMemo(() => cardWidth / (aspectRatio || (2/3)), [cardWidth, aspectRatio])
  const totalRows = Math.ceil(items.length / columns)
  const scrollRowStart = Math.max(0, Math.floor(scrollTop / (cardHeight + gap)) - overscanRows)
  const rowsInView = Math.ceil((viewportHeight || 0) / (cardHeight + gap)) + overscanRows * 2
  const scrollRowEnd = Math.min(totalRows - 1, scrollRowStart + rowsInView)
  const startIndex = scrollRowStart * columns
  const endIndex = Math.min(items.length - 1, ((scrollRowEnd + 1) * columns) - 1)
  const visibleItems = useMemo(() => items.slice(startIndex, endIndex + 1), [items, startIndex, endIndex])

  const topSpacerHeight = scrollRowStart * (cardHeight + gap)
  const bottomSpacerHeight = Math.max(0, (totalRows - (scrollRowEnd + 1)) * (cardHeight + gap))

  const computeRect = useCallback((el: HTMLElement): Rect => {
    const c = containerRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!c) return { left: r.left, top: r.top, width: r.width, height: r.height }
    return { left: r.left - c.left, top: r.top - c.top + containerRef.current!.scrollTop, width: r.width, height: r.height }
  }, [])

  const preloadPoster = (src?: string | null) => {
    if (!src || src === loadedPoster) return
    pendingPosterRef.current = src
    const img = new Image()
    img.onload = () => { if (pendingPosterRef.current === src) setLoadedPoster(src) }
    img.src = src
  }

  const enter = useCallback((item: T, el: HTMLElement) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    const rect = computeRect(el)
    preloadPoster(item.poster || item.backdrop || '')
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return
    let idx = focusIndexRef.current
    if (e.key === 'ArrowRight') { idx = Math.min(items.length - 1, idx + 1); e.preventDefault() }
    else if (e.key === 'ArrowLeft') { idx = Math.max(0, idx - 1); e.preventDefault() }
    else if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + columns); e.preventDefault() }
    else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - columns); e.preventDefault() }
    else if (e.key === 'Enter') { onPlay?.(items[idx].id); return }
    else if (e.key === ' ') { onAdd?.(items[idx].id); e.preventDefault(); return }
    else if (e.key.toLowerCase() === 'i') { onInfo?.(items[idx].id); return }
    else return
    focusIndexRef.current = idx
    const cell = containerRef.current?.querySelector<HTMLDivElement>(`[data-gindex='${idx}']`)
    if (cell) { cell.focus({ preventScroll: false }); enter(items[idx], cell) }
  }

  return (
    <div
      ref={containerRef}
      className={clsx('modern-nf-grid relative overflow-y-auto overflow-x-hidden outline-none', className)}
      style={{ maxHeight: 'min(240vh, 4000px)', WebkitOverflowScrolling: 'touch' }}
      role="grid"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseLeave={scheduleClear}
      aria-rowcount={Math.ceil(items.length / columns)}
      aria-colcount={columns}
    >
      <div style={{ height: topSpacerHeight }} />
      <div
        className="relative"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`, gap, position: 'relative' }}
      >
        {visibleItems.map((item, i) => {
          const absoluteIndex = startIndex + i
          const isCurrent = preview?.item.id === item.id
          return (
            <div
              key={item.id}
              data-gindex={absoluteIndex}
              role="gridcell"
              aria-selected={isCurrent}
              tabIndex={0}
              className={clsx('group relative rounded-md overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 focus-visible:ring-2 focus-visible:ring-white/70 outline-none aspect-[2/3]')}
              style={{ width: cardWidth, height: cardHeight }}
              onMouseEnter={(e)=>enter(item, e.currentTarget)}
              onFocus={(e)=>{ focusIndexRef.current = absoluteIndex; enter(item, e.currentTarget) }}
              onBlur={scheduleClear}
            >
              <PosterImage src={item.poster || item.backdrop || ''} alt={item.title || ''} className="w-full h-full object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-2" aria-hidden="true">
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(item.id) }} className="pointer-events-auto h-8 w-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"><Play className="h-4 w-4" /></button>
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); onAdd?.(item.id) }} className="pointer-events-auto h-8 w-8 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Plus className="h-4 w-4" /></button>
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(item.id) }} className="pointer-events-auto h-8 w-8 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Info className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ height: bottomSpacerHeight }} />
      {preview && (
        <div
          ref={overlayLayerRef}
          className="absolute z-40 pointer-events-auto rounded-md shadow-2xl ring-1 ring-black/50 overflow-hidden bg-zinc-950"
          style={previewStyle}
          onMouseEnter={cancelClear}
          onMouseLeave={scheduleClear}
        >
          <div className="relative w-full h-full">
            <PosterImage src={loadedPoster || preview.item.poster || preview.item.backdrop || ''} alt={preview.item.title || ''} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-center gap-4">
              <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(preview.item.id) }} className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"><Play className="h-5 w-5" /></button>
              <button type="button" onClick={(e)=>{ e.stopPropagation(); onAdd?.(preview.item.id) }} className="h-9 w-9 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Plus className="h-5 w-5" /></button>
              <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(preview.item.id) }} className="h-9 w-9 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Info className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .modern-nf-grid::-webkit-scrollbar{display:none}
        .modern-nf-grid{scrollbar-width:none}
      `}</style>
    </div>
  )
}

export default ModernNetflixGrid
