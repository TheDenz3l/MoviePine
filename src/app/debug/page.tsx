"use client"

import { getConfig, getConfigOrDefault } from '@/lib/config'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [configData, setConfigData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      console.log('🔧 Environment variables (client-side):')
      console.log('TMDB API Key:', process.env.NEXT_PUBLIC_TMDB_API_KEY ? `${process.env.NEXT_PUBLIC_TMDB_API_KEY.substring(0, 8)}...` : 'NOT SET')
      console.log('Torbox API Key:', process.env.NEXT_PUBLIC_TORBOX_API_KEY ? 'SET' : 'NOT SET')
      console.log('Debrid Service:', process.env.NEXT_PUBLIC_DEBRID_SERVICE || 'NOT SET')
      console.log('Debrid API Key:', process.env.NEXT_PUBLIC_DEBRID_API_KEY ? 'SET' : 'NOT SET')

      // Try to get the real config
      let config
      try {
        config = getConfig()
        console.log('✅ Real config loaded successfully')
      } catch (configError) {
        console.warn('⚠️ Real config failed, using default:', configError)
        config = getConfigOrDefault()
      }

      setConfigData({
        envVars: {
          tmdbApiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY || 'NOT SET',
          torboxApiKey: process.env.NEXT_PUBLIC_TORBOX_API_KEY || 'NOT SET',
          debridService: process.env.NEXT_PUBLIC_DEBRID_SERVICE || 'NOT SET',
          debridApiKey: process.env.NEXT_PUBLIC_DEBRID_API_KEY || 'NOT SET',
        },
        config: {
          tmdbApiKey: config.tmdbApiKey || 'NOT SET',
          torboxApiKey: config.torboxApiKey || 'NOT SET',
          debridService: config.debridService || 'NOT SET',
          debridApiKey: config.debridApiKey || 'NOT SET',
        }
      })
    } catch (err) {
      console.error('Debug error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Configuration</h1>
      
      {error && (
        <div className="bg-red-900 p-4 rounded mb-4">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {configData && (
        <div className="space-y-6">
          <div className="bg-gray-900 p-4 rounded">
            <h2 className="font-bold mb-2">Environment Variables (Client-side):</h2>
            <pre className="text-sm">{JSON.stringify(configData.envVars, null, 2)}</pre>
          </div>

          <div className="bg-gray-900 p-4 rounded">
            <h2 className="font-bold mb-2">Parsed Config:</h2>
            <pre className="text-sm">{JSON.stringify(configData.config, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
