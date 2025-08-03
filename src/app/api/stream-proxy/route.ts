import { NextRequest, NextResponse } from 'next/server'

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

    // Fetch the video stream from Real-Debrid
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Encoding': 'identity',
        'Range': request.headers.get('range') || 'bytes=0-'
      }
    })

    if (!response.ok) {
      console.log(`❌ Failed to fetch video stream: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the response headers
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges')
    const contentRange = response.headers.get('content-range')

    console.log(`✅ Video stream response: ${response.status}, Content-Type: ${contentType}`)

    // Create response headers for video streaming
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges || 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
    })

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength)
    }

    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange)
    }

    // Handle range requests for video seeking
    const status = response.status === 206 ? 206 : 200

    // Stream the video content
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close()
              return
            }
            controller.enqueue(value)
            return pump()
          }).catch(error => {
            console.error('❌ Stream error:', error)
            controller.error(error)
          })
        }

        return pump()
      }
    })

    return new NextResponse(stream, {
      status,
      headers: responseHeaders
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
