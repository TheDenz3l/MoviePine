"use client"

import { useState } from 'react'

export default function TestStreamPage() {
  const [testUrl, setTestUrl] = useState('')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testDirectAccess = async () => {
    if (!testUrl) return
    
    setIsLoading(true)
    setResult('Testing direct access...')
    
    try {
      console.log('Testing direct access to:', testUrl)
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        headers: {
          'Range': 'bytes=0-1',
          'User-Agent': 'Stremio/4.4.142 (https://www.stremio.com/)',
          'Accept': '*/*'
        }
      })
      
      setResult(`Direct access: ${response.status} ${response.statusText}
Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)
      
    } catch (error) {
      setResult(`Direct access failed: ${error}`)
    }
    
    setIsLoading(false)
  }

  const testProxyAccess = async () => {
    if (!testUrl) return
    
    setIsLoading(true)
    setResult('Testing proxy access...')
    
    try {
      const proxyUrl = `/api/stream?url=${encodeURIComponent(testUrl)}`
      console.log('Testing proxy access to:', proxyUrl)
      
      const response = await fetch(proxyUrl, {
        method: 'HEAD',
        headers: {
          'Range': 'bytes=0-1'
        }
      })
      
      setResult(`Proxy access: ${response.status} ${response.statusText}
Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)
      
    } catch (error) {
      setResult(`Proxy access failed: ${error}`)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Stream URL Tester</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Test URL (paste a Torrentio resolve URL):
          </label>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://torrentio.strem.fun/resolve/realdebrid/..."
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={testDirectAccess}
            disabled={isLoading || !testUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Test Direct Access
          </button>
          
          <button
            onClick={testProxyAccess}
            disabled={isLoading || !testUrl}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Test Proxy Access
          </button>
        </div>
        
        {result && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 rounded">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to the main app and find a movie with streams</li>
          <li>Open browser dev tools and look for Torrentio resolve URLs in the console</li>
          <li>Copy a resolve URL and paste it above</li>
          <li>Test both direct and proxy access to see which works</li>
        </ol>
      </div>
    </div>
  )
}
