import { NextRequest } from 'next/server'

// Allowed remote hostnames (basic safeguard)
const ALLOWED_HOSTS = new Set([
  'image.tmdb.org',
  'images.unsplash.com'
])

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get('url')
    if (!urlParam) {
      return new Response('Missing url param', { status: 400 })
    }
    let remote: URL
    try { remote = new URL(urlParam) } catch { return new Response('Invalid url', { status: 400 }) }
    if (!ALLOWED_HOSTS.has(remote.hostname)) {
      return new Response('Host not allowed', { status: 400 })
    }

    const upstream = await fetch(remote.toString(), { headers: { 'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' }, cache: 'no-store' })
    if (!upstream.ok) {
      return new Response(`Upstream error ${upstream.status}`, { status: 502 })
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const arrayBuf = await upstream.arrayBuffer()
    return new Response(arrayBuf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Origin'
      }
    })
  } catch (e) {
    console.error('[image-proxy] Failure', e)
    return new Response('Internal error', { status: 500 })
  }
}

export const runtime = 'edge'
