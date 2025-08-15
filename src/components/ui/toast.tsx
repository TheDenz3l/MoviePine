"use client"
import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

export interface Toast { id: string; message: string; type?: 'success'|'error'|'info'; ttl?: number }
interface ToastContext { push: (t: Omit<Toast,'id'>) => void }
const Ctx = createContext<ToastContext | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast,'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, ttl: 4000, ...t }
    setItems(list => [...list, toast])
    setTimeout(()=> setItems(list => list.filter(i=>i.id!==id)), toast.ttl)
  }, [])
  return <Ctx.Provider value={{ push }}>
    {children}
    <div className="fixed top-4 right-4 z-[999] w-72 space-y-2">
      {items.map(i => <div key={i.id} className={`px-3 py-2 text-sm rounded-md border shadow backdrop-blur bg-neutral-900/90 ${i.type==='error'?'border-red-500 text-red-200': i.type==='success'?'border-green-500 text-green-200':'border-neutral-600 text-neutral-200'}`}>{i.message}</div>)}
    </div>
  </Ctx.Provider>
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
