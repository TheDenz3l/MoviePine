import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'

function getClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = req.headers.get('authorization') || ''
  return createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getClient(req)
    const body = await req.json().catch(()=>({}))
    const { contentId, contentType } = body
    if (!contentId || !contentType) return new Response(JSON.stringify({ error: 'contentId & contentType required' }), { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  if (!rateLimit(`watch:add:${user.id}`, { capacity: 60, intervalMs: 60000 })) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    const { error } = await supabase.from('user_watchlist').upsert({ user_id: user.id, content_id: contentId, content_type: contentType })
    if (error) throw error
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e:any) { return new Response(JSON.stringify({ success:false, error: e.message }), { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getClient(req)
    const url = new URL(req.url)
    const contentId = url.searchParams.get('id')
    if (!contentId) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  if (!rateLimit(`watch:del:${user.id}`, { capacity: 120, intervalMs: 60000 })) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    const { error } = await supabase.from('user_watchlist').delete().eq('user_id', user.id).eq('content_id', contentId)
    if (error) throw error
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e:any) { return new Response(JSON.stringify({ success:false, error: e.message }), { status: 500 }) }
}
