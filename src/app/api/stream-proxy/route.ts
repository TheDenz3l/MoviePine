import { NextRequest, NextResponse } from 'next/server'

// Guess a better video mime type when Real-Debrid (or others) return a generic download type
function guessContentType(url: string, original?: string | null): string {
  if (original && !/force-download|octet-stream/i.test(original)) return original
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.mkv')) return 'video/x-matroska'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov')) return 'video/quicktime'
  if (lower.endsWith('.m4v')) return 'video/x-m4v'
  if (lower.endsWith('.avi')) return 'video/x-msvideo'
  if (lower.endsWith('.wmv')) return 'video/x-ms-wmv'
  if (lower.endsWith('.flv')) return 'video/x-flv'
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  return original || 'application/octet-stream'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    console.log(`🎬 Proxying video stream: ${url.substring(0, 100)}...`)

    // Fetch the video stream (supports range)
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'video/*;q=0.9,*/*;q=0.5',
        'Accept-Encoding': 'identity',
        ...(request.headers.get('range') ? { 'Range': request.headers.get('range') as string } : {})
      }
    })

    if (!upstream.ok && upstream.status !== 206) {
      console.log(`❌ Failed to fetch video stream: ${upstream.status} ${upstream.statusText}`)
      return NextResponse.json(
        { error: `HTTP ${upstream.status}: ${upstream.statusText}` },
        { status: upstream.status }
      )
    }

    const originalType = upstream.headers.get('content-type')
    const contentType = guessContentType(url, originalType)
    const contentLength = upstream.headers.get('content-length')
    const contentRange = upstream.headers.get('content-range')
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes'

    console.log(`✅ Video stream response: ${upstream.status}, Normalized-Type: ${contentType}, Original-Type: ${originalType}`)

    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
    })
    if (contentLength) headers.set('Content-Length', contentLength)
    if (contentRange) headers.set('Content-Range', contentRange)
    if (/m3u8/i.test(contentType)) headers.set('Cache-Control', 'no-cache')
    else headers.set('Cache-Control', 'public, max-age=3600')

    return new NextResponse(upstream.body, {
      status: contentRange ? 206 : (upstream.status === 206 ? 206 : 200),
      headers
    })

  } catch (error) {
    console.error('❌ Error proxying video stream:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
    }
  })
}
