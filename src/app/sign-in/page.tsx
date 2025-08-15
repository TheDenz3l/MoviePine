"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: any; footer?: any }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5),rgba(0,0,0,0.9))]" />
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">{subtitle}</p>}
        </div>
        <div className="backdrop-blur-md bg-neutral-900/70 border border-white/10 rounded-2xl shadow-lg p-8 space-y-6">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-xs text-neutral-400">{footer}</div>}
      </div>
    </div>
  )
}

export default function SignInPage() {
  const { signInWithMagicLink, loading, user } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [valid, setValid] = useState(false)

  useEffect(() => { setValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) }, [email])
  useEffect(() => { if (user && typeof window !== 'undefined') window.location.replace('/') }, [user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || sent) return
    setStatus('Sending magic link...')
    const { error } = await signInWithMagicLink(email.trim())
    if (error) {
      setStatus(error.message.includes('Auth disabled') ? 'Auth disabled: check Supabase env keys & dashboard settings.' : error.message)
    } else {
      setSent(true)
      setStatus('Magic link sent. Check your email to finish signing in.')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-neutral-400">Loading...</div>
  if (user) return null

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Access your personalized playback settings, progress sync & more. Enter your email and we’ll send a secure one‑time link."
      footer={<span>New here? <a href="/sign-up" className="text-white hover:underline">Create an account</a></span>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Email Address</label>
          <div className="relative">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-neutral-800/60 border border-neutral-700/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 placeholder:text-neutral-500 transition"
              aria-invalid={email.length>0 && !valid}
              aria-describedby="signin-status"
            />
            {email && <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${valid? 'text-green-400':'text-red-400'}`}>{valid? '✓':'!'}</span>}
          </div>
        </div>
        <Button type="submit" disabled={!valid || sent} className="w-full h-11 text-base font-semibold tracking-wide">
          {sent ? 'Link Sent ✔' : 'Send Magic Link'}
        </Button>
        <div id="signin-status" className="text-xs text-neutral-300 text-center min-h-[16px]" role="status" aria-live="polite">{status}</div>
        <div className="text-[10px] text-neutral-500 text-center leading-relaxed">
          Trouble receiving email? Confirm the project anon key & email auth are enabled in Supabase. You can also try again in a minute.
        </div>
      </form>
    </AuthShell>
  )
}

