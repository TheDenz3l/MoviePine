"use client"
import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ToastNotification {
  id: string
  type: 'added' | 'removed'
  title: string
  message: string
  duration: number
}

interface WatchlistToastProps {
  notifications: ToastNotification[]
  onRemove: (id: string) => void
}

function WatchlistToast({ notifications, onRemove }: WatchlistToastProps) {
  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed top-24 right-6 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>,
    document.body
  )
}

function ToastItem({ 
  notification, 
  onRemove 
}: { 
  notification: ToastNotification
  onRemove: (id: string) => void 
}) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(notification.id), 300) // Wait for exit animation
    }, notification.duration)

    return () => clearTimeout(timer)
  }, [notification.id, notification.duration, onRemove])

  const isAdded = notification.type === 'added'

  return (
    <div
      className={`
        pointer-events-auto transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border
        ${isAdded 
          ? 'bg-green-600/90 border-green-500/20 text-white' 
          : 'bg-red-600/90 border-red-500/20 text-white'
        }
      `}>
        <div className="flex-shrink-0">
          {isAdded ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{notification.title}</p>
          <p className="text-xs opacity-90 truncate">{notification.message}</p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true)
            setTimeout(() => onRemove(notification.id), 300)
          }}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Hook to manage toast notifications
export function useWatchlistToast() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  const addNotification = (
    type: 'added' | 'removed',
    title: string,
    message: string,
    duration: number = 3000
  ) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, type, title, message, duration }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  useEffect(() => {
    const handleWatchlistAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; title?: string; type: string }>
      const { title, type } = customEvent.detail
      addNotification(
        'added',
        title || 'Item Added',
        `Added to watchlist • ${type === 'movie' ? 'Movie' : 'TV Show'}`
      )
    }

    const handleWatchlistRemoved = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; title?: string }>
      const { title } = customEvent.detail
      addNotification(
        'removed',
        title || 'Item Removed',
        'Removed from watchlist'
      )
    }

    window.addEventListener('app:watchlistAdded', handleWatchlistAdded as EventListener)
    window.addEventListener('app:watchlistRemoved', handleWatchlistRemoved as EventListener)

    return () => {
      window.removeEventListener('app:watchlistAdded', handleWatchlistAdded as EventListener)
      window.removeEventListener('app:watchlistRemoved', handleWatchlistRemoved as EventListener)
    }
  }, [])

  return {
    notifications,
    removeNotification,
    ToastContainer: () => (
      <WatchlistToast notifications={notifications} onRemove={removeNotification} />
    )
  }
}

export default WatchlistToast
