"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: any; footer?: any }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4),rgba(0,0,0,0.9))]" />
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

export default function SignUpPage() {
  const { user, loading, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    setValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  }, [email])

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      window.location.replace('/')
    }
  }, [user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || sent) return
    setStatus('Sending magic link...')
    const { error } = await signInWithMagicLink(email.trim())
    if (error) {
      setStatus(error.message || 'Failed to send link')
    } else {
      setSent(true)
      setStatus('Almost there! Check your inbox to finish creating your account.')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-neutral-400">Loading...</div>
  if (user) return null

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join to track progress, personalize playback and build your watchlist. We use passwordless email links for fast, secure access."
      footer={<span>Already have an account? <a href="/sign-in" className="text-white hover:underline">Sign in</a></span>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Email Address</label>
          <div className="relative group">
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-neutral-800/60 border border-neutral-700/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500 placeholder:text-neutral-500 transition"
              aria-invalid={email.length>0 && !valid}
              aria-describedby="email-help"
            />
            {email && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${valid? 'text-green-400':'text-red-400'}`}>{valid? '✓':'!'}</span>
            )}
          </div>
          <p id="email-help" className="text-[10px] text-neutral-500">We'll send a one-time sign-up link. No spam.</p>
        </div>
        <div className="space-y-3">
          <Button type="submit" disabled={!valid || sent} className="w-full h-11 text-base font-semibold tracking-wide">
            {sent ? 'Link Sent ✔' : 'Send Magic Link'}
          </Button>
          {status && <div className="text-xs text-neutral-300 text-center min-h-[16px]" role="status" aria-live="polite">{status}</div>}
        </div>
        <div className="text-[10px] leading-relaxed text-neutral-500 text-center">
          By creating an account you agree to basic usage logging for improving playback reliability. No ads, ever.
        </div>
      </form>
    </AuthShell>
  )
}
