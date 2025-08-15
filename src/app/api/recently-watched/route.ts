import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authHeader = req.headers.get('authorization') || ''
  return createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit'))||25, 100)
    const { data, error } = await supabase.from('watch_progress')
      .select('content_id,updated_at,progress_seconds,duration_seconds')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return new Response(JSON.stringify({ success:true, items: data||[] }), { status:200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, error:e.message }), { status:500 })
  }
}
