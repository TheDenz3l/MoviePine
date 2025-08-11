import { useCallback, useEffect, useRef, useState } from 'react'

export interface SharedPreviewState<T> { item: T; rect: DOMRect }

export interface UseSharedPreviewOptions {
  activationDelay?: number
  clearDelay?: number
}

export function useSharedPreview<T>({ activationDelay = 50, clearDelay = 60 }: UseSharedPreviewOptions) {
  const [hovered, setHovered] = useState<SharedPreviewState<T> | null>(null)
  const clearTimer = useRef<number | null>(null)
  const activateTimer = useRef<number | null>(null)

  const enter = useCallback((item: T, rect: DOMRect) => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    activateTimer.current = window.setTimeout(() => setHovered({ item, rect }), activationDelay)
  }, [activationDelay])

  const scheduleClear = useCallback(() => {
    if (activateTimer.current) { window.clearTimeout(activateTimer.current); activateTimer.current = null }
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    clearTimer.current = window.setTimeout(() => setHovered(null), clearDelay)
  }, [clearDelay])

  const cancelClear = useCallback(() => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null }
  }, [])

  useEffect(() => () => {
    if (clearTimer.current) window.clearTimeout(clearTimer.current)
    if (activateTimer.current) window.clearTimeout(activateTimer.current)
  }, [])

  return { hovered, enter, scheduleClear, cancelClear, setHovered }
}

export default useSharedPreview
