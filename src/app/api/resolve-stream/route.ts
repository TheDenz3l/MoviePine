import { NextRequest, NextResponse } from 'next/server'

/**
 * Resolve Torrentio stream URLs to actual video URLs
 * 
 * Torrentio provides "resolve" URLs like:
 * https://torrentio.strem.fun/resolve/realdebrid/{API_KEY}/{HASH}/{FILE_ID}/filename.mkv
 * 
 * When we hit this URL, Torrentio:
 * 1. Adds the torrent to Real-Debrid (if not cached)
 * 2. Waits for it to be ready
 * 3. Returns the direct video URL from Real-Debrid
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const resolveUrl = searchParams.get('url')

    if (!resolveUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing url parameter'
      }, { status: 400 })
    }

    console.log(`🔗 [RESOLVE-STREAM] Resolving Torrentio URL: ${resolveUrl}`)

    // Fetch the Torrentio resolve URL
    // Torrentio will:
    // 1. Add torrent to Real-Debrid
    // 2. Wait for it to be cached/ready
    // 3. Redirect to the actual video URL
    const response = await fetch(resolveUrl, {
      redirect: 'follow', // Follow redirects to get final URL
      headers: {
        'User-Agent': 'MoviePlayer/1.0'
      }
    })

    if (!response.ok) {
      console.error(`❌ [RESOLVE-STREAM] HTTP ${response.status}: ${response.statusText}`)
      
      // If 404, the stream is not cached in Real-Debrid
      if (response.status === 404) {
        // Extract torrent hash from URL for potential manual caching
        const hashMatch = resolveUrl.match(/\/([A-F0-9]{40,})\//i)
        const torrentHash = hashMatch ? hashMatch[1] : null
        
        console.log(`💡 [RESOLVE-STREAM] Torrent not cached. Hash: ${torrentHash || 'unknown'}`)
        console.log(`💡 [RESOLVE-STREAM] User can manually add this torrent to Real-Debrid or try a different stream`)
        
        return NextResponse.json({
          success: false,
          error: 'NOT_CACHED',
          message: 'This torrent is not cached on Real-Debrid. Try another quality or wait for it to be added.',
          torrentHash,
          status: response.status
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: `Failed to resolve stream: HTTP ${response.status}`,
        status: response.status
      }, { status: response.status })
    }

    // Get the final redirected URL
    const resolvedUrl = response.url

    // Check content type
    const contentType = response.headers.get('content-type') || ''
    const isVideo = contentType.includes('video/') || 
                    contentType.includes('application/octet-stream') ||
                    resolvedUrl.match(/\.(mp4|mkv|avi|webm|m3u8)($|\?)/i)

    console.log(`✅ [RESOLVE-STREAM] Resolved to: ${resolvedUrl.substring(0, 100)}...`)
    console.log(`📹 [RESOLVE-STREAM] Content-Type: ${contentType}, Is Video: ${isVideo}`)

    return NextResponse.json({
      success: true,
      resolvedUrl,
      contentType,
      isVideo
    })

  } catch (error) {
    console.error(`❌ [RESOLVE-STREAM] Error:`, error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
