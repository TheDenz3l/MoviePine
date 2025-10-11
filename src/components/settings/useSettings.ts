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
    if (!session || !session.access_token) {
      console.log('[useSettings] No session or access token available, skipping settings load');
      return;
    }
    setLoading(true)
    try {
      console.log('[useSettings] Loading settings with session token:', session.access_token?.substring(0, 20) + '...');
      const token = session.access_token
      if (!token || token.length < 100) {
        console.warn('[useSettings] Invalid or too short access token, skipping settings load');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/me/settings', { headers: { Authorization: `Bearer ${token}` } })
      console.log('[useSettings] Settings API response:', { status: res.status, ok: res.ok });
      
      // Handle authentication failures silently
      if (res.status === 401) {
        console.warn('Settings: Authentication required, failing silently');
        setError(null); // Clear any previous errors
        return;
      }
      
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
        setError(null); // Clear errors on success
      } else {
        // Don't show unauthorized errors to user
        if (json.error === 'unauthorized') {
          console.warn('Settings: Unauthorized access, failing silently');
          setError(null);
        } else {
          setError(json.error || 'Failed to load settings');
        }
      }
    } catch (e: any) {
      // Don't show auth-related errors to user
      if (e.message.includes('401') || e.message.includes('unauthorized')) {
        console.warn('Settings: Authentication error, failing silently');
        setError(null);
      } else {
        setError(e.message);
      }
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
    if (!session || !session.access_token || !pendingRef.current) return
    const patch = pendingRef.current
    pendingRef.current = null
    const token = session.access_token
    console.log('[useSettings] Flushing settings with token:', token?.substring(0, 20) + '...');
    if (!token || token.length < 100) {
      console.warn('[useSettings] Invalid or too short access token for flush');
      setPending(false);
      return;
    }
    try {
      const res = await fetch('/api/me/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(patch) })
      console.log('[useSettings] Settings flush response:', { status: res.status, ok: res.ok });
      
      // Handle authentication failures silently
      if (res.status === 401) {
        console.warn('Settings flush: Authentication failed, ignoring');
        setPending(false);
        return;
      }
      
      const json = await res.json()
      if (!json.success) {
        // Don't show unauthorized errors
        if (json.error === 'unauthorized') {
          console.warn('Settings flush: Unauthorized access, ignoring');
          setPending(false);
          return;
        }
        throw new Error(json.error || 'Update failed');
      }
      await load()
      setPending(false)
      // fire a single global event so listeners (sections) can show a toast
      try { window.dispatchEvent(new CustomEvent('settings:flushed', { detail: { patch } })) } catch {}
    } catch (e: any) {
      // Handle auth-related errors silently
      if (e.message.includes('401') || e.message.includes('unauthorized')) {
        console.warn('Settings flush: Authentication error, ignoring');
        setPending(false);
        return;
      }
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
