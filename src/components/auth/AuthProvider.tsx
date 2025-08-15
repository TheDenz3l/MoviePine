"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextValue {
  user: any | null
  session: any | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Session device registration & heartbeat
  useEffect(() => {
    if (!session) return
    let cancelled = false
    const key = 'device_session_id'
    const register = async () => {
      try {
        const existing = localStorage.getItem(key)
        // Always ensure heartbeat on existing id; if revoked server will ignore update
        if (existing) {
          await fetch('/api/me/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id: existing }) })
          return existing
        }
        const label = navigator.userAgent.split(' ').slice(0,2).join(' ')
        const res = await fetch('/api/me/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ deviceLabel: label }) })
        const json = await res.json()
        if (json.success && json.session?.id) localStorage.setItem(key, json.session.id)
        return json.session?.id
      } catch { /* ignore */ }
    }
    let heartbeatTimer: any
    const startHeartbeat = (id?: string) => {
      heartbeatTimer = setInterval(() => {
        const deviceId = id || localStorage.getItem(key)
        if (!deviceId) return
        fetch('/api/me/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id: deviceId }) })
      }, 5 * 60 * 1000) // 5 min
    }
    register().then(id => { if (!cancelled) startHeartbeat(id) })
    const vis = () => {
      if (document.visibilityState === 'visible') {
        const deviceId = localStorage.getItem(key)
        if (deviceId) fetch('/api/me/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id: deviceId }) })
      }
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelled = true
      clearInterval(heartbeatTimer)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [session])

  const signInWithMagicLink = async (email: string) => {
    if (!supabase) return { error: new Error('Auth disabled') }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    return { error }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
