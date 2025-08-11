"use client"
import React, { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSharedPreview } from './useSharedPreview'

export interface CinematicGridItemBase { id: string }

interface Rect { left: number; top: number; width: number; height: number }

interface HoverState<T> { item: T; rect: Rect }

export interface CinematicGridProps<T extends CinematicGridItemBase> {
  items: T[]
  renderBase: (item: T) => ReactNode
  renderPreview: (item: T) => ReactNode
  containerClassName?: string
  itemClassName?: string
  activationDelayMs?: number
  retainDelayMs?: number
  enlargeFactor?: number
  liftPx?: number
  transitionMs?: number
}

export function CinematicGrid<T extends CinematicGridItemBase>({
  items,
  renderBase,
  renderPreview,
  containerClassName = '',
  itemClassName = '',
  activationDelayMs = 50,
  retainDelayMs = 60,
  enlargeFactor = 1.12,
  liftPx = 14,
  transitionMs = 160,
}: CinematicGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { hovered, enter, scheduleClear, cancelClear } = useSharedPreview<HoverState<T>["item"]>({ activationDelay: activationDelayMs, clearDelay: retainDelayMs })
  // Track last item id to disable positional transition on change (no sliding across grid)
  const lastIdRef = useRef<string | null>(null)
  const switchedRef = useRef(false)
  if (hovered?.item.id !== lastIdRef.current) {
    switchedRef.current = true
    lastIdRef.current = hovered?.item.id || null
  }

  const computeRect = useCallback((el: HTMLDivElement): Rect => {
    const c = containerRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!c) return { left: r.left, top: r.top, width: r.width, height: r.height }
    return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height }
  }, [])

  const handleEnter = useCallback((item: T, el: HTMLDivElement) => {
    const rectRaw = computeRect(el)
    const rect = new DOMRect(rectRaw.left, rectRaw.top, rectRaw.width, rectRaw.height)
    enter(item, rect)
  }, [computeRect, enter])

  const previewStyle = useMemo(() => {
    if (!hovered) return { opacity: 0, pointerEvents: 'none' as const }
    const { rect } = hovered
    const targetW = rect.width * enlargeFactor
    const targetH = rect.height * enlargeFactor
    const dx = (targetW - rect.width) / 2
    const dy = (targetH - rect.height) - liftPx
    const noSlide = switchedRef.current
    if (switchedRef.current) requestAnimationFrame(() => { switchedRef.current = false })
    return {
      opacity: 1,
      transform: `translate3d(${rect.left - dx}px, ${rect.top - dy}px,0)` ,
      width: targetW,
      height: targetH,
      transition: noSlide ? 'none' : `width ${transitionMs}ms ease, height ${transitionMs}ms ease`,
    }
  }, [hovered, enlargeFactor, liftPx, transitionMs])

  return (
    <div
      ref={containerRef}
      className={`cinematic-grid relative ${containerClassName}`}
      onMouseLeave={scheduleClear}
    >
      {items.map(item => (
        <div
          key={item.id}
          className={`cg-item relative ${itemClassName}`}
          onMouseEnter={(e) => handleEnter(item, e.currentTarget as HTMLDivElement)}
        >
          {renderBase(item)}
        </div>
      ))}
  <div className="cg-preview-layer pointer-events-auto absolute z-40 will-change-transform" style={previewStyle} onMouseEnter={cancelClear} onMouseLeave={scheduleClear}>
        {hovered && (
          <div className="cg-preview-outer relative w-full h-full rounded-md overflow-hidden shadow-xl ring-1 ring-black/40 bg-zinc-900">
            {renderPreview(hovered.item)}
          </div>
        )}
      </div>
      <style>{`
        .cinematic-grid .cg-item { transition: opacity ${transitionMs}ms linear; }
        .cinematic-grid .cg-item:hover { z-index: 10; }
      `}</style>
    </div>
  )
}

export default CinematicGrid
