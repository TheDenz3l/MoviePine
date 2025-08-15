"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/components/auth/AuthProvider'

export interface UserSettingsData {
  playback?: any
  subtitles?: any
  ui?: any
  privacy?: any
  experiments?: any
}

export function useSettings() {
  const { session } = useAuth()
  const [settings, setSettings] = useState<UserSettingsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const { data: { session: fresh } } = await supabase!.auth.getSession()
      const token = fresh?.access_token
      const res = await fetch('/api/me/settings', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) {
        const s = json.settings || {}
        setSettings({
          playback: s.playback_json || {},
            subtitles: s.subtitles_json || {},
          ui: s.ui_json || {},
          privacy: s.privacy_json || {},
          experiments: s.experiments_json || {}
        })
      } else setError(json.error || 'Failed to load settings')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  // Debounced coalescing update
  const pendingRef = useRef<UserSettingsData | null>(null)
  const timerRef = useRef<any>(null)
  const flushRef = useRef<() => Promise<void>>(async () => {})

  const flush = useCallback(async () => {
    if (!session || !pendingRef.current) return
    const patch = pendingRef.current
    pendingRef.current = null
    const token = session.access_token
    try {
      const res = await fetch('/api/me/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(patch) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Update failed')
      await load()
      setPending(false)
      // fire a single global event so listeners (sections) can show a toast
      try { window.dispatchEvent(new CustomEvent('settings:flushed', { detail: { patch } })) } catch {}
    } catch (e) {
      // simple retry: requeue once
      if (pendingRef.current === null) pendingRef.current = patch
      if (!timerRef.current) timerRef.current = setTimeout(flush, 2500)
    }
  }, [session, load])
  flushRef.current = flush

  const update = useCallback((partial: UserSettingsData) => {
    pendingRef.current = { ...(pendingRef.current || {}), ...partial,
      playback: { ...(pendingRef.current?.playback||{}), ...(partial.playback||{}) },
      subtitles: { ...(pendingRef.current?.subtitles||{}), ...(partial.subtitles||{}) },
      ui: { ...(pendingRef.current?.ui||{}), ...(partial.ui||{}) },
      privacy: { ...(pendingRef.current?.privacy||{}), ...(partial.privacy||{}) },
      experiments: { ...(pendingRef.current?.experiments||{}), ...(partial.experiments||{}) }
    }
    setPending(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => flushRef.current && flushRef.current(), 500)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { settings, loading, error, update, reload: load, flush, pending }
}
