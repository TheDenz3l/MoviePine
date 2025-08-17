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
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const pushDebug = (msg: string) => setDebugInfo(d => [...d.slice(-40), `${new Date().toLocaleTimeString()} ${msg}`])

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      setLoading(true);
      try {
        // Try fetching session from our server API first
        const serverResponse = await fetch('/api/auth/session');
        const serverData = await serverResponse.json();

        if (serverData.session && mounted) {
          setSession(serverData.session);
          setUser(serverData.session.user);
          pushDebug('Loaded session from server API');
          return; // Exit early if we have a server session
        }

        // If no session from server, try Supabase client (e.g., initial load or client-side only changes)
        if (supabase) {
          const { data: { session: clientSession } } = await supabase.auth.getSession();
          if (mounted && clientSession) {
            setSession(clientSession);
            setUser(clientSession.user);
            pushDebug('Loaded session from Supabase client');
          }
        }
      } catch (e) {
        console.error('[AuthProvider] Error loading session:', e);
        pushDebug(`Error loading session: ${(e as Error).message}`);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          pushDebug(`Auth state change: ${session ? 'session present' : 'no session'}`);
        }
      });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Process magic link token_hash forwarded via /api/auth/callback redirect
  useEffect(() => {
    if (!supabase) return
      try {
      const url = new URL(window.location.href)
      const tokenHash = url.searchParams.get('token_hash')
      const typeParam = url.searchParams.get('type') as any
      if (tokenHash) {
    pushDebug('token_hash detected; calling verifyOtp')
    console.log('[AuthProvider] Detected token_hash, attempting verifyOtp', { type: typeParam })
    supabase.auth.verifyOtp({
          type: (typeParam || 'magiclink'),
          token_hash: tokenHash
        } as any).then(({ data, error }) => {
          if (error) {
      console.error('[AuthProvider] verifyOtp error', error)
      pushDebug('verifyOtp error: ' + error.message)
          } else {
      console.log('[AuthProvider] verifyOtp success', { user: data.user?.email })
      pushDebug('verifyOtp success for ' + (data.user?.email || 'unknown'))
            setSession(data.session)
            setUser(data.user ?? null)
          }
          // Clean URL to remove sensitive params
          url.searchParams.delete('token_hash')
          url.searchParams.delete('type')
          if (history.replaceState) {
            history.replaceState({}, document.title, url.pathname + (url.search ? '?' + url.searchParams.toString() : ''))
          }
        })
      }
    } catch (e) {
      // ignore
    }
  }, [session])

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
    
    // Use our API endpoint instead of direct Supabase call
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return { error: new Error(data.error || 'Failed to send magic link') }
      }
      
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') }
    }
  }

  const signOut = async () => {
    // Clear server session
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Failed to clear server session:', e)
    }
    
    // Clear client state
    setSession(null)
    setUser(null)
    
    // Also sign out from Supabase if available
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithMagicLink, signOut }}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <div style={{position:'fixed',bottom:8,right:8,fontSize:10,background:'rgba(0,0,0,0.6)',padding:'6px 8px',border:'1px solid #333',borderRadius:4,maxWidth:260,maxHeight:160,overflow:'auto',zIndex:9999}}>
          <div style={{fontWeight:'bold',marginBottom:4}}>Auth Debug</div>
          <div>User: {user?.email || 'none'}</div>
            {debugInfo.slice().reverse().map((l,i)=>(<div key={i}>{l}</div>))}
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
