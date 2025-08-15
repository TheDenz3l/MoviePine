// Deprecated favorites endpoint. Favorites feature removed; this route retained only to avoid 404 spam.
// Always returns 410 Gone instructing clients to migrate to watchlist endpoints.
import { NextRequest } from 'next/server'

export async function POST() {
  return new Response(JSON.stringify({ error: 'favorites_removed', message: 'Favorites API removed. Use /api/list/watchlist.' }), { status: 410 })
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: 'favorites_removed', message: 'Favorites API removed. Use /api/list/watchlist.' }), { status: 410 })
}
