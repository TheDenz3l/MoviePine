import { NextRequest } from 'next/server'

// Placeholder API for future server-backed recently played persistence.
// Currently client uses localStorage (RecentlyPlayedService). This endpoint
// allows progressive enhancement without breaking clients.
export async function GET() {
  return new Response(JSON.stringify({ status: 'not_implemented', source: 'localStorage' }), { status: 501 })
}

export async function POST(req: NextRequest) {
  return new Response(JSON.stringify({ status: 'not_implemented', source: 'localStorage' }), { status: 501 })
}
