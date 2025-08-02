import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    tmdbApiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'SET' : 'NOT SET',
    torboxApiKey: process.env.NEXT_PUBLIC_TORBOX_API_KEY ? 'SET' : 'NOT SET',
    debridService: process.env.NEXT_PUBLIC_DEBRID_SERVICE || 'NOT SET',
    debridApiKey: process.env.NEXT_PUBLIC_DEBRID_API_KEY ? 'SET' : 'NOT SET',
    torrentioProviders: process.env.NEXT_PUBLIC_TORRENTIO_PROVIDERS || 'NOT SET',
  })
}
