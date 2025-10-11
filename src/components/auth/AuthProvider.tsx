"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  StandardSession, 
  StandardUser, 
  SessionSource, 
  normalizeSession, 
  isValidSession,
  COOKIE_CONFIGS 
} from '@/lib/types/auth'

interface AuthContextValue {
  user: StandardUser | null
  session: StandardSession | null
  loading: boolean
  error: string | null
  signInWithMagicLink: (email: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StandardUser | null>(null)
  const [session, setSession] = useState<StandardSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  
  const pushDebug = (msg: string) => {
    setDebugInfo(d => [...d.slice(-40), `${new Date().toLocaleTimeString()} ${msg}`])
  }

  // Simplified session loading with clear priority order
  const loadSession = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('[AuthProvider] Starting session load...')
      
      // Priority 1: Try server API (most reliable)
      const serverSession = await tryServerSession()
      if (serverSession) {
        setSession(serverSession)
        setUser(serverSession.user)
        pushDebug(`Loaded from server: ${serverSession.user.email}`)
        return
      }

      // Priority 2: Try client cookies (fallback)
      const cookieSession = await tryClientCookies()
      if (cookieSession) {
        setSession(cookieSession)
        setUser(cookieSession.user)
        pushDebug(`Loaded from cookies: ${cookieSession.user.email}`)
        return
      }

      // Priority 3: Try Supabase client (last resort)
      const supabaseSession = await trySupabaseClient()
      if (supabaseSession) {
        setSession(supabaseSession)
        setUser(supabaseSession.user)
        pushDebug(`Loaded from Supabase: ${supabaseSession.user.email}`)
        return
      }

      // No session found
      console.log('[AuthProvider] No valid session found')
      setSession(null)
      setUser(null)
      pushDebug('No session found')

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      console.error('[AuthProvider] Error loading session:', errorMsg)
      setError(errorMsg)
      pushDebug(`Error: ${errorMsg}`)
      setSession(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Try to load session from server API
  const tryServerSession = async (): Promise<StandardSession | null> => {
    try {
      console.log('[AuthProvider] Trying server session...')
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.log('[AuthProvider] Server session failed:', response.status)
        return null
      }

      const data = await response.json()
      console.log('[AuthProvider] Server response:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        error: data.error
      })

      if (data.error || !data.session) {
        return null
      }

      const normalized = normalizeSession(data.session, SessionSource.SERVER_API)
      return isValidSession(normalized) ? normalized : null

    } catch (e) {
      console.log('[AuthProvider] Server session error:', e)
      return null
    }
  }

  // Try to load session from client cookies
  const tryClientCookies = async (): Promise<StandardSession | null> => {
    try {
      console.log('[AuthProvider] Trying client cookies...')
      
      const accessToken = getCookie(COOKIE_CONFIGS.CLIENT_ACCESS_TOKEN.name)
      const refreshToken = getCookie(COOKIE_CONFIGS.CLIENT_REFRESH_TOKEN.name)
      
      console.log('[AuthProvider] Client cookies:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length || 0
      })

      if (!accessToken || !supabase) {
        return null
      }

      // Validate token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(accessToken)
      
      if (error || !user) {
        console.log('[AuthProvider] Cookie token validation failed:', error?.message)
        return null
      }

      const rawSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: user,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }

