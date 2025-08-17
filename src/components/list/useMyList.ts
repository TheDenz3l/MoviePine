"use client"
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/toast'

export interface ListItem { content_id: string; content_type: string; added_at: string; title?: string; poster?: string; year?: number; rating?: number }
interface State { watchlist: ListItem[] }

let cache: State | null = null
let inflight: Promise<State> | null = null

export function useMyList() {
  const { session } = useAuth()
  const { push } = useToast()
  const [state, setState] = useState<State | null>(cache)
  const [loading, setLoading] = useState(!cache)
  const authHeader: Record<string,string> = session ? { Authorization: `Bearer ${session.access_token}` } : {}

  const load = useCallback(async () => {
    if (!session?.access_token) return
    
    // Validate token format before making request
    if (session.access_token.split('.').length !== 3) {
      console.warn('useMyList: Invalid JWT token format');
      return;
    }
    
    if (cache) { setState(cache); return }
    if (!inflight) {
  inflight = fetch('/api/list?meta=1', { headers: { ...authHeader } })
        .then(r=>{
          if (r.status === 401) {
            console.warn('useMyList: Authentication required');
            throw new Error('AUTH_REQUIRED');
          }
          return r.json();
        })
        .then(json => {
          if (json.success) return { watchlist: json.watchlist } as State
          throw new Error(json.error||'Failed to load list')
        })
        .catch(error => {
          if (error.message === 'AUTH_REQUIRED') {
            // Silent fail for auth issues
            throw error;
          }
          throw error;
        })
        .finally(()=>{ inflight=null })
    }
    setLoading(true)
    try {
      const data = await inflight
      cache = data
      setState(data)
    } catch (e:any) { 
      if (e.message !== 'AUTH_REQUIRED') {
        push({ type:'error', message:e.message })
      }
    }
    finally { setLoading(false) }
  }, [session])

  useEffect(() => { 
    if (!session?.access_token) return;
    
    // Add a small delay to ensure auth is fully established
    const timeoutId = setTimeout(() => {
      load();
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [load])

  const mutate = (fn: (prev: State) => State) => {
    if (state) {
      const next = fn(state)
      cache = next
      setState(next)
    }
  }

  const addWatch = async (content_id: string, content_type: string) => {
    if (!session || state?.watchlist.some(f=>f.content_id===content_id)) return
    const optimistic: ListItem = { content_id, content_type, added_at: new Date().toISOString() }
    mutate(prev => ({ ...prev, watchlist: [optimistic, ...prev.watchlist] }))
  try { window.dispatchEvent(new CustomEvent('app:watchlistAdded', { detail: { id: content_id, type: content_type } })) } catch {}
  try {
    const res = await fetch('/api/list/watchlist', { method:'POST', headers: { 'Content-Type':'application/json', ...authHeader }, body: JSON.stringify({ contentId: content_id, contentType: content_type }) })
    if (res.status === 401) {
      // Authentication failed - fail silently and reload
      load();
      return;
    }
    const json = await res.json(); 
    if (!json.success) { 
      push({ type:'error', message:'Failed to add to watchlist' }); 
      load();
    }
  } catch (error) {
    console.error('Add to watchlist error:', error);
    load();
  }
  }
  const removeWatch = async (content_id: string) => {
    if (!session) return
    mutate(prev => ({ ...prev, watchlist: prev.watchlist.filter(f=>f.content_id!==content_id) }))
  try { window.dispatchEvent(new CustomEvent('app:watchlistRemoved', { detail: { id: content_id } })) } catch {}
  try {
    const res = await fetch(`/api/list/watchlist?id=${encodeURIComponent(content_id)}`, { method:'DELETE', headers: { ...authHeader } })
    if (res.status === 401) {
      // Authentication failed - fail silently and reload  
      load();
      return;
    }
    const json = await res.json(); 
    if (!json.success) { 
      push({ type:'error', message:'Failed to remove from watchlist' }); 
      load();
    }
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    load();
  }
  }

  // Global event listener to centralize toggle operations. Any component can dispatch:
  // window.dispatchEvent(new CustomEvent('app:toggleWatchlist', { detail: { id: 'tt123', type: 'movie' } }))
  useEffect(() => {
    if (!session) return
    function handler(e: Event) {
      const custom = e as CustomEvent<{ id?: string; type?: string }>
      const id = custom.detail?.id
      if (!id) return
      const type = (custom.detail?.type || 'movie').toLowerCase()
      const inList = cache?.watchlist.some(i => i.content_id === id)
      if (inList) {
        // Fire and forget removal
        removeWatch(id)
      } else {
        addWatch(id, type === 'series' ? 'series' : 'movie')
      }
    }
    window.addEventListener('app:toggleWatchlist', handler as EventListener)
    // Passive listeners to keep pages in sync when user returns or navigates
    const vis = () => { if (document.visibilityState === 'visible' && !loading) { load() } }
    document.addEventListener('visibilitychange', vis)
    const navHandler = () => { /* lightweight check: ensure state not stale ( >1 min old ) */ }
    window.addEventListener('focus', vis)
    return () => window.removeEventListener('app:toggleWatchlist', handler as EventListener)
  }, [session, state, loading, load])
  return { watchlist: state?.watchlist || [], loading, reload: load, addWatch, removeWatch }
}
