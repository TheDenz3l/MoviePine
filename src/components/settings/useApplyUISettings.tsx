"use client"
import { useEffect, useRef } from 'react'
import { useSettings } from '@/components/settings/useSettings'

// Applies UI-related settings (theme, reduced motion) globally.
// Theme precedence: explicit user setting -> stored localStorage -> system preference.
export function UseApplyUISettings() {
  const { settings } = useSettings()
  const mediaRef = useRef<MediaQueryList | null>(null)

  useEffect(() => {
    const applyTheme = (pref?: string) => {
      const root = document.documentElement
      const stored = localStorage.getItem('ui_theme') || 'dark'
      const theme = (pref || settings?.ui?.theme || stored || 'dark').toLowerCase()
      if (theme !== stored) {
        // keep localStorage in sync if coming from settings
        if (pref || settings?.ui?.theme) localStorage.setItem('ui_theme', theme)
      }
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = theme === 'dark' || (theme === 'system' && systemDark)
      root.classList.toggle('dark', isDark)
    }

    // Initial application
    applyTheme()

    // Reduced motion
    const reduced = settings?.ui?.reducedMotion
    const root = document.documentElement
    if (reduced) root.classList.add('reduced-motion')
    else root.classList.remove('reduced-motion')

    // System listener if user chose system
    if (settings?.ui?.theme === 'system') {
      mediaRef.current = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme('system')
      mediaRef.current.addEventListener('change', listener)
      return () => mediaRef.current?.removeEventListener('change', listener)
    }
  }, [settings?.ui?.theme, settings?.ui?.reducedMotion])
  return null
}
