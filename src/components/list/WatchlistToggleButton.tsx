"use client"
import { Plus, Check } from 'lucide-react'
import clsx from 'clsx'
import { useState, useEffect } from 'react'

interface WatchlistToggleButtonProps {
  inList: boolean
  size?: number // used for 'icon' variant
  onToggle: () => void
  className?: string
  ariaLabelAdd?: string
  ariaLabelRemove?: string
  showCheckAnimation?: boolean
  /** visual style variant */
  variant?: 'icon' | 'overlay'
}

export function WatchlistToggleButton({ 
  inList, 
  size = 32, 
  onToggle, 
  className = '', 
  ariaLabelAdd = 'Add to Watchlist', 
  ariaLabelRemove = 'Remove from Watchlist',
  showCheckAnimation = true,
  variant = 'icon'
}: WatchlistToggleButtonProps) {
  const iconSize = Math.round(size * 0.55)
  const [justAdded, setJustAdded] = useState(false)
  const [animate, setAnimate] = useState(false)

  // Trigger animation when item is added to list
  useEffect(() => {
    if (variant === 'overlay') return
    if (inList && !justAdded && showCheckAnimation) {
      setJustAdded(true)
      setAnimate(true)
      const timer = setTimeout(() => { setAnimate(false) }, 600)
      return () => clearTimeout(timer)
    }
    if (!inList) setJustAdded(false)
  }, [inList, justAdded, showCheckAnimation])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle()
    
    // Reset animation state when manually toggling
    if (!inList) {
      setJustAdded(false)
    }
  }

  const isOverlay = variant === 'overlay'
  const baseIcon = (
    <div className={clsx('transition-transform duration-200', animate && 'scale-125')}> 
      {inList ? (
        <Check 
          style={{ width: iconSize, height: iconSize }} 
          className={clsx('transition-all duration-200', animate && 'text-white drop-shadow-lg')} 
        />
      ) : (
        <Plus style={{ width: iconSize, height: iconSize }} />
      )}
    </div>
  )

  if (isOverlay) {
    return (
      <button
        type="button"
        aria-pressed={inList}
        aria-label={inList ? ariaLabelRemove : ariaLabelAdd}
        onClick={handleClick}
        style={{ width: size, height: size }}
        className={clsx(
          'rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white transition-colors duration-200',
          inList
            ? 'bg-red-600 text-white hover:bg-red-500'
            : 'bg-zinc-800/80 text-white hover:bg-zinc-700/80',
          className
        )}
      >
        {baseIcon}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={inList}
      aria-label={inList ? ariaLabelRemove : ariaLabelAdd}
      onClick={handleClick}
      style={{ width: size, height: size }}
      className={clsx(
        'rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200',
        inList 
          ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg' 
          : 'bg-zinc-800/70 text-white hover:bg-white hover:text-black',
        animate && 'animate-pulse scale-110 bg-green-500 hover:bg-green-400',
        className
      )}
    >
      {baseIcon}
    </button>
  )
}

export default WatchlistToggleButton
