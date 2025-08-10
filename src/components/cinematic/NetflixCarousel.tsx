"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Plus, Info } from 'lucide-react'
import PosterImage from '@/components/hover/PosterImage'
import clsx from 'clsx'

export interface CarouselItemBase { id: string; title?: string; poster?: string; backdrop?: string; year?: number; rating?: number; genre?: string[] }

interface Rect { left: number; top: number; width: number; height: number }
interface PreviewState<T> { item: T; rect: Rect }

export interface NetflixCarouselProps<T extends CarouselItemBase> {
  id?: string
  title?: string
  items: T[]
  onPlay?: (id: string) => void
  onAdd?: (id: string) => void
  onInfo?: (id: string) => void
  itemWidth?: number
  gap?: number
  activationDelayMs?: number
  retainDelayMs?: number
  enlarge?: number
  elevation?: number
  disableSizeAnimationOnSwitch?: boolean
  className?: string
  /** Inline title pop-out hover mode (disables floating enlarge preview) */
  titlePopOut?: boolean
  /** Browse replication mode (forces titlePopOut & browse tokens) */
  browseReplication?: boolean
  /** Delay before hover activation (ms) */
  intentDelayMs?: number
  /** Prefetch neighbor images on activation */
  prefetchNeighbors?: boolean
  /** Show metadata line under title */
  showMetadata?: boolean
  /** Subtle per-card lift/scale on hover (entire frame forward) when using titlePopOut mode */
  frameLift?: boolean
  /** Scale applied during frame lift */
  frameLiftScale?: number
  /** Y translation (negative = upward) during frame lift */
  frameLiftTranslateY?: number
  /** Show the title text in pop-out overlay (default true) */
  showTitle?: boolean
  /** Action button size (px, square). Default 28. */
  actionButtonSize?: number
}

/**
 * NetflixCarousel: horizontal scroll rail with a persistent preview layer.
 * Flicker/glitch fixes:
 *  - Single persistent absolutely positioned preview element (never unmounted on switch).
 *  - Preload next poster image; only swap content after image load to avoid blank flash.
 *  - No position tween between different items (instant geometry jump), optional size anim suppressed on switch.
 */
