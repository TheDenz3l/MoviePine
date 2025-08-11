import { NextRequest, NextResponse } from 'next/server'

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
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    console.log(`🎬 Proxying stream URL: ${url.substring(0, 50)}...`)

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'video/*;q=0.9,*/*;q=0.5',
        'Accept-Encoding': 'identity',
        ...(request.headers.get('range') ? { 'Range': request.headers.get('range') as string } : {})
      }
    })

    if (!upstream.ok && upstream.status !== 206) {
      console.error(`❌ Failed to fetch stream: ${upstream.status} ${upstream.statusText}`)
      return NextResponse.json({ error: `Failed to fetch stream: ${upstream.statusText}` }, { status: upstream.status })
    }

    const originalType = upstream.headers.get('content-type')
    const contentType = guessContentType(url, originalType)
    const contentLength = upstream.headers.get('content-length')
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes'
    const contentRange = upstream.headers.get('content-range')

    console.log(`✅ Streaming content: ${contentType} (orig: ${originalType}), Length: ${contentLength || 'unknown'}`)

    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
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
