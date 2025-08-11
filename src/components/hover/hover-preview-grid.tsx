"use client"

import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface HoverPreviewItemBase {
  id: string
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface HoverState<T> {
  item: T
  rect: Rect
}

export interface HoverPreviewGridProps<T extends HoverPreviewItemBase> {
  items: T[]
  renderBase: (item: T) => ReactNode
  renderPreview: (item: T) => ReactNode
  getKey?: (item: T) => string
  containerClassName?: string
  itemWrapperClassName?: string
  scale?: number
  liftPx?: number
  transitionMs?: number
  /**
   * Optional external ref to the container. Enables parent components to imperatively
   * control scrolling (for horizontal rail use-cases) or measure layout.
   */
  containerRefProp?: React.Ref<HTMLDivElement>
  /** When true, adjust transform origin to keep enlarged preview in view (useful for horizontal rails). */
  adaptiveEdges?: boolean
  /** Dim non‑hovered siblings for stronger focus */
  dimSiblings?: boolean
  /** Apply a bounce pop animation on enter */
  playfulBounce?: boolean
  enlargeFactor?: number
  expansionStrategy?: 'scale' | 'expand'
  activationDelayMs?: number
}

export function HoverPreviewGrid<T extends HoverPreviewItemBase>({
  items,
  renderBase,
  renderPreview,
  getKey,
  containerClassName,
  itemWrapperClassName,
  scale = 1.08,
  liftPx = 2,
  transitionMs = 220,
  containerRefProp,
  adaptiveEdges = true,
  dimSiblings = true,
  playfulBounce = true,
  enlargeFactor = 1.12,
  expansionStrategy = 'expand',
  activationDelayMs = 60,
}: HoverPreviewGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<HoverState<T> | null>(null)
  const prevRectRef = useRef<Rect | null>(null)
  const clearTimer = useRef<number | null>(null)
  const activateTimer = useRef<number | null>(null)

  const keyFor = useCallback((item: T) => (getKey ? getKey(item) : item.id), [getKey])

  const computeRect = useCallback((el: HTMLDivElement): Rect => {
    const c = containerRef.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!c) return { left: r.left, top: r.top, width: r.width, height: r.height }
    return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height }
  }, [])

  const handleEnter = useCallback((item: T, el: HTMLDivElement) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    const nextRect = computeRect(el)
    activateTimer.current = window.setTimeout(() => {
      setHovered(curr => { if (curr) prevRectRef.current = curr.rect; return { item, rect: nextRect } })
    }, activationDelayMs)
  }, [computeRect, activationDelayMs])

  const scheduleClear = useCallback(() => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    clearTimer.current = window.setTimeout(() => setHovered(null), 70)
  }, [])

  useEffect(() => {
    return () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current)
      if (activateTimer.current) window.clearTimeout(activateTimer.current)
    }
  }, [])

  const previewStyle: CSSProperties | undefined = useMemo(() => {
    if (!hovered) return undefined
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 0
    let origin: string = "center bottom"
    if (adaptiveEdges && containerWidth) {
      const left = hovered.rect.left
      const rightSpace = containerWidth - (hovered.rect.left + hovered.rect.width)
      if (left < 60) origin = "left bottom"
      else if (rightSpace < 60) origin = "right bottom"
    }
    // Direction aware translation: if previous rect exists and y is same row, use a subtle slide
    const prev = prevRectRef.current
    let extraTranslate = ""
    if (prev) {
      const dx = hovered.rect.left - prev.left
      const sameRow = Math.abs(hovered.rect.top - prev.top) < 4
      if (sameRow) {
        const damped = Math.max(Math.min(dx, 60), -60)
        // Start offset will be applied via keyframe (slide-in). Here final position only.
        extraTranslate = "" // no change needed in final style
      }
    }
    const base = {
      left: 0,
      top: 0,
      width: hovered.rect.width,
      height: hovered.rect.height,
      transformOrigin: origin,
      boxShadow: "0 22px 48px -8px rgba(0,0,0,0.55), 0 4px 12px -2px rgba(0,0,0,0.3)",
      transition: `transform ${transitionMs}ms cubic-bezier(.33,.66,.4,1), width ${transitionMs}ms cubic-bezier(.33,.66,.4,1), height ${transitionMs}ms cubic-bezier(.33,.66,.4,1), box-shadow ${transitionMs}ms ease` as const,
    }
    if (expansionStrategy === 'scale') {
      return {
        ...base,
        transform: `translate3d(${hovered.rect.left}px, ${hovered.rect.top}px,0) scale(${scale}) translateY(-${liftPx}px)`
      }
    }
    const targetW = hovered.rect.width * enlargeFactor
    const targetH = hovered.rect.height * enlargeFactor
    const dx = (targetW - hovered.rect.width) / 2
    const dy = (targetH - hovered.rect.height) + liftPx
    return {
      ...base,
      width: targetW,
      height: targetH,
      transform: `translate3d(${hovered.rect.left - dx}px, ${hovered.rect.top - dy}px,0)`
    }
  }, [hovered, liftPx, scale, transitionMs, adaptiveEdges, expansionStrategy, enlargeFactor])

  // Helper to merge internal ref with optional external ref
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    if (!containerRefProp) return
    if (typeof containerRefProp === "function") {
      containerRefProp(el)
    } else {
      try {
        ;(containerRefProp as React.MutableRefObject<HTMLDivElement | null>).current = el
      } catch {
        // ignore – non critical
      }
    }
  }, [containerRefProp])

  return (
    <div
      ref={setContainerRef}
      className={containerClassName}
      onMouseLeave={scheduleClear}
    >
      {items.map((item) => {
        const isCurrent = hovered && keyFor(hovered.item) === keyFor(item)
        // Gentle dim (not drastic) to reduce harshness
        const siblingDim = dimSiblings && hovered && !isCurrent
        return (
          <div
            key={keyFor(item)}
            className={itemWrapperClassName + (siblingDim ? " opacity-80 transition-opacity duration-150" : " transition-opacity duration-100")}
            onMouseLeave={() => { /* container handles clear */ }}
            onMouseEnter={(e) => handleEnter(item, e.currentTarget as HTMLDivElement)}
          >
            {renderBase(item)}
          </div>
        )
      })}

      {hovered && (
        <div
          className="pointer-events-none absolute z-30 will-change-transform transform-gpu"
          style={previewStyle}
          onMouseEnter={() => {
            if (clearTimer.current) {
              window.clearTimeout(clearTimer.current)
              clearTimer.current = null
            }
          }}
          onMouseLeave={scheduleClear}
        >
          <div className="preview-outer-mask">
            {/* Removed fade/slide animation for instant switching between titles */}
            <div className="preview-media-layer origin-inherit" data-anim-bounce={playfulBounce ? "1" : undefined}>
              {renderPreview(hovered.item)}
            </div>
          </div>
        </div>
      )}
      {/* Inline keyframes injection (scoped) */}
      <style>
        {`
        .preview-outer-mask{position:relative;width:100%;height:100%;overflow:hidden;border-radius:inherit;}
        /* Transition on transform kept for expand/scale smoothness; no fade/slide between items */
        .preview-media-layer{will-change:transform;transition:transform ${transitionMs}ms cubic-bezier(.33,.66,.4,1);height:100%;}
        @media (prefers-reduced-motion:reduce){.preview-media-layer{transition:none !important}}
        `}
      </style>
    </div>
  )
}

export default HoverPreviewGrid