export function NetflixCarousel<T extends CarouselItemBase>({
  id,
  title,
  items,
  onPlay,
  onAdd,
  onInfo,
  itemWidth = 204,
  gap = 16,
  activationDelayMs = 60,
  retainDelayMs = 90,
  enlarge = 1.14,
  elevation = 22,
  disableSizeAnimationOnSwitch = true,
  className = '',
  titlePopOut = false,
  browseReplication = false,
  intentDelayMs = 80,
  prefetchNeighbors = true,
  showMetadata = true,
  frameLift = false,
  frameLiftScale = 1.06,
  frameLiftTranslateY = -10,
  showTitle = true,
  actionButtonSize = 28,
}: NetflixCarouselProps<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [preview, setPreview] = useState<PreviewState<T> | null>(null)
  const activateTimer = useRef<number | null>(null)
  const clearTimer = useRef<number | null>(null)
  const lastIdRef = useRef<string | null>(null)
  const switchedRef = useRef(false)
  const [loadedPoster, setLoadedPoster] = useState<string | null>(null)
  const pendingPosterRef = useRef<string | null>(null)

  const effectiveTitlePop = titlePopOut || browseReplication
  if (!effectiveTitlePop && preview?.item.id !== lastIdRef.current) {
    switchedRef.current = true
    lastIdRef.current = preview?.item.id || null
  }

  // Compute scrollable width for spacing placeholders
  const totalWidth = useMemo(() => items.length * itemWidth + (items.length - 1) * gap, [items.length, itemWidth, gap])

  const computeRect = useCallback((el: HTMLElement): Rect => {
    const c = containerRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!c) return { left: r.left, top: r.top, width: r.width, height: r.height }
    return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height }
  }, [])

  const preloadPoster = (src?: string | null) => {
    if (!src || src === loadedPoster) return
    pendingPosterRef.current = src
    const img = new Image()
    img.onload = () => {
      if (pendingPosterRef.current === src) {
        setLoadedPoster(src)
      }
    }
    img.src = src
  }

  const [activeId, setActiveId] = useState<string | null>(null)
  const hoverTimers = useRef<Record<string, number>>({})

  const prefetchImage = (url?: string | null) => {
    if (!prefetchNeighbors || !url) return
    const img = new Image(); img.decoding = 'async'; img.src = url
  }

  const enter = useCallback((item: T, el: HTMLElement, index?: number) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    const rect = computeRect(el)
    const posterSrc = item.poster || item.backdrop || ''
    preloadPoster(posterSrc)
    // In titlePopOut (and browseReplication) mode we don't render floating preview element.
    // If frameLift is enabled we can activate immediately for instant lift responsiveness.
    if (effectiveTitlePop && frameLift) {
      setActiveId(item.id)
      if (prefetchNeighbors && typeof index === 'number') {
        const prev = items[index - 1]
        const next = items[index + 1]
        prefetchImage(prev?.poster || prev?.backdrop)
        prefetchImage(next?.poster || next?.backdrop)
      }
      return
    }
    activateTimer.current = window.setTimeout(() => {
      setPreview({ item, rect })
      setActiveId(item.id)
      if (prefetchNeighbors && typeof index === 'number') {
        const prev = items[index - 1]
        const next = items[index + 1]
        prefetchImage(prev?.poster || prev?.backdrop)
        prefetchImage(next?.poster || next?.backdrop)
      }
    }, browseReplication ? intentDelayMs : activationDelayMs)
  }, [activationDelayMs, computeRect, browseReplication, intentDelayMs, items, prefetchNeighbors])

  const scheduleClear = useCallback(() => {
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    clearTimer.current = window.setTimeout(() => { setPreview(null); setActiveId(null) }, retainDelayMs)
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
    const dy = (targetH - rect.height) - elevation
    const noAnim = switchedRef.current && disableSizeAnimationOnSwitch
    if (switchedRef.current) requestAnimationFrame(() => { switchedRef.current = false })
    return {
      left: rect.left - dx,
      top: rect.top - dy,
      width: targetW,
      height: targetH,
      transition: noAnim ? 'none' : `width 160ms ease, height 160ms ease`,
    }
  }, [preview, enlarge, elevation, disableSizeAnimationOnSwitch])

  // Basic keyboard nav for accessibility
  const focusIndexRef = useRef(0)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return
    let idx = focusIndexRef.current
    if (e.key === 'ArrowRight') { idx = Math.min(items.length - 1, idx + 1); e.preventDefault() }
    else if (e.key === 'ArrowLeft') { idx = Math.max(0, idx - 1); e.preventDefault() }
    else if (e.key === 'Enter') { onPlay?.(items[idx].id); e.preventDefault(); return }
    else if (e.key === ' ') { onAdd?.(items[idx].id); e.preventDefault(); return }
    else if (e.key.toLowerCase() === 'i') { onInfo?.(items[idx].id); e.preventDefault(); return }
    else return
    focusIndexRef.current = idx
    const el = containerRef.current?.querySelectorAll<HTMLElement>('[data-rail-item]')[idx]
    el?.focus({ preventScroll: true })
    if (el) enter(items[idx], el, idx)
  }

  // Entrance reveal animation (match browse grid) when in replication/title pop-out mode
  const [visibleIds, setVisibleIds] = useState<Set<string>>(()=>new Set())
  const ioRef = useRef<IntersectionObserver | null>(null)
  useEffect(()=>{
    if (!browseReplication) return
    if (ioRef.current) { ioRef.current.disconnect() }
    const root = scrollerRef.current
    if (!root) return
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    ioRef.current = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        const id = entry.target.getAttribute('data-id')
        if (id && entry.isIntersecting) {
          setVisibleIds(prev=> prev.has(id) ? prev : new Set(prev).add(id))
          ioRef.current?.unobserve(entry.target as Element)
        }
      })
    }, { root, threshold: 0.15 })
    const cards = root.querySelectorAll('[data-rail-item]')
    cards.forEach((el,i)=>{
      const itemId = (items[i]?.id) || el.getAttribute('data-id') || ''
      el.setAttribute('data-id', itemId)
      ioRef.current?.observe(el)
    })
    return ()=> ioRef.current?.disconnect()
  }, [items, browseReplication])

  return (
  <section id={id} className={clsx('relative group select-none', className)} aria-label={title}>
      {title && <h2 className="mb-2 px-1 text-lg font-semibold tracking-wide">{title}</h2>}
      <div
        ref={containerRef}
    className="relative overflow-visible"
    onMouseLeave={scheduleClear}
    onKeyDown={handleKeyDown}
    tabIndex={0}
      >
        <div
          ref={scrollerRef}
          className="scrollbar-hide overflow-x-auto overflow-y-visible relative py-5 flex"
          style={{ gap, WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
        >
          {items.map((item, i) => {
            const revealed = !browseReplication || visibleIds.has(item.id)
            const batchIndex = i % 24
            const delayMs = browseReplication ? batchIndex * 18 : 0
            const liftEnabled = frameLift && effectiveTitlePop
            const isActive = activeId === item.id
            const entranceTransform = revealed ? 'translateY(0)' : 'translateY(14px)'
            const liftTransform = liftEnabled && isActive ? ` translateY(${frameLiftTranslateY}px) scale(${frameLiftScale})` : ''
      return (
            <div
              key={item.id}
              data-rail-item
              tabIndex={0}
              aria-label={item.title}
              className={clsx('relative flex-none overflow-hidden w-[204px] aspect-[2/3] group/item',
                browseReplication ? 'rounded-[5px] shadow-[0_0_10px_rgba(0,0,0,0.3)] bg-zinc-900 ring-1 ring-zinc-800' : 'rounded-md bg-zinc-900/60 ring-1 ring-zinc-800',
                effectiveTitlePop && 'transition-colors',
                liftEnabled && 'transition-transform duration-360 ease-[cubic-bezier(.16,.8,.34,1)] will-change-transform',
                liftEnabled && isActive && 'z-20 shadow-[0_8px_26px_-4px_rgba(0,0,0,0.55)]')}
              style={{
                width: itemWidth,
                opacity: revealed ? 1 : 0,
        // Compose entrance + lift into a single transform for GPU smoothness
        transform: entranceTransform + liftTransform + (liftEnabled && isActive ? ' translateZ(0)' : ''),
        transition: `opacity 280ms ease-out ${delayMs}ms, transform 420ms cubic-bezier(.16,.8,.34,1) ${delayMs}ms, box-shadow 420ms ease ${delayMs}ms`,
              }}
              onMouseEnter={(e)=>enter(item, e.currentTarget, i)}
              onMouseLeave={()=>{}}
              onFocus={(e)=>{ focusIndexRef.current = i; enter(item, e.currentTarget) }}
              onPointerMove={(e)=>{ if (!liftEnabled) return; /* noop, placeholder if we later want parallax */ }}
            >
              <PosterImage src={item.poster || item.backdrop || ''} alt={item.title || ''} className="w-full h-full object-cover" />
              {effectiveTitlePop ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-2">
                  <div className={clsx('text-center transform-gpu origin-bottom transition-all duration-200 ease-[cubic-bezier(.16,.8,.34,1)]',
                    (isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.92] group-hover/item:opacity-100 group-hover/item:translate-y-0 group-hover/item:scale-100')
                  )}>
                    {showTitle && <p className="text-[11px] font-medium text-white/90 line-clamp-2 leading-tight">{item.title}</p>}
                    {showTitle && showMetadata && (item.year || item.rating != null) && (
                      <p className="mt-0.5 text-[10px] tracking-wide text-white/55">
                        {item.year && <span>{item.year}</span>}{item.year && item.rating != null && ' • '}
                        {item.rating != null && <span>{Math.round((item.rating||0)*10)/10}★</span>}
                      </p>
                    )}
                    <div className={clsx('flex justify-center gap-2', showTitle ? 'mt-2' : 'mt-0')} aria-hidden="true">
                      {(() => { const s = actionButtonSize; const icon = Math.round(s*0.55); return (
                        <>
                          <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(item.id) }} style={{height:s,width:s}} className="pointer-events-auto rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-white"><Play style={{height:icon,width:icon}} /></button>
                          <button type="button" onClick={(e)=>{ e.stopPropagation(); onAdd?.(item.id) }} style={{height:s,width:s}} className="pointer-events-auto rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Plus style={{height:icon,width:icon}} /></button>
                          <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(item.id) }} style={{height:s,width:s}} className="pointer-events-auto rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Info style={{height:icon,width:icon}} /></button>
                        </>
                      ) })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                  <div className="flex gap-2" aria-hidden="true">
                    <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(item.id) }} className="pointer-events-auto h-8 w-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"><Play className="h-4 w-4" /></button>
                    <button type="button" onClick={(e)=>{ e.stopPropagation(); onAdd?.(item.id) }} className="pointer-events-auto h-8 w-8 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Plus className="h-4 w-4" /></button>
                    <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(item.id) }} className="pointer-events-auto h-8 w-8 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Info className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
        {!effectiveTitlePop && preview && (
          <div
            className="absolute z-30 rounded-md shadow-2xl ring-1 ring-black/60 overflow-hidden bg-zinc-950"
            style={previewStyle}
            onMouseEnter={cancelClear}
            onMouseLeave={scheduleClear}
          >
            <div className="relative w-full h-full">
              {/* Keep previous poster until new one has loaded to prevent flicker */}
              <PosterImage src={loadedPoster || preview.item.poster || preview.item.backdrop || ''} alt={preview.item.title || ''} className="w-full h-full object-cover" />
              {/* Removed gradient overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-center">
                <div className="flex gap-3" aria-label={preview.item.title}>
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); onPlay?.(preview.item.id) }} className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"><Play className="h-5 w-5" /></button>
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); onAdd?.(preview.item.id) }} className="h-9 w-9 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Plus className="h-5 w-5" /></button>
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); onInfo?.(preview.item.id) }} className="h-9 w-9 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"><Info className="h-5 w-5" /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <span className="sr-only">Total content width: {totalWidth}px</span>
    </section>
  )
}

export default NetflixCarousel
