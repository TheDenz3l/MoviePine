import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    console.log(`🎬 Proxying stream URL: ${url.substring(0, 50)}...`)

    // Fetch the stream from the original URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Encoding': 'identity',
        'Range': request.headers.get('range') || 'bytes=0-'
      }
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch stream: ${response.status} ${response.statusText}`)
      return NextResponse.json({ error: `Failed to fetch stream: ${response.statusText}` }, { status: response.status })
    }

    // Get response headers
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes'
    const contentRange = response.headers.get('content-range')

    console.log(`✅ Streaming content: ${contentType}, Length: ${contentLength || 'unknown'}`)

    // Create response headers
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
    })

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength)
    }

    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange)
    }

    // Handle range requests for video seeking
    const status = contentRange ? 206 : 200

    // Stream the response body
    return new NextResponse(response.body, {
      status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
    },
  })
}
