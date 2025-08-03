import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    console.log(`🔗 Resolving stream URL: ${url.substring(0, 100)}...`)

    // Fetch the Torrentio resolve URL and follow redirects
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      console.log(`❌ Failed to resolve URL: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { success: false, error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the final resolved URL after redirects
    const resolvedUrl = response.url
    console.log(`🚀 Successfully resolved to: ${resolvedUrl.substring(0, 100)}...`)

    // Check if it's a valid video URL
    const contentType = response.headers.get('content-type')
    const isVideo = contentType?.startsWith('video/') || 
                   resolvedUrl.includes('.mp4') || 
                   resolvedUrl.includes('.mkv') || 
                   resolvedUrl.includes('.avi') ||
                   resolvedUrl.includes('real-debrid.com')

    if (!isVideo) {
      console.log(`⚠️ Resolved URL doesn't appear to be a video: ${contentType}`)
    }

    return NextResponse.json({
      success: true,
      resolvedUrl,
      contentType,
      isVideo
    })

  } catch (error) {
    console.error('❌ Error resolving stream URL:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
