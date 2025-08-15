"use client"
import { useCallback } from 'react'
import { useMyList } from './useMyList'

interface UseWatchlistActionsResult {
  isInWatchlist: (id: string) => boolean
  addToWatchlist: (id: string, type?: string, title?: string, poster?: string) => void
  removeFromWatchlist: (id: string) => void
  toggleWatchlist: (id: string, type?: string, title?: string, poster?: string) => void
  watchlistCount: number
}

/**
 * Universal hook for watchlist operations across all components
 * Provides consistent watchlist functionality with visual feedback
 */
export function useWatchlistActions(): UseWatchlistActionsResult {
  const { watchlist, addWatch, removeWatch } = useMyList()

  const isInWatchlist = useCallback((id: string) => {
    return watchlist.some(item => item.content_id === id)
  }, [watchlist])

  const addToWatchlist = useCallback((
    id: string, 
    type: string = 'movie', 
    title?: string, 
    poster?: string
  ) => {
    if (isInWatchlist(id)) return
    
    // Add to backend
    addWatch(id, type)
    
    // Dispatch global event with metadata for UI feedback
    window.dispatchEvent(new CustomEvent('app:watchlistAdded', { 
      detail: { 
        id, 
        type, 
        title, 
        poster,
        timestamp: new Date().toISOString()
      } 
    }))
  }, [addWatch, isInWatchlist])

  const removeFromWatchlist = useCallback((id: string) => {
    if (!isInWatchlist(id)) return
    
    // Remove from backend
    removeWatch(id)
    
    // Dispatch global event
    window.dispatchEvent(new CustomEvent('app:watchlistRemoved', { 
      detail: { 
        id,
        timestamp: new Date().toISOString()
      } 
    }))
  }, [removeWatch, isInWatchlist])

  const toggleWatchlist = useCallback((
    id: string, 
    type: string = 'movie', 
    title?: string, 
    poster?: string
  ) => {
    if (isInWatchlist(id)) {
      removeFromWatchlist(id)
    } else {
      addToWatchlist(id, type, title, poster)
    }
  }, [isInWatchlist, addToWatchlist, removeFromWatchlist])

  return {
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    watchlistCount: watchlist.length
  }
}

export default useWatchlistActions