      const normalized = normalizeSession(rawSession, SessionSource.CLIENT_COOKIES)
      return isValidSession(normalized) ? normalized : null

    } catch (e) {
      console.log('[AuthProvider] Client cookies error:', e)
      return null
    }
  }

  // Try to load session from Supabase client
  const trySupabaseClient = async (): Promise<StandardSession | null> => {
    try {
      console.log('[AuthProvider] Trying Supabase client...')
      
      if (!supabase) {
        return null
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        console.log('[AuthProvider] Supabase client session failed:', error?.message)
        return null
      }

      console.log('[AuthProvider] Supabase session found:', {
        user: session.user?.email,
        hasAccessToken: !!session.access_token
      })

      const normalized = normalizeSession(session, SessionSource.SUPABASE_CLIENT)
      return isValidSession(normalized) ? normalized : null

    } catch (e) {
      console.log('[AuthProvider] Supabase client error:', e)
      return null
    }
  }

  // Helper to get cookie value
  const getCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined
    
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(`${name}=`))
      ?.split('=')[1]
  }

  // Refresh session manually
  const refreshSession = async (): Promise<void> => {
    console.log('[AuthProvider] Manual session refresh requested')
    await loadSession()
  }

  // Initial session load
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      if (mounted) {
        await loadSession()
      }
    }

    initializeAuth()

    // Set up Supabase auth state listener
    let authListener: any = null
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
        if (!mounted) return

        console.log('[AuthProvider] Auth state change:', event, supabaseSession?.user?.email)
        pushDebug(`Auth event: ${event}`)

        if (event === 'SIGNED_IN' && supabaseSession) {
          const normalized = normalizeSession(supabaseSession, SessionSource.SUPABASE_CLIENT)
          if (isValidSession(normalized)) {
            setSession(normalized)
            setUser(normalized.user)
            pushDebug(`Signed in: ${normalized.user.email}`)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          pushDebug('Signed out')
        } else if (event === 'TOKEN_REFRESHED' && supabaseSession) {
          const normalized = normalizeSession(supabaseSession, SessionSource.SUPABASE_CLIENT)
          if (isValidSession(normalized)) {
            setSession(normalized)
            setUser(normalized.user)
            pushDebug(`Token refreshed: ${normalized.user.email}`)
          }
        }
      })

      authListener = subscription
    }

    return () => {
      mounted = false
      if (authListener) {
        authListener.unsubscribe()
      }
    }
  }, [])

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
          } else if (data.session && data.user) {
            console.log('[AuthProvider] verifyOtp success', { user: data.user.email })
            pushDebug('verifyOtp success for ' + (data.user.email || 'unknown'))
            
            // Normalize the session from Supabase
            const normalized = normalizeSession(data.session, SessionSource.SUPABASE_CLIENT)
            if (isValidSession(normalized)) {
              setSession(normalized)
              setUser(normalized.user)
            }
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
      console.log('[AuthProvider] Error processing magic link:', e)
    }
  }, [session])

  // Session device registration & heartbeat
  useEffect(() => {
    if (!session?.access_token || session.access_token.length < 100) return
    
    let cancelled = false
    const key = 'device_session_id'
    
    const register = async () => {
      try {
        const existing = localStorage.getItem(key)
        // Always ensure heartbeat on existing id; if revoked server will ignore update
        if (existing) {
          await fetch('/api/me/sessions', { 
            method: 'PATCH', 
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${session.access_token}` 
            }, 
            body: JSON.stringify({ id: existing }) 
          })
          return existing
        }
        
        const label = navigator.userAgent.split(' ').slice(0, 2).join(' ')
        const res = await fetch('/api/me/sessions', { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${session.access_token}` 
          }, 
          body: JSON.stringify({ deviceLabel: label }) 
        })
        
        const json = await res.json()
        if (json.success && json.session?.id) {
          localStorage.setItem(key, json.session.id)
        }
        return json.session?.id
      } catch (e) {
        console.log('[AuthProvider] Session registration error:', e)
        return null
      }
    }
    
    let heartbeatTimer: any
    const startHeartbeat = (id?: string) => {
      heartbeatTimer = setInterval(() => {
        const deviceId = id || localStorage.getItem(key)
        if (!deviceId || !session?.access_token) return
        
        fetch('/api/me/sessions', { 
          method: 'PATCH', 
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${session.access_token}` 
          }, 
          body: JSON.stringify({ id: deviceId }) 
        }).catch(e => console.log('[AuthProvider] Heartbeat error:', e))
      }, 5 * 60 * 1000) // 5 min
    }
    
    register().then(id => { 
      if (!cancelled && id) startHeartbeat(id) 
    })
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.access_token) {
        const deviceId = localStorage.getItem(key)
        if (deviceId) {
          fetch('/api/me/sessions', { 
            method: 'PATCH', 
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${session.access_token}` 
            }, 
            body: JSON.stringify({ id: deviceId }) 
          }).catch(e => console.log('[AuthProvider] Visibility heartbeat error:', e))
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      cancelled = true
      clearInterval(heartbeatTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session])

  const signInWithMagicLink = async (email: string) => {
    if (!supabase) return { error: new Error('Auth disabled') }
    
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

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)
    
    // Add Authorization header if we have a session
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
      console.log('[AuthProvider] Adding Authorization header to request:', url)
    } else {
      console.warn('[AuthProvider] No session token available for authenticated request:', url)
    }
    
    return fetch(url, {
      ...options,
      headers
    })
  }

  const signOut = async () => {
    console.log('[AuthProvider] Signing out...')
    
    // Clear server session
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('[AuthProvider] Failed to clear server session:', e)
    }
    
    // Clear client state
    setSession(null)
    setUser(null)
    setError(null)
    pushDebug('Signed out')
    
    // Clear local storage
    localStorage.removeItem('device_session_id')
    
    // Also sign out from Supabase if available
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      error, 
      signInWithMagicLink, 
      signOut, 
      authenticatedFetch, 
      refreshSession 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
