"use client"
import { useState, useRef, useEffect } from 'react'

interface SeasonSelectProps {
  seasons: number[]
  value: number
  onChange: (season: number) => void
  disabled?: boolean
}

export function SeasonSelect({ seasons, value, onChange, disabled }: SeasonSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { setOpen(false); (ref.current?.querySelector('button[data-trigger]') as HTMLButtonElement | undefined)?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = seasons.indexOf(value)
        if (idx !== -1) {
          const next = e.key === 'ArrowDown' ? Math.min(seasons.length - 1, idx + 1) : Math.max(0, idx - 1)
          if (seasons[next] !== value) onChange(seasons[next])
        }
      }
    }
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('mousedown', handler); window.removeEventListener('keydown', key) }
  }, [open, seasons, value, onChange])

  const selectSeason = (s: number) => { onChange(s); setOpen(false) }

  if (seasons.length <= 1) {
    return <div className="text-xs text-gray-300">S{seasons[0] || 1}</div>
  }

  return (
    <div ref={ref} className="relative select-none">
      <button
        type="button"
        data-trigger
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o=>!o)}
        className="flex items-center gap-1 rounded bg-zinc-800/80 hover:bg-zinc-700/70 border border-white/10 text-white text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
      >
        <span className="font-medium">S{value}</span>
        <svg className={`h-4 w-4 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-activedescendant={`season-${value}`}
          className="absolute z-50 mt-1 w-full min-w-[4.5rem] overflow-hidden rounded-md border border-white/15 bg-black/90 backdrop-blur-sm shadow-lg focus:outline-none"
        >
          {seasons.map(s => (
            <li
              id={`season-${s}`}
              key={s}
              role="option"
              aria-selected={s === value}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10 ${s === value ? 'bg-white/15 font-medium' : ''}`}
              onClick={() => selectSeason(s)}
            >
              {s === value && <span className="text-red-500">✓</span>} S{s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
