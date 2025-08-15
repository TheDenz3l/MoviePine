"use client"
import { useEffect } from 'react'
import { useSettings } from '@/components/settings/useSettings'

// Applies UI-related settings (e.g., reduced motion) as global classes on the root element.
export function UseApplyUISettings() {
  const { settings } = useSettings()
  useEffect(() => {
    const reduced = settings?.ui?.reducedMotion
    const root = document.documentElement
    if (reduced) root.classList.add('reduced-motion')
    else root.classList.remove('reduced-motion')
  }, [settings?.ui?.reducedMotion])
  return null
}
