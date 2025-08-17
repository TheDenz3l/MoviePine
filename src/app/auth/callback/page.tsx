'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallbackHandler() {
  const [status, setStatus] = useState('Processing authentication...')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        console.log('🔐 Client-side auth handler started')
        console.log('Current URL:', window.location.href)
        console.log('Hash:', window.location.hash)
        console.log('Search:', window.location.search)

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              detectSessionInUrl: true,
              persistSession: true
            }
          }
        )

        // Handle the auth callback
        const { data, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          console.error('❌ Auth error:', authError)
          setError(authError.message)
          setStatus('Authentication failed')
          return
        }

        if (data.session) {
          console.log('✅ Authentication successful:', {
            userId: data.session.user.id,
            email: data.session.user.email
          })
          setStatus('Authentication successful! Redirecting...')
          
          // Store session info and redirect
          setTimeout(() => {
            router.push('/')
          }, 1000)
        } else {
          console.log('ℹ️ No session found, checking URL for auth tokens...')
          
          // Check URL hash for auth tokens (modern Supabase flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken) {
            console.log('🔑 Found tokens in URL hash, setting session...')
            setStatus('Found authentication tokens, processing...')
            
            // Let Supabase handle the session
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            
            setStatus('Authentication successful! Redirecting...')
            setTimeout(() => {
              router.push('/')
            }, 1000)
          } else {
            console.log('❌ No authentication tokens found')
            setError('No authentication tokens found in the callback URL')
            setStatus('Authentication failed')
          }
        }
      } catch (error: any) {
        console.error('💥 Auth handler error:', error)
        setError(error.message)
        setStatus('Authentication failed')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center text-white max-w-md">
        <div className="text-4xl mb-4">
          {error ? '❌' : status.includes('successful') ? '✅' : '🔄'}
        </div>
        
        <h1 className="text-2xl font-bold mb-4">
          {error ? 'Authentication Error' : 'Processing Authentication'}
        </h1>
        
        <p className="text-gray-300 mb-4">{status}</p>
        
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <button
            onClick={() => router.push('/sign-in')}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
