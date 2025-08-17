'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthCodeError() {
  const [errorMessage, setErrorMessage] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams) {
      const error = searchParams.get('error')
      if (error) {
        setErrorMessage(decodeURIComponent(error))
      }
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center text-white max-w-md">
        <div className="text-red-400 text-4xl mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        
        {errorMessage && (
          <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-4">
            <p className="text-red-200 text-sm">{errorMessage}</p>
          </div>
        )}
        
        <p className="text-gray-300 mb-6">
          Sorry, we couldn't sign you in. This might happen if:
        </p>
        <ul className="text-left text-gray-400 mb-6 space-y-2">
          <li>• The magic link has expired</li>
          <li>• The link was already used</li>
          <li>• localhost:3000 isn't configured in Supabase</li>
          <li>• There was a network issue</li>
        </ul>
        
        <div className="space-y-3">
          <a 
            href="/auth-debug.html" 
            className="block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition"
          >
            🔧 Try Auth Debug Page
          </a>
          
          <a 
            href="/simple-auth-test.html" 
            className="block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition"
          >
            🧪 Use Test Authentication
          </a>
          
          <a 
            href="/" 
            className="block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition"
          >
            🏠 Go Back Home
          </a>
        </div>
      </div>
    </div>
  )
}
