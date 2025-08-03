import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    console.log(`🎬 SUBTITLE DEBUG FROM CLIENT:`)
    console.log(`📝 Video src: ${data.videoSrc?.substring(0, 100)}...`)
    console.log(`📝 Video readyState: ${data.readyState}`)
    console.log(`📝 Video networkState: ${data.networkState}`)
    console.log(`📝 TextTracks length: ${data.textTracksLength}`)
    console.log(`📝 Available subtitles from stream: [${data.availableSubtitles?.join(', ') || 'None'}]`)
    
    if (data.textTracks && data.textTracks.length > 0) {
      console.log(`📝 ✅ FOUND ${data.textTracks.length} NATIVE TEXT TRACKS:`)
      data.textTracks.forEach((track: any, i: number) => {
        console.log(`📝 Track ${i}: ${track.kind} - "${track.label}" (${track.language}) - Mode: ${track.mode}`)
      })
    } else {
      console.log(`📝 ❌ NO NATIVE TEXT TRACKS FOUND`)
    }
    
    if (data.message) {
      console.log(`📝 ${data.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error in subtitle debug endpoint:', error)
    return NextResponse.json({ error: 'Failed to log debug info' }, { status: 500 })
  }
}
