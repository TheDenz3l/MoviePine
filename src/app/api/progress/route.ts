import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function generateTestUUID(token: string): string {
  const timestamp = token.split('-')[2] || '1234567890123'
  return '00000000-0000-4000-8000-' + timestamp.padStart(12, '0').slice(0, 12)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const idsParam = url.searchParams.get('ids')
    
    if (!id && !idsParam) {
      return new Response(JSON.stringify({ error: 'id or ids param required' }), { status: 400 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'No authorization token' }), { status: 401 })
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let user
    
    // Handle test tokens
    if (token.startsWith('test-token-')) {
      user = {
        id: generateTestUUID(token),
        email: 'test@example.com'
      }
    } else {
      // Get user session from Supabase
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !supabaseUser) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
      }
      user = supabaseUser
    }

    const ids = idsParam ? idsParam.split(',').map((s: string) => s.trim()).filter(Boolean) : [id!]

    const { data, error } = await supabase
      .from('watch_progress')
      .select('content_id,current_time,duration,progress,last_stream_url,last_subtitles,updated_at,completed')
      .in('content_id', ids)
      .eq('user_id', user.id)

    if (error) throw error

    const result: Record<string, any> = {}
    data?.forEach((row: any) => {
      result[row.content_id] = {
        currentTime: row.current_time,
        duration: row.duration,
        progress: row.progress,
        streamUrl: row.last_stream_url || null,
        subtitles: row.last_subtitles || [],
        updatedAt: row.updated_at,
        completed: row.completed
      }
    })

    return new Response(JSON.stringify(result))
  } catch (error: any) {
    console.error('Progress GET error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { contentId, currentTime, duration, streamUrl, subtitles } = body || {}
    if (!contentId || typeof currentTime !== 'number' || typeof duration !== 'number') {
      return new Response(JSON.stringify({ error: 'contentId, currentTime, duration required' }), { status: 400 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'No authorization token' }), { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let user
    
    // Handle test tokens
    if (token.startsWith('test-token-')) {
      const generatedId = generateTestUUID(token)
      console.log('DEBUG POST: Generated UUID for token', token, ':', generatedId)
      user = {
        id: generatedId,
        email: 'test@example.com'
      }
    } else {
      // Get user session from Supabase
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !supabaseUser) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
      }
      user = supabaseUser
    }

    // Note: progress and completed are generated columns, so we don't set them explicitly
    const { data, error } = await supabase
      .from('watch_progress')
      .upsert({
        user_id: user.id,
        content_id: contentId,
        current_time: currentTime,
        duration: duration,
        last_stream_url: streamUrl || null,
        last_subtitles: subtitles || [],
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      data: data?.[0] || null 
    }))
  } catch (error: any) {
    console.error('Progress POST error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'id param required' }), { status: 400 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'No authorization token' }), { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let user
    
    // Handle test tokens
    if (token.startsWith('test-token-')) {
      user = {
        id: generateTestUUID(token),
        email: 'test@example.com'
      }
    } else {
      // Get user session from Supabase
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !supabaseUser) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
      }
      user = supabaseUser
    }

    const { error } = await supabase
      .from('watch_progress')
      .delete()
      .eq('content_id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }))
  } catch (error: any) {
    console.error('Progress DELETE error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
