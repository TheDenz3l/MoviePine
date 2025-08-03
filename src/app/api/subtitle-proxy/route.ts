import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

/**
 * Subtitle Proxy API - Downloads and processes subtitle files
 * Handles ZIP extraction and SRT to VTT conversion
 */

/**
 * Convert SRT subtitle content to VTT format
 */
function convertSrtToVtt(srtContent: string): string {
  // Add VTT header
  let vttContent = 'WEBVTT\n\n'
  
  // Replace SRT timestamp format with VTT format
  // SRT: 00:01:30,500 --> 00:01:35,000
  // VTT: 00:01:30.500 --> 00:01:35.000
  const vttBody = srtContent
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // Replace comma with dot in timestamps
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .trim()
  
  vttContent += vttBody
  
  return vttContent
}

/**
 * Extract SRT file from ZIP archive
 */
async function extractSrtFromZip(zipBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip()
    const zipContents = await zip.loadAsync(zipBuffer)
    
    // Find SRT files in the ZIP
    const srtFiles = Object.keys(zipContents.files).filter(filename => 
      filename.toLowerCase().endsWith('.srt') && !zipContents.files[filename].dir
    )
    
    if (srtFiles.length === 0) {
      throw new Error('No SRT files found in ZIP archive')
    }
    
    // Use the first SRT file found
    const srtFilename = srtFiles[0]
    console.log(`📦 Extracting SRT file: ${srtFilename}`)
    
    const srtContent = await zipContents.files[srtFilename].async('text')
    return srtContent
    
  } catch (error) {
    console.error('❌ Failed to extract SRT from ZIP:', error)
    throw new Error('Failed to extract subtitle from ZIP archive')
  }
}

/**
 * Download subtitle file from URL
 */
async function downloadSubtitleFile(url: string): Promise<string> {
  try {
    // Handle relative URLs from SubDL API
    const fullUrl = url.startsWith('/') ? `https://dl.subdl.com${url}` : url
    console.log(`📥 Downloading subtitle from: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'MoviePine/1.0',
        'Accept': 'application/zip, text/plain, */*',
        'Referer': 'https://subdl.com/'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download subtitle: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    console.log(`📄 Content-Type: ${contentType}`)
    
    if (contentType.includes('application/zip') || url.includes('.zip')) {
      // Handle ZIP files (SubDL returns ZIP archives)
      console.log(`📦 Processing ZIP subtitle file...`)
      const arrayBuffer = await response.arrayBuffer()
      const srtContent = await extractSrtFromZip(arrayBuffer)
      console.log(`✅ Extracted SRT content: ${srtContent.length} characters`)
      return srtContent
    } else {
      // Direct SRT/VTT file
      const content = await response.text()
      console.log(`✅ Downloaded subtitle content: ${content.length} characters`)
      return content
    }
  } catch (error) {
    console.error(`❌ Failed to download subtitle from ${url}:`, error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subtitleUrl = searchParams.get('url')
    const language = searchParams.get('lang') || 'en'

    if (!subtitleUrl) {
      return NextResponse.json(
        { error: 'Missing subtitle URL parameter' },
        { status: 400 }
      )
    }

    console.log(`🎬 Subtitle proxy request for ${language}: ${subtitleUrl}`)

    // Download the subtitle file
    const srtContent = await downloadSubtitleFile(subtitleUrl)
    
    if (!srtContent || srtContent.trim().length === 0) {
      throw new Error('Downloaded subtitle file is empty')
    }

    // Convert SRT to VTT format
    const vttContent = convertSrtToVtt(srtContent)
    console.log(`🔄 Converted SRT to VTT: ${vttContent.length} characters`)

    // Return VTT content with proper headers
    return new NextResponse(vttContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${language}.vtt"`
      }
    })

  } catch (error) {
    console.error('❌ Subtitle proxy error:', error)
    
    // Return a minimal VTT file with error message
    const errorVtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
❌ Failed to load subtitles

00:00:05.000 --> 00:00:10.000
Error: ${error instanceof Error ? error.message : 'Unknown error'}
`

    return new NextResponse(errorVtt, {
      status: 200, // Return 200 to avoid breaking video player
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
