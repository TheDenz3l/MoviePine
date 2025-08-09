"use client"

import React from 'react'

interface ImdbRatingProps {
  rating?: number | null // expected 0-10 scale (TMDB style). If >10 we'll normalize.
  className?: string
  size?: 'micro' | 'compact' | 'xs' | 'sm' | 'md'
  showSlashTen?: boolean
  testId?: string // data-testid attribute for e2e tests (defaults to 'tmdb-rating')
}

/**
 * Small reusable rating badge (TMDB branded).
 * Uses TMDB brand colors:
 *  - Dark Navy: #0D253F (wrapper subtle bg)
 *  - Blue: #01B4E4 (logo block)
 *  - Green gradient: #90CEA1 -> #01D277 (rating pill)
 * Accepts rating on 0-10 scale (or 0-100 normalized). Renders: [TMDB] 7.8/10
 */
export function ImdbRating({ rating, className = '', size = 'sm', showSlashTen = true, testId = 'tmdb-rating' }: ImdbRatingProps) {
  if (rating == null || isNaN(rating)) return null
  const normalized = rating > 10 ? rating / 10 : rating
  if (normalized <= 0) return null
  const percent = Math.round(normalized * 10) // TMDB vote_average (0-10) *10 => percentage 0-100

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

  const containerGap = size==='micro' ? 'gap-[4px]' : size==='compact' ? 'gap-[4px]' : 'gap-1.5'
  const logoPadding = size==='micro' ? 'px-1 py-[2px]' : size==='compact' ? 'px-1.5 py-[2px]' : 'px-2 py-0.5'

  // Ring sizing
  const ringSize = size==='micro' ? 22 : size==='compact' ? 26 : size==='sm' ? 32 : 40
  const stroke = size==='micro' ? 3 : size==='compact' ? 3.5 : size==='sm' ? 4 : 5
  const radius = (ringSize / 2) - (stroke + 1)
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const offset = circumference - (clampedPercent / 100) * circumference

  // Color coding similar to TMDB (green > 70, yellow 40-69, red < 40)
  let ringColor = '#01D277'
  if (clampedPercent < 40) ringColor = '#d92d2d'
  else if (clampedPercent < 70) ringColor = '#d2d531'

  const fontSizeCenter = size==='micro' ? '7px' : size==='compact' ? '8px' : size==='sm' ? '10px' : '12px'
  const subFontSize = size==='micro' ? '4px' : size==='compact' ? '5px' : size==='sm' ? '6px' : '7px'

  return (
  <span className={`inline-flex items-center ${containerGap} ${className}`} aria-label={`TMDB user score ${percent}%`} data-testid={testId}>
      {/* Circular ring only (logo removed) */}
      <span className="relative inline-flex" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} role="img" aria-hidden="true">
          <circle
            cx={ringSize/2}
            cy={ringSize/2}
            r={radius}
            stroke="#0D253F"
            strokeWidth={stroke}
            fill="#081c29"
          />
          <circle
            cx={ringSize/2}
            cy={ringSize/2}
            r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center font-semibold text-white leading-none select-none"
          style={{ fontSize: fontSizeCenter }}
        >
          {clampedPercent}<span style={{ fontSize: subFontSize, fontWeight: 600 }}>%</span>
        </span>
      </span>
    </span>
  )
}

export default ImdbRating
