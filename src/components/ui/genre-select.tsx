"use client"

import * as React from 'react'
import * as Select from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GenreOption { id: number; name: string }

interface GenreSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  options: GenreOption[]
  placeholder?: string
  className?: string
}

// A seamless dark select that visually reads as a single panel with trigger
export function GenreSelect({ value, onChange, options, placeholder = 'Genres', className }: GenreSelectProps) {
  return (
  <Select.Root value={value ? String(value) : ''} onValueChange={(val: string) => onChange(val ? Number(val) : null)}>
  <Select.Trigger
        className={cn(
          'group inline-flex items-center justify-between gap-2 rounded-lg bg-zinc-900/90 px-4 py-2 text-sm md:text-base font-semibold text-white',
          'data-[placeholder]:text-white/60 shadow-inner ring-1 ring-zinc-700/60 hover:ring-zinc-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/80 focus:ring-offset-0',
          'transition-colors transition-shadow',
          className
        )}
        aria-label="Select Genre"
      >
        <Select.Value placeholder={placeholder} />
        <ChevronDownIcon className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 min-w-[--radix-select-trigger-width] overflow-hidden rounded-xl',
            'bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 backdrop-blur-md',
            'border border-zinc-700/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_4px_24px_-4px_rgba(0,0,0,0.65)]',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          <Select.Viewport className="p-1 max-h-[320px]">
            <Select.Item value="__all" className={itemClass()}>
              <Select.ItemText>{placeholder}</Select.ItemText>
              <Select.ItemIndicator><CheckIcon className="h-4 w-4" /></Select.ItemIndicator>
            </Select.Item>
            {options.map(o => (
              <Select.Item key={o.id} value={String(o.id)} className={itemClass()}>
                <Select.ItemText>{o.name}</Select.ItemText>
                <Select.ItemIndicator>
                  <CheckIcon className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function itemClass() {
  return cn(
    'relative flex w-full select-none items-center gap-2 rounded-md px-3 py-2 text-sm md:text-base font-medium cursor-pointer',
    'text-white/90 data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
    'focus:outline-none focus:bg-red-600/20 focus:text-white',
    'data-[state=checked]:text-white data-[state=checked]:bg-red-600/30',
    'hover:bg-white/5'
  )
}

export default GenreSelect
