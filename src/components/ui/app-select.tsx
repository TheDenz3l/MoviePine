"use client"

import * as React from 'react'
import * as Select from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AppSelectOption { value: string; label: string }

interface AppSelectProps {
  value: string
  onChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  className?: string
  itemClassName?: string
}

export function AppSelect({ value, onChange, options, placeholder = 'Select', className, itemClassName }: AppSelectProps) {
  return (
    <Select.Root value={value} onValueChange={(val: string) => onChange(val)}>
      <Select.Trigger
        className={cn(
          'group inline-flex items-center justify-between gap-2 rounded-lg bg-zinc-900/90 h-11 px-4 text-sm md:text-base font-medium text-white',
          'data-[placeholder]:text-white/60 shadow-inner ring-1 ring-zinc-700/60 hover:ring-zinc-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/80 focus:ring-offset-0',
          'transition-colors transition-shadow',
          className
        )}
        aria-label={placeholder}
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
            {options.map(o => (
              <Select.Item key={o.value} value={o.value} className={cn(itemBaseClass, itemClassName)}>
                <Select.ItemText>{o.label}</Select.ItemText>
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

const itemBaseClass = cn(
  'relative flex w-full select-none items-center gap-2 rounded-md px-3 py-2 text-sm md:text-base font-medium cursor-pointer',
  'text-white/90 data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
  'focus:outline-none focus:bg-red-600/20 focus:text-white',
  'data-[state=checked]:text-white data-[state=checked]:bg-red-600/30',
  'hover:bg-white/5'
)

export default AppSelect
