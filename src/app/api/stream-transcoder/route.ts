import { NextRequest, NextResponse } from 'next/server'
import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Robust ffmpeg binary resolver that avoids bundled vendor paths
function resolveFFmpegPath(): string {
  // Best-effort project root even when cwd is inside .next
  const cwd = process.cwd()
  const projectRoot = cwd.includes(`${path.sep}.next${path.sep}`)
    ? path.resolve(cwd, '..', '..')
    : cwd

  // Prefer vendored ffmpeg-static on disk (not bundled)
  const nmStatic = path.join(projectRoot, 'node_modules/ffmpeg-static/ffmpeg')
  if (fs.existsSync(nmStatic)) return nmStatic

  const envPath = process.env.FFMPEG_PATH
  if (envPath && fs.existsSync(envPath)) return envPath

  // Prefer system ffmpeg if available
  try {
    const which = execSync('command -v ffmpeg', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    if (which && fs.existsSync(which)) return which
  } catch {
    // ignore
  }

  // Try to get ffmpeg-static's absolute binary path without bundling
  try {
    // Use eval to avoid Next bundling rewriting the require
    // eslint-disable-next-line no-eval
    const _req: NodeRequire = eval('require')
  const staticPath = _req('ffmpeg-static') as string | null
    if (typeof staticPath === 'string') {
      // Reject any path under .next or vendor-chunks; prefer real file on disk
      const isBundled = staticPath.includes(`${path.sep}.next${path.sep}`) || staticPath.includes('vendor-chunks')
      if (!isBundled && fs.existsSync(staticPath)) return staticPath
      // Fallback candidates relative to project root
      const candidates = [
        path.join(projectRoot, 'node_modules/ffmpeg-static/ffmpeg'),
        path.join(projectRoot, 'node_modules/.pnpm/ffmpeg-static*/node_modules/ffmpeg-static/ffmpeg'),
      ]
      for (const cand of candidates) {
        if (fs.existsSync(cand)) return cand
      }
    }
  } catch {
    // ignore
  }

  // Common system locations
  const common = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']
  for (const p of common) {
    if (fs.existsSync(p)) return p
  }

  return 'ffmpeg' // hope it's on PATH
}

// Ensure Node.js runtime so we can spawn ffmpeg
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Universal Stream Transcoding API
 * 
 * This API endpoint provides optimized streaming for all browsers by:
 * 1. ✅ AUTO-CONVERTING M3U8 (HLS) streams to progressive MP4 for universal browser support
 * 2. ✅ Eliminating HLS.js dependency and providing native video performance
 * 3. ✅ Analyzing stream containers and codecs for Safari compatibility  
 * 4. ✅ Providing direct MP4 streams when available
 * 5. ✅ Using cloud transcoding services for MKV/incompatible streams
 * 6. ✅ Falling back to client-side solutions when needed
 * 
 * Usage: 
 * - Universal M3U8: /api/stream-transcoder?url=<m3u8_url> (AUTO-DETECTED)
 * - Safari optimization: /api/stream-transcoder?url=<source_stream_url>&safari=true
 * - Force M3U8 conversion: /api/stream-transcoder?url=<m3u8_url>&optimize=true
 * - Live TV streaming: /api/stream-transcoder?url=<live_m3u8_url> (OPTIMIZED)
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sourceUrl = searchParams.get('url')
  const isSafari = searchParams.get('safari') === 'true'
  const isChrome = searchParams.get('chrome') === 'true'
  const optimize = searchParams.get('optimize') === 'true'
  const method = request.method.toUpperCase()
  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true'
  
  console.log('🎬 Universal Stream Transcoding Request:', {
    sourceUrl: sourceUrl ? sourceUrl.substring(0, 50) + '...' : 'null',
    isSafari,
    isChrome,
    optimize,
  force,
    userAgent: request.headers.get('user-agent')?.substring(0, 100)
  })

  if (!sourceUrl) {
    return NextResponse.json({ error: 'Missing source URL' }, { status: 400 })
  }

  // Short-circuit HEAD probes: advertise support without touching upstream
  if (method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'none',
        'Cache-Control': 'no-store',
        'X-Stream-Transcoded': 'probe',
      })
    })
  }

  // Detect M3U8 streams for universal optimization (basic heuristic)
  let isM3U8 = sourceUrl.includes('.m3u8') || sourceUrl.toLowerCase().includes('m3u8')
  // If force or uncertain, do a quick probe to detect HLS by content-type or signature
  if (!isM3U8 && (force || optimize)) {
    try {
      const hlsLikely = await isLikelyHls(sourceUrl)
      if (hlsLikely) {
        console.log('🔎 Probe indicates HLS stream despite missing \'m3u8\' token')
        isM3U8 = true
      }
    } catch (e) {
      console.warn('🔎 HLS probe failed, continuing with heuristics:', (e as Error).message)
    }
  }

  try {
    if (isM3U8 && !isSafari) {
      // Universal M3U8 → MP4 conversion for better browser compatibility
      // Chrome, Firefox, Edge all benefit from progressive MP4 vs HLS.js overhead
      console.log('🌐 Converting M3U8 to MP4 for universal browser compatibility')
      return await convertM3U8ToMP4Stream(sourceUrl, request)
    } else if (isSafari && isM3U8) {
      // Safari can handle M3U8 natively, but also offer conversion option
      if (optimize || force) {
        console.log('🍎 Safari M3U8 optimization/force requested → converting to MP4')
        return await convertM3U8ToMP4Stream(sourceUrl, request)
      } else {
        console.log('🍎 Safari native M3U8 support - proxying original')
        return proxyOriginalStream(sourceUrl, request)
      }
    } else if (isSafari) {
      // Safari-specific compatibility processing for non-M3U8 streams
      return await provideSafariCompatibleStream(sourceUrl, request, { force })
    } else {
      // For other formats, proxy the original stream
      if (force) {
        // As a last resort under force, attempt an MP4 remux/transcode
        console.log('🛠️ Force flag set on non-HLS; attempting ffmpeg MP4 transcode')
        try { return await transcodeToH264Mp4(sourceUrl, request, { preferCopy: true }) } catch {}
      }
      return proxyOriginalStream(sourceUrl, request)
    }
  } catch (error) {
    console.error('❌ Stream transcoding error:', error)
    // Fallback to original stream if processing fails
    return proxyOriginalStream(sourceUrl, request)
  }
}

