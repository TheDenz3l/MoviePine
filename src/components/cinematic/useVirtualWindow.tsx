"use client"
import { useEffect, useRef, useState } from 'react'

export function useHorizontalVirtualWindow(count: number, cardWidth: number, gap: number, bufferPx: number) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState({ start: 0, end: Math.min(count - 1, 30) })
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function update() {
      if (!el) return
      const scrollLeft = el.scrollLeft
      const vw = el.clientWidth
      const totalPerItem = cardWidth + gap
      const startIndex = Math.max(0, Math.floor((scrollLeft - bufferPx) / totalPerItem))
      const endIndex = Math.min(count - 1, Math.ceil((scrollLeft + vw + bufferPx) / totalPerItem))
      setRange(r => (r.start === startIndex && r.end === endIndex) ? r : { start: startIndex, end: endIndex })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [count, cardWidth, gap, bufferPx])
  return { containerRef, range }
}
