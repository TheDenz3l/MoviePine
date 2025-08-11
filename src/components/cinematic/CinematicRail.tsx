"use client"
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { CinematicItemBase, CinematicConfig, defaultCinematicConfig } from './types'
import { useHorizontalVirtualWindow } from './useVirtualWindow'
import { useSharedPreview } from './useSharedPreview'
import PosterImage from '@/components/hover/PosterImage'
import { Play, Plus, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import clsx from 'clsx'

interface CinematicRailProps<T extends CinematicItemBase> {
  id?: string
  title?: string
  items: T[]
  config?: Partial<CinematicConfig>
  onPlay?: (id: string) => void
  onAdd?: (id: string) => void
  onInfo?: (id: string) => void
  renderMeta?: (item: T) => React.ReactNode
}

interface HoverState<T> { item: T; index: number; rect: DOMRect }

export function CinematicRail<T extends CinematicItemBase>({
  id,
  title,
  items,
  config,
  onPlay,
  onAdd,
  onInfo,
  renderMeta,
}: CinematicRailProps<T>) {
  const merged: CinematicConfig = useMemo(() => ({
    card: { ...defaultCinematicConfig.card, ...(config?.card || {}) },
    preview: { ...defaultCinematicConfig.preview, ...(config?.preview || {}) },
    behavior: { ...defaultCinematicConfig.behavior, ...(config?.behavior || {}) },
  }), [config])

  const { containerRef, range } = useHorizontalVirtualWindow(items.length, merged.card.width, merged.card.gap, merged.behavior.virtualizationBufferPx)
  const { hovered, enter, scheduleClear, cancelClear } = useSharedPreview<HoverState<T>["item"]>({ activationDelay: merged.preview.activationDelay, clearDelay: merged.behavior.retainPreviewMs })
  // Track last hovered id to suppress positional transition (no sliding) when switching items
  const lastIdRef = useRef<string | null>(null)
  const justSwitchedRef = useRef(false)
  if (hovered?.item.id !== lastIdRef.current) {
    justSwitchedRef.current = true
    lastIdRef.current = hovered?.item.id || null
  }
  const focusIndexRef = useRef<number>(0)

  const cardHeight = merged.card.width / merged.card.aspectRatio

  const handleEnter = useCallback((item: T, index: number, el: HTMLDivElement) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const local = containerRect ? new DOMRect(r.left - containerRect.left, r.top - containerRect.top, r.width, r.height) : r
    enter(item, local)
  }, [enter])

  useEffect(() => { /* noop now; hook handles cleanup */ }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!items.length) return
    const max = items.length - 1
    let idx = focusIndexRef.current
    if (e.key === 'ArrowRight') { idx = idx >= max ? (merged.behavior.keyboardWrap ? 0 : max) : idx + 1; e.preventDefault() }
    else if (e.key === 'ArrowLeft') { idx = idx <= 0 ? (merged.behavior.keyboardWrap ? max : 0) : idx - 1; e.preventDefault() }
    else if (e.key === 'Enter') { onPlay?.(items[idx].id); return }
    else if (e.key === ' ') { onAdd?.(items[idx].id); e.preventDefault(); return }
    else return
    focusIndexRef.current = idx
    const el = containerRef.current?.querySelector<HTMLDivElement>(`[data-cindex='${idx}']`)
    el?.focus({ preventScroll: false })
    if (el) handleEnter(items[idx], idx, el)
  }, [items, merged.behavior.keyboardWrap, onPlay, onAdd, handleEnter])

  const ensureVisible = (child: HTMLElement) => {
    const scroller = containerRef.current
    if (!scroller) return
    const left = child.offsetLeft
    const right = left + child.clientWidth
    if (left < scroller.scrollLeft) scroller.scrollTo({ left: left - merged.card.gap * 2, behavior: 'smooth' })
    else if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollTo({ left: right - scroller.clientWidth + merged.card.gap * 2, behavior: 'smooth' })
  }

  const previewStyle = useMemo(() => {
    if (!hovered) return undefined
    const { rect } = hovered
    const scale = merged.preview.enlarge
    const targetW = rect.width * scale
    const targetH = rect.height * scale
    const dx = (targetW - rect.width) / 2
    const dy = (targetH - rect.height) - merged.preview.elevation
    // If we just switched items, drop transitions entirely so there's zero sliding between positions.
    const noSlide = justSwitchedRef.current
    // After computing once, reset flag so resize within same item (if any) can animate.
    if (justSwitchedRef.current) requestAnimationFrame(() => { justSwitchedRef.current = false })
    const transitionProps = noSlide ? 'none' : ['width','height']
      .map(p=>`${p} ${merged.preview.animationMs}ms cubic-bezier(.32,.72,.24,1)`) // only size animates, not position
      .join(',')
    
    // Adjust left position to prevent clipping on the left edge
    let leftPos = rect.left - dx
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeLeft = rect.left - containerRect.left
      if (relativeLeft < dx) {
        leftPos = rect.left - relativeLeft
      }
    }
    
    return {
      left: leftPos,
      top: rect.top - dy,
      width: targetW,
      height: targetH,
      transition: transitionProps,
      willChange: 'width, height'
    } as React.CSSProperties
  }, [hovered, merged.preview.enlarge, merged.preview.animationMs, merged.preview.elevation])

  const sliced = useMemo(() => items.slice(range.start, range.end + 1), [items, range])

  return (
    <section id={id} className="relative group px-6" aria-label={title || 'media rail'}>
      {title && <h2 className="mb-2 text-xl font-semibold tracking-wide text-white/95">{title}</h2>}
      <div role="listbox" aria-label={title} ref={containerRef} tabIndex={0} onKeyDown={onKeyDown} className="relative overflow-x-auto overflow-y-visible scrollbar-hide outline-none" style={{ paddingBottom: 6, paddingLeft: 8, paddingRight: 8 }} onMouseLeave={scheduleClear}>
        <div className="flex py-2 relative" style={{ gap: merged.card.gap, height: cardHeight }}>
          <div style={{ width: range.start * (merged.card.width + merged.card.gap), flexShrink: 0 }} />
          {sliced.map((item, i) => {
            const absoluteIndex = range.start + i
            const isHovered = hovered?.item.id === item.id
            const dim = hovered && !isHovered
            return (
              <div key={item.id} data-cindex={absoluteIndex} role="option" aria-selected={isHovered} tabIndex={0} className={clsx('relative flex-shrink-0 rounded-md bg-zinc-900/60 overflow-hidden ring-1 ring-zinc-800 focus-visible:ring-2 focus-visible:ring-white/70 outline-none','transition-all duration-200 ease-out',dim ? 'opacity-70' : 'opacity-100')} style={{ width: merged.card.width, height: cardHeight }} onMouseEnter={(e) => handleEnter(item, absoluteIndex, e.currentTarget)} onMouseLeave={() => { }} onFocus={(e) => { focusIndexRef.current = absoluteIndex; ensureVisible(e.currentTarget); handleEnter(item, absoluteIndex, e.currentTarget) }} onBlur={scheduleClear}>
                <PosterImage src={item.poster || item.backdrop || ''} alt={item.title || ''} className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(.33,.66,.4,1)] will-change-transform group-hover:scale-105 group-hover:brightness-110" />
                {/* Removed gradient overlay */}
              </div>
            )
          })}
          <div style={{ width: (items.length - (range.end + 1)) * (merged.card.width + merged.card.gap), flexShrink: 0 }} />
          {hovered && (
            <div className="pointer-events-auto absolute z-30 rounded-md shadow-2xl" style={previewStyle} onMouseEnter={cancelClear} onMouseLeave={scheduleClear}>
              <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-900">
                {/* Use only the poster to keep static visual identity (no backdrop swap) */}
                <PosterImage src={hovered.item.poster || hovered.item.backdrop || ''} alt={hovered.item.title || ''} className="w-full h-full object-cover" />
                {/* Removed gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 select-text">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" className="h-8 px-3 rounded-full bg-white text-black hover:bg-white/90" onClick={(e) => { e.stopPropagation(); onPlay?.(hovered.item.id) }}><Play className="h-4 w-4 mr-1" />Play</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-white/30 text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onAdd?.(hovered.item.id) }}><Plus className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-white/30 text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onInfo?.(hovered.item.id) }}><Info className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1 text-white">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{hovered.item.title}</h3>
                    {renderMeta ? renderMeta(hovered.item) : (<p className="text-xs text-white/70 line-clamp-3">{hovered.item.year || ''} {hovered.item.genre?.slice(0,3).join(' • ')}</p>)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  {/* Removed pop/fade keyframe animation to prevent flicker when switching rapidly between items */}
    </section>
  )
}

export default CinematicRail
