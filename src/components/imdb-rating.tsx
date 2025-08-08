"use client"

import React from 'react'

interface ImdbRatingProps {
  rating?: number | null // expected 0-10 scale (TMDB style). If >10 we'll normalize.
  className?: string
  size?: 'sm' | 'md'
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

  const textSize = size === 'sm' ? 'text-[11px]' : 'text-sm'
  const badgePadding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'

  return (
    <span className={`inline-flex items-center space-x-1 ${className}`}>      
      <span
        aria-label="IMDb rating"
        className={`font-bold rounded ${badgePadding} bg-[#F5C518] text-black leading-none`}
      >
        IMDb
      </span>
      <span className={`font-medium text-white tabular-nums ${textSize}`}>
        {normalized.toFixed(1)}{showSlashTen && '/10'}
      </span>
    </span>
  )
}

export default ImdbRating