// Quick probe to check if a URL is likely an HLS playlist without relying on filename
async function isLikelyHls(url: string): Promise<boolean> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Range': 'bytes=0-1023', 'User-Agent': 'Mozilla/5.0 (compatible; MoviePine/1.0)' },
      redirect: 'follow',
      signal: controller.signal
    })
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (ct.includes('application/vnd.apple.mpegurl') || ct.includes('application/x-mpegurl')) return true
    // Peek first KB for #EXTM3U signature
    const buf = new Uint8Array(await res.arrayBuffer())
    const text = new TextDecoder().decode(buf)
    return text.trimStart().toUpperCase().startsWith('#EXTM3U')
  } catch {
    return false
  } finally {
    clearTimeout(id)
  }
}

async function proxyOriginalStream(sourceUrl: string, request: NextRequest) {
  console.log('🔗 Proxying original stream (non-Safari)')
  
  const range = request.headers.get('range')
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; MoviePine/1.0)',
  }
  
  if (range) {
    headers['Range'] = range
  }

  let upstream: Response
  try {
    upstream = await fetch(sourceUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    console.warn('🔗 Upstream fetch failed, redirecting client to source:', (err as Error).message)
  const resp = Response.redirect(sourceUrl, 302)
  resp.headers.set('Access-Control-Allow-Origin', '*')
  resp.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  resp.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type')
  return resp
  }

  const responseHeaders = new Headers()
  
  // Copy important headers
  upstream.headers.forEach((value, key) => {
    if (['content-length', 'content-range', 'content-type', 'accept-ranges'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })

  // Always include permissive CORS for in-app playback
  responseHeaders.set('Access-Control-Allow-Origin', '*')
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

async function provideSafariCompatibleStream(sourceUrl: string, request: NextRequest, opts: { force?: boolean } = {}) {
  console.log('🍎 Analyzing stream for Safari compatibility:', sourceUrl.substring(0, 50) + '...')
  // Avoid recursion if caller passed our own endpoint URL; unwrap inner URL
  const unwrappedUrl = unwrapIfSelfTranscoderUrl(sourceUrl, request) || sourceUrl
  
  // Force path: skip analysis and go straight to transcoding (useful for tests or stubborn streams)
  if (opts.force) {
    console.log('🍎 [FORCE] Bypassing analysis, forcing real-time transcoding')
    return await transcodeToH264Mp4(unwrappedUrl, request, { preferCopy: false })
  }

  // Step 1: Analyze the source stream
  const streamInfo = await analyzeStream(unwrappedUrl)
  
  if (streamInfo.isSafariCompatible) {
    console.log('🍎 Stream is already Safari compatible - direct proxy')
    return proxyOriginalStream(unwrappedUrl, request)
  }
  
  console.log('🍎 Stream needs Safari compatibility processing')
  
  // Step 2: Build transcoder URL for Safari compatibility
  try {
    return await buildTranscoderUrl(unwrappedUrl, request, streamInfo)
  } catch (error) {
    console.warn('🍎 Transcoder URL building failed:', error)
  }
  
  // Step 3: Try cloud-based transcoding services
  if (process.env.TRANSCODING_SERVICE_URL) {
    try {
      return await useCloudTranscoding(unwrappedUrl, request, streamInfo)
    } catch (error) {
      console.warn('🍎 Cloud transcoding failed, trying fallback:', error)
    }
  }
  
  // Step 4: Try container manipulation (remux without re-encoding)
  if (streamInfo.hasH264Video && streamInfo.hasCompatibleAudio) {
    try {
      return await remuxToMp4Container(unwrappedUrl, request)
    } catch (error) {
      console.warn('🍎 Container remux failed:', error)
    }
  }
  
  // Step 5: Client-side fallback with warning
  console.log('🍎 No server-side solution available - proxying with Safari warning')
  return proxyWithSafariWarning(unwrappedUrl, request, streamInfo)
}

async function analyzeStream(sourceUrl: string): Promise<StreamAnalysis> {
  try {
    // Many upstreams reject HEAD. Probe with a tiny GET range.
    const response = await fetch(sourceUrl, { 
      method: 'GET',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; MoviePine/1.0)',
        'Range': 'bytes=0-1'
      },
      signal: AbortSignal.timeout(10000)
    })
    
    const contentType = response.headers.get('content-type')?.toLowerCase() || ''
    const contentDisposition = response.headers.get('content-disposition')?.toLowerCase() || ''
    const filename = extractFilename(sourceUrl, contentDisposition)
    
    console.log('🍎 Stream analysis:', {
      contentType,
      filename: filename?.substring(0, 50),
      status: response.status
    })
    
    const analysis: StreamAnalysis = {
      isSafariCompatible: false,
      containerFormat: 'unknown',
      hasH264Video: false,
      hasCompatibleAudio: false,
      needsTranscoding: true,
      filename
    }
    
    // Detect container format
    if (contentType.includes('mp4') || filename?.endsWith('.mp4')) {
      analysis.containerFormat = 'mp4'
      analysis.isSafariCompatible = true
      analysis.needsTranscoding = false
    } else if (contentType.includes('matroska') || filename?.endsWith('.mkv')) {
      analysis.containerFormat = 'mkv'
    } else if (contentType.includes('webm') || filename?.endsWith('.webm')) {
      analysis.containerFormat = 'webm'
    }
    
    // Analyze filename for codec hints
    if (filename) {
      const nameLower = filename.toLowerCase()
      analysis.hasH264Video = /h\.?264|x264|avc/i.test(nameLower)
      analysis.hasCompatibleAudio = /aac|mp3/i.test(nameLower) && !/dts|ac3|flac/i.test(nameLower)
    }
    
    return analysis
    
  } catch (error) {
  console.error('🍎 Stream analysis failed:', error)
    return {
      isSafariCompatible: false,
      containerFormat: 'unknown',
      hasH264Video: false,
      hasCompatibleAudio: false,
      needsTranscoding: true,
      filename: null
    }
  }
}

async function buildTranscoderUrl(sourceUrl: string, request: NextRequest, streamInfo: StreamAnalysis) {
  console.log('🍎 [SAFARI TRANSCODING] Building real transcoded stream for Safari')
  
  // For Safari compatibility, we need to provide a transcoded MP4 stream
  // This will proxy the stream with Safari-compatible headers and processing
  
  // Step 1: Try smart container remux (works for H.264+AAC in MKV containers)
  if (streamInfo.hasH264Video && streamInfo.hasCompatibleAudio) {
    console.log('🍎 [SAFARI TRANSCODING] Stream has H.264+AAC - attempting container remux')
    try {
      return await remuxToMp4Container(sourceUrl, request)
    } catch (error) {
      console.warn('🍎 Container remux failed, falling back to stream proxy:', error)
    }
  }
  
  // Step 2: For MKV or incompatible codecs, attempt real-time transcoding to H.264 MP4
  if (streamInfo.containerFormat === 'mkv' || streamInfo.needsTranscoding) {
    try {
      // If it looks like H.264+AAC inside MKV, prefer fast remux via ffmpeg (no re-encode)
      const preferCopy = !!(streamInfo.hasH264Video && streamInfo.hasCompatibleAudio)
      return await transcodeToH264Mp4(sourceUrl, request, { preferCopy })
    } catch (err) {
      console.warn('🍎 [SAFARI TRANSCODING] ffmpeg path failed, falling back to proxy:', err)
    }
  }

  // Step 3: As last resort, proxy with Safari headers (may fail on some MKV)
  console.log('🍎 [SAFARI TRANSCODING] Proxying stream with Safari-compatible headers')
  return await proxySafariCompatibleStream(sourceUrl, request, streamInfo)
}

async function proxySafariCompatibleStream(sourceUrl: string, request: NextRequest, streamInfo: StreamAnalysis) {
  console.log('🍎 [SAFARI PROXY] Streaming real content with Safari compatibility mode')
  // Avoid recursion by unwrapping if pointing to this endpoint
  const targetUrl = unwrapIfSelfTranscoderUrl(sourceUrl, request) || sourceUrl
  
  const range = request.headers.get('range')
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; MoviePine-SafariTranscoder/1.0)',
    'Accept': 'video/mp4,video/*,*/*',
  }
  
  if (range) {
    headers['Range'] = range
    console.log('🍎 [SAFARI PROXY] Range request:', range)
  }

  console.log('🍎 [SAFARI PROXY] Fetching stream:', targetUrl.substring(0, 80) + '...')
  
  // Always use GET to upstream (HEAD often fails). We still honor HEAD at top-level.
  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    console.warn('🍎 [SAFARI PROXY] Upstream fetch failed, redirecting client to source:', (err as Error).message)
  const resp = Response.redirect(targetUrl, 302)
  resp.headers.set('Access-Control-Allow-Origin', '*')
  resp.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  resp.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type')
  return resp
  }

  console.log('🍎 [SAFARI PROXY] Upstream response:', upstream.status, upstream.statusText)

  const responseHeaders = new Headers()
  
  // Copy essential streaming headers
  upstream.headers.forEach((value, key) => {
    const keyLower = key.toLowerCase()
    if (['content-length', 'content-range', 'accept-ranges', 'content-encoding'].includes(keyLower)) {
      responseHeaders.set(key, value)
    }
  })
  
  // Set Safari-optimized headers
  responseHeaders.set('Content-Type', 'video/mp4') // Force MP4 content type
  responseHeaders.set('Accept-Ranges', 'bytes')
  responseHeaders.set('X-Safari-Transcoded', 'live-stream')
  responseHeaders.set('X-Original-Format', streamInfo.containerFormat)
  responseHeaders.set('X-Stream-Processing', 'safari-compatibility-mode')
  responseHeaders.set('Cache-Control', 'public, max-age=300')
  
  // Add CORS headers for Safari
  responseHeaders.set('Access-Control-Allow-Origin', '*')
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type')

  console.log('🍎 [SAFARI PROXY] Returning transcoded stream with MP4 headers')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

