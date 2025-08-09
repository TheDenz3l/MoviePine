"use client"

import React from 'react'

interface ImdbRatingProps {
  rating?: number | null // expected 0-10 scale (TMDB style). If >10 we'll normalize.
  className?: string
  size?: 'micro' | 'compact' | 'xs' | 'sm' | 'md'
  showSlashTen?: boolean
}

/**
 * Small reusable IMDb style rating badge.
 * Accepts a rating on 0-10 scale (or 0-100 which will be normalized) and renders: [IMDb] 7.8/10
 */
export function ImdbRating({ rating, className = '', size = 'sm', showSlashTen = true }: ImdbRatingProps) {
  if (rating == null || isNaN(rating)) return null
  const normalized = rating > 10 ? rating / 10 : rating
  if (normalized <= 0) return null

  const textSize =
    size === 'micro' ? 'text-[9px]' :
    size === 'compact' ? 'text-[10px]' :
    size === 'xs' ? 'text-[10px]' :
    size === 'sm' ? 'text-[11px]' : 'text-sm'

  // Make compact variant visually tighter than xs
  const badgePadding =
    size === 'micro' ? 'px-0.5 py-px' :
    size === 'compact' ? 'px-1 py-[1px]' :
    size === 'xs' ? 'px-1 py-0.5' :
    size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'

  // Slightly smaller logo text for compact relative to rating text
  const badgeTextSize =
    size === 'micro' ? 'text-[9px]' :
    size === 'compact' ? 'text-[9px]' : ''

  return (
    <span className={`inline-flex items-center ${size==='micro' ? 'space-x-[2px]' : size==='compact' ? 'space-x-0.5' : 'space-x-1'} ${className}`}>
      <span
        aria-label="IMDb rating"
        className={`rounded ${badgePadding} ${size==='micro' ? 'font-semibold' : 'font-bold'} bg-[#F5C518] text-black leading-none ${badgeTextSize}`}
      >
        IMDb
      </span>
      <span className={`text-white tabular-nums ${textSize} ${size==='micro' ? 'font-semibold leading-none' : 'font-medium'}`}>
        {normalized.toFixed(1)}{showSlashTen && '/10'}
      </span>
    </span>
  )
}

export default ImdbRating
