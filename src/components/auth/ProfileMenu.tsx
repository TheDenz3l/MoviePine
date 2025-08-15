"use client"

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'

export function ProfileMenu() {
  const { user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-gray-700 animate-pulse" />
  }

  if (!user) return <Button size="sm" variant="secondary" onClick={() => { window.location.href = '/sign-in' }}>Sign In</Button>

  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium hover:ring-2 ring-white/40 transition">
        <Avatar>
          <AvatarImage src={user.user_metadata?.avatar_url} />
          <AvatarFallback className="text-xs">{(user.email||'?').charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg p-2 text-sm z-50">
          <div className="px-2 py-1.5 text-neutral-300 truncate" title={user.email}>{user.email}</div>
          <div className="h-px bg-neutral-700 my-1" />
          <button onClick={() => { window.location.href = '/settings'; }} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-700">Settings</button>
          <button onClick={() => { signOut(); setOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-700">Sign out</button>
        </div>
      )}
    </div>
  )
}
