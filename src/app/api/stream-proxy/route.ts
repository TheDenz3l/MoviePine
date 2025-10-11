import { NextRequest, NextResponse } from 'next/server'

/**
 * Stream Proxy for Real-Debrid and other sources
 * 
 * Proxies video streams to handle:
 * - CORS issues
 * - Range requests for seeking
 * - Headers forwarding
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const streamUrl = searchParams.get('url')

    if (!streamUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing url parameter'
      }, { status: 400 })
    }

    console.log(`🎬 [STREAM-PROXY] Proxying stream: ${streamUrl.substring(0, 100)}...`)

    // Get range header for seeking support
    const range = request.headers.get('range')
    
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
    }

    if (range) {
      headers['Range'] = range
      console.log(`🎬 [STREAM-PROXY] Range request: ${range}`)
    }

    // Fetch the actual stream with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    const response = await fetch(streamUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal
    }).finally(() => clearTimeout(timeout))

    if (!response.ok && response.status !== 206) {
      console.error(`❌ [STREAM-PROXY] HTTP ${response.status}: ${response.statusText}`)
      return new NextResponse(`Stream error: ${response.statusText}`, { 
        status: response.status 
      })
    }

    // Get response headers
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes'
    const contentRange = response.headers.get('content-range')

    console.log(`✅ [STREAM-PROXY] Stream ready:`, {
      status: response.status,
      contentType,
      contentLength,
      acceptRanges,
      hasRange: !!contentRange
    })

    // Build response headers with comprehensive CORS support for audio/video
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
      // CORS headers - must be permissive for media playback
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization, X-Requested-With',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Date, Server, Transfer-Encoding, X-Content-Duration',
      'Access-Control-Allow-Credentials': 'false',
      'Access-Control-Max-Age': '86400',
      // Caching for media content
      'Cache-Control': 'public, max-age=3600, immutable',
      // Security headers for media
      'X-Content-Type-Options': 'nosniff',
    }

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange
    }

    // Return the stream
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error(`❌ [STREAM-PROXY] Error:`, error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization, X-Requested-With',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Date, Server, Transfer-Encoding, X-Content-Duration',
      'Access-Control-Allow-Credentials': 'false',
      'Access-Control-Max-Age': '86400',
    }
  })
}

// Handle HEAD for metadata requests
export async function HEAD(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const streamUrl = searchParams.get('url')

    if (!streamUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing url parameter'
      }, { status: 400 })
    }

    console.log(`🎬 [STREAM-PROXY HEAD] Checking stream metadata: ${streamUrl.substring(0, 100)}...`)

    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': '*/*',
    }

    const response = await fetch(streamUrl, {
      method: 'HEAD',
      headers,
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error(`❌ [STREAM-PROXY HEAD] HTTP ${response.status}: ${response.statusText}`)
      return new NextResponse(null, { 
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization, X-Requested-With',
        }
      })
    }

    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes'

    console.log(`✅ [STREAM-PROXY HEAD] Metadata ready:`, {
      contentType,
      contentLength,
      acceptRanges,
    })

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || '0',
        'Accept-Ranges': acceptRanges,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization, X-Requested-With',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
      }
    })

  } catch (error) {
    console.error(`❌ [STREAM-PROXY HEAD] Error:`, error)
    
    return new NextResponse(null, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization, X-Requested-With',
      }
    })
  }
}
