"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function TestLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!supabase) {
      setMessage('Supabase client not initialized. Check environment variables.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Check your email for the magic link!')
        // Optionally redirect after a short delay
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (err: any) {
      setMessage(`An unexpected error occurred: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: '500px', margin: '100px auto', padding: '20px', background: '#111', color: '#fff' }}>
      <h1>Client-side Login Test</h1>
      <p>Enter your email to receive a magic link for login.</p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '12px', fontSize: '16px', margin: '8px 0', border: '1px solid #444', background: '#222', color: '#fff', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px', fontSize: '16px', margin: '8px 0', border: '1px solid #444', background: '#222', color: '#fff', borderRadius: '4px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Sending Magic Link...' : 'Login with Magic Link'}
        </button>
      </form>
      {message && <p style={{ margin: '20px 0', padding: '12px', borderRadius: '4px', background: message.startsWith('Error') ? '#660000' : '#006600' }}>{message}</p>}
    </div>
  )
}
