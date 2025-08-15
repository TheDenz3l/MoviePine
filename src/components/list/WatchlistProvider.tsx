"use client"
import React, { createContext, useContext, useCallback } from 'react'
import { useMyList } from './useMyList'

interface WatchlistContextValue {
  watchlist: any[]
  loading: boolean
  isInWatchlist: (id: string) => boolean
  addToWatchlist: (id: string, type?: string, metadata?: any) => Promise<void>
  removeFromWatchlist: (id: string) => Promise<void>
  toggleWatchlist: (id: string, type?: string, metadata?: any) => Promise<void>
  reload: () => Promise<void>
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

interface WatchlistProviderProps {
  children: React.ReactNode
}

export function WatchlistProvider({ children }: WatchlistProviderProps) {
  const { watchlist, loading, addWatch, removeWatch, reload } = useMyList()

  const isInWatchlist = useCallback((id: string) => {
    return watchlist.some(item => item.content_id === id)
  }, [watchlist])

  const addToWatchlist = useCallback(async (id: string, type: string = 'movie', metadata?: any) => {
    if (isInWatchlist(id)) return
    
    await addWatch(id, type)
    
    // Dispatch global event for any components listening
    window.dispatchEvent(new CustomEvent('app:watchlistAdded', { 
      detail: { id, type, metadata } 
    }))
  }, [addWatch, isInWatchlist])

  const removeFromWatchlist = useCallback(async (id: string) => {
    if (!isInWatchlist(id)) return
    
    await removeWatch(id)
    
    // Dispatch global event for any components listening
    window.dispatchEvent(new CustomEvent('app:watchlistRemoved', { 
      detail: { id } 
    }))
  }, [removeWatch, isInWatchlist])

  const toggleWatchlist = useCallback(async (id: string, type: string = 'movie', metadata?: any) => {
    if (isInWatchlist(id)) {
      await removeFromWatchlist(id)
    } else {
      await addToWatchlist(id, type, metadata)
    }
  }, [isInWatchlist, addToWatchlist, removeFromWatchlist])

  const value: WatchlistContextValue = {
    watchlist,
    loading,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    reload
  }

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  )
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider')
  }
  return context
}

export default WatchlistProvider
