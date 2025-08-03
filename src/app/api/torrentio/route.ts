import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    console.log(`🔗 Proxying Torrentio request: ${endpoint}`)

    // Make the request to Torrentio API with increased timeout
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'MoviePine/1.0',
        'Accept': 'application/json',
      },
      // Increase timeout for better reliability
      signal: AbortSignal.timeout(30000) // 30 seconds
    })

    if (!response.ok) {
      console.error(`❌ Torrentio API error: ${response.status} ${response.statusText}`)

      if (response.status === 404) {
        // Return empty streams array for 404 (no streams found)
        return NextResponse.json({ streams: [] })
      }

      if (response.status === 502 || response.status === 503) {
        // Bad Gateway or Service Unavailable - return empty streams instead of error
        console.warn(`⚠️ Torrentio service temporarily unavailable (${response.status}), returning empty streams`)
        return NextResponse.json({ streams: [] })
      }

      return NextResponse.json(
        { error: `Torrentio API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`✅ Torrentio response: ${data.streams?.length || 0} streams found`)

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error proxying Torrentio request:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch from Torrentio' },
      { status: 500 }
    )
  }
}