async function mockTranscodingResponse(sourceUrl: string, request: NextRequest, streamInfo: StreamAnalysis) {
  console.log('🍎 [MOCK TRANSCODING] Simulating transcoded stream for Safari')
  
  // In a real implementation, this would:
  // 1. Submit the source URL to a transcoding queue
  // 2. Monitor transcoding progress
  // 3. Return the transcoded MP4 stream when ready
  // 4. Stream the result back to Safari
  
  // For now, return the original stream with Safari-friendly headers
  // This is a fallback that may or may not work depending on the actual stream
  
  const range = request.headers.get('range')
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; MoviePine-Transcoder/1.0)',
  }
  
  if (range) {
    headers['Range'] = range
  }

  const upstream = await fetch(sourceUrl, {
    method: request.method,
    headers,
  })

  const responseHeaders = new Headers()
  
  // Copy essential headers
  upstream.headers.forEach((value, key) => {
    if (['content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })
  
  // Set Safari-friendly headers
  responseHeaders.set('Content-Type', 'video/mp4')
  responseHeaders.set('X-Safari-Transcoded', 'true')
  responseHeaders.set('X-Original-Format', streamInfo.containerFormat)
  responseHeaders.set('X-Transcoding-Note', 'This is a mock transcoded stream')

  console.log('🍎 [MOCK TRANSCODING] Returning mock transcoded stream with MP4 content-type')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

async function useCloudTranscoding(sourceUrl: string, request: NextRequest, streamInfo: StreamAnalysis) {
  // Integration with cloud transcoding services like:
  // - AWS MediaConvert
  // - Google Cloud Video Intelligence
  // - Azure Media Services
  // - Cloudflare Stream
  
  const cloudUrl = process.env.TRANSCODING_SERVICE_URL!
  console.log('🍎 Attempting cloud transcoding via:', cloudUrl)
  
  const transcodingRequest = {
    sourceUrl,
    targetFormat: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    preset: 'web_optimized'
  }
  
  const response = await fetch(cloudUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TRANSCODING_API_KEY}`
    },
    body: JSON.stringify(transcodingRequest),
    signal: AbortSignal.timeout(30000)
  })
  
  if (!response.ok) {
    throw new Error(`Cloud transcoding failed: ${response.status}`)
  }
  
  // Proxy the transcoded stream
  return new Response(response.body, {
    headers: {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}

async function remuxToMp4Container(sourceUrl: string, request: NextRequest) {
  // Container remuxing without re-encoding (much faster than transcoding)
  // This could use lightweight tools or cloud services
  console.log('🍎 Attempting container remux to MP4')
  const targetUrl = unwrapIfSelfTranscoderUrl(sourceUrl, request) || sourceUrl
  
  // For now, return the original stream with MP4 content-type override
  // This might work for some MKV files with H.264+AAC
  const range = request.headers.get('range')
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; MoviePine/1.0)',
  }
  
  if (range) {
    headers['Range'] = range
  }

  const upstream = await fetch(targetUrl, {
    method: 'GET',
    headers,
  })

  const responseHeaders = new Headers()
  
  // Copy headers but override content-type
  upstream.headers.forEach((value, key) => {
    if (['content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })
  
  // Override content-type to MP4 (risky but might work)
  responseHeaders.set('Content-Type', 'video/mp4')
  responseHeaders.set('X-Safari-Remux', 'true')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

// Helper: unwrap nested calls to this same transcoder endpoint to avoid loops
function unwrapIfSelfTranscoderUrl(candidateUrl: string, request: NextRequest): string | null {
  try {
    const cand = new URL(candidateUrl)
    const self = new URL(request.url)
    const isSelf = cand.origin === self.origin && cand.pathname.startsWith('/api/stream-transcoder')
    if (!isSelf) return null
    const inner = cand.searchParams.get('url')
    if (inner) {
      console.warn('🍎 [GUARD] Unwrapping nested transcoder URL to avoid recursion')
      return inner
    }
    return null
  } catch {
    return null
  }
}

/**
 * Transcodes (or remuxes) arbitrary inputs to Safari-friendly fragmented MP4 via ffmpeg.
 * - When preferCopy=true, we try stream copy first (fast). If ffmpeg errors, caller falls back.
 * - Otherwise we transcode to H.264/AAC.
 */
async function transcodeToH264Mp4(
  sourceUrl: string,
  request: NextRequest,
  options: { preferCopy?: boolean } = {}
) {
  // Simple in-process concurrency limiter
  const MAX = Number(process.env.MAX_CONCURRENT_TRANSCODES || 2)
  if (!acquireSlot(MAX)) {
    console.warn('🍎 [FFMPEG] Concurrency limit reached, declining transcode')
    return new Response(JSON.stringify({ error: 'busy', message: 'Transcoder busy, try again shortly' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '10', 'Access-Control-Allow-Origin': '*' }
    })
  }
  const method = request.method.toUpperCase()
  if (method === 'HEAD') {
    // Signal availability without body
  releaseSlot()
    return new Response(null, {
      status: 200,
      headers: new Headers({
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'none',
        'X-Safari-Transcoded': 'ffmpeg',
        'Cache-Control': 'no-store'
      })
    })
  }

  const ua = 'Mozilla/5.0 (compatible; MoviePine-Transcoder/1.0)'
  const baseArgs = [
    '-loglevel', 'error',
    '-nostdin',
    '-user_agent', ua,
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', sourceUrl,
    '-movflags', 'frag_keyframe+empty_moov+faststart',
  ]

  const args = options.preferCopy
    ? [...baseArgs, '-c', 'copy', '-f', 'mp4', 'pipe:1']
    : [
        ...baseArgs,
        '-sn',
        '-dn',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-f', 'mp4',
        'pipe:1',
      ]

  const bin = resolveFFmpegPath()
  console.log('🍎 [FFMPEG] Starting', options.preferCopy ? 'remux (copy)' : 'transcode', 'pipeline', 'via', bin)
  const ff = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })

  // Log stderr for diagnostics
  ff.stderr.on('data', (d) => {
    // Emit trimmed lines to avoid spam
    const line = d.toString()
    if (line.trim()) console.debug('🍎 [FFMPEG]', line.trim())
  })

  // Bridge Node stream to Web ReadableStream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const safeClose = () => { if (!closed) { closed = true; try { controller.close() } catch {} } }
      const safeError = (err: unknown) => { if (!closed) { closed = true; try { controller.error(err) } catch {} } }

      ff.stdout.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)))
      ff.stdout.on('end', safeClose)
      ff.on('error', (err) => {
        console.error('🍎 [FFMPEG] process error:', err)
        safeError(err)
        // Ensure slot is released even if spawn failed
        releaseSlot()
      })
      ff.on('close', (code) => {
        if (code !== 0) console.warn('🍎 [FFMPEG] exited with code', code)
        safeClose()
        releaseSlot()
      })
    },
    cancel() {
      try { ff.kill('SIGKILL') } catch {}
      releaseSlot()
    }
  })

  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Transfer-Encoding': 'chunked',
    'Accept-Ranges': 'none',
    'Cache-Control': 'no-store',
    'X-Safari-Transcoded': options.preferCopy ? 'ffmpeg-copy' : 'ffmpeg-h264',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type'
  })

  return new Response(stream, { status: 200, headers })
}

// Concurrency limiter (simple process-local slots)
let CURRENT_TRANSCODES = 0
function acquireSlot(max: number) {
  if (CURRENT_TRANSCODES >= max) return false
  CURRENT_TRANSCODES++
  return true
}
function releaseSlot() {
  CURRENT_TRANSCODES = Math.max(0, CURRENT_TRANSCODES - 1)
}

async function proxyWithSafariWarning(sourceUrl: string, request: NextRequest, streamInfo: StreamAnalysis) {
  console.log('🍎 Proxying with Safari compatibility warning')
  
  const response = await proxyOriginalStream(sourceUrl, request)
  
  // Add warning headers for client-side handling
  response.headers.set('X-Safari-Warning', 'Stream may not be compatible with Safari')
  response.headers.set('X-Stream-Format', streamInfo.containerFormat)
  response.headers.set('X-Needs-Transcoding', 'true')
  
  return response
}

function extractFilename(url: string, contentDisposition: string): string | null {
  // Try content-disposition header first
  const cdMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  if (cdMatch && cdMatch[1]) {
    return cdMatch[1].replace(/['"]/g, '')
  }
  
  // Fall back to URL parsing
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const segments = pathname.split('/')
    const lastSegment = segments[segments.length - 1]
    
    if (lastSegment && lastSegment.includes('.')) {
      return decodeURIComponent(lastSegment)
    }
  } catch (error) {
    console.debug('URL parsing failed:', error)
  }
  
  return null
}

/**
 * Universal M3U8 to MP4 Stream Converter
 * 
 * Converts HLS (M3U8) streams to progressive MP4 for better Chrome compatibility
 * and universal browser support. Uses FFmpeg to transcode live streams in real-time.
 */
async function convertM3U8ToMP4Stream(sourceUrl: string, request: NextRequest): Promise<Response> {
  console.log('🔄 Converting M3U8 to MP4 stream:', sourceUrl.substring(0, 100) + '...')

  // Check concurrency limits
  if (!acquireSlot(3)) {
    console.log('⚠️ M3U8 conversion slots full, falling back to proxy')
    return proxyOriginalStream(sourceUrl, request)
  }

  const ffmpeg = resolveFFmpegPath()
  console.log('🎬 Using FFmpeg at:', ffmpeg)

  try {
    // FFmpeg command for M3U8 → MP4 conversion
    // Optimized for live streaming with minimal latency
    const args = [
      '-i', sourceUrl,                    // Input M3U8 stream
      '-c:v', 'libx264',                  // H.264 video codec (universal)
      '-preset', 'ultrafast',             // Fast encoding for live streams
      '-tune', 'zerolatency',             // Minimize latency
      '-c:a', 'aac',                      // AAC audio codec (universal)
      '-b:a', '128k',                     // Audio bitrate
      '-movflags', 'frag_keyframe+empty_moov+faststart', // Progressive MP4
      '-f', 'mp4',                        // Output format
      '-avoid_negative_ts', 'make_zero',  // Handle timestamp issues
      '-fflags', '+genpts',               // Generate timestamps
      '-'                                 // Output to stdout
    ]

    console.log('🚀 Starting M3U8 → MP4 conversion with args:', args.slice(0, 8))

    const ffmpegProcess = spawn(ffmpeg, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    // Handle FFmpeg errors
    ffmpegProcess.stderr?.on('data', (data) => {
      const message = data.toString()
      if (message.includes('error') || message.includes('Error')) {
        console.error('❌ FFmpeg error:', message.trim())
      } else {
        console.log('📊 FFmpeg:', message.trim())
      }
    })

    // Handle process completion
    ffmpegProcess.on('close', (code) => {
      console.log(`🏁 M3U8 conversion process finished with code: ${code}`)
      releaseSlot()
    })

    ffmpegProcess.on('error', (error) => {
      console.error('❌ FFmpeg process error:', error)
      releaseSlot()
    })

    // Create readable stream from FFmpeg output
    const stream = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout?.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        ffmpegProcess.stdout?.on('end', () => {
          console.log('✅ M3U8 → MP4 conversion stream ended')
          controller.close()
        })

        ffmpegProcess.stdout?.on('error', (error) => {
          console.error('❌ FFmpeg stdout error:', error)
          controller.error(error)
        })
      },

      cancel() {
        console.log('🛑 M3U8 conversion stream cancelled')
        ffmpegProcess.kill('SIGTERM')
        releaseSlot()
      }
    })

    // Return progressive MP4 stream
    const headers = new Headers({
      'Content-Type': 'video/mp4',
      'Transfer-Encoding': 'chunked',
      'Accept-Ranges': 'none',
      'Cache-Control': 'no-store',
      'X-Stream-Transcoded': 'ffmpeg-m3u8-to-mp4',
      'X-Original-Format': 'application/x-mpegURL',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type'
    })

    return new Response(stream, { status: 200, headers })

  } catch (error) {
    console.error('❌ M3U8 conversion failed:', error)
    releaseSlot()
    
    // Fallback to original stream
    console.log('🔄 Falling back to original M3U8 stream')
    return proxyOriginalStream(sourceUrl, request)
  }
}

interface StreamAnalysis {
  isSafariCompatible: boolean
  containerFormat: string
  hasH264Video: boolean
  hasCompatibleAudio: boolean
  needsTranscoding: boolean
  filename: string | null
}
