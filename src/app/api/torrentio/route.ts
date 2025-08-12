import { NextRequest, NextResponse } from 'next/server'
import { TorrentioAPI } from '@/lib/api/torrentio'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const isSafari = searchParams.get('isSafari') === 'true'
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    console.log(`🔗 Proxying Torrentio request: ${endpoint}`)
    if (isSafari) {
      console.log(`🍎 Safari browser detected - Safari filtering will be applied`)
    }

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

    // If Safari browser and we have streams, apply Safari filtering
    if (isSafari && data.streams && data.streams.length > 0) {
      console.log(`🍎 Applying Safari filtering to ${data.streams.length} streams`)
      
      // Create a temporary TorrentioAPI instance to access the filtering method
      const torrentioAPI = new TorrentioAPI()
      const filteredStreams = (torrentioAPI as any).applySafariFiltering(data.streams.map((stream: any) => ({
        name: stream.name || stream.title || 'Unknown',
        title: stream.title || stream.name || 'Unknown',
        infoHash: stream.infoHash || '',
        fileIdx: stream.fileIdx,
        url: stream.url,
        behaviorHints: stream.behaviorHints,
        subtitles: []
      })), true) // Pass true to explicitly indicate Safari filtering should be applied
      
      console.log(`🍎 Safari filtering complete: ${filteredStreams.length} compatible streams remaining`)
      
      // Convert back to API format
      data.streams = filteredStreams.map((stream: any) => ({
        name: stream.name,
        title: stream.title,
        infoHash: stream.infoHash,
        fileIdx: stream.fileIdx,
        url: stream.url,
        behaviorHints: stream.behaviorHints
      }))
    }

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
