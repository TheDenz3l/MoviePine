import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const userId = 'eb553c02-c01d-4cbb-9acb-94c80dbb5763'

    // 1. Insert some test progress data
    const testProgress = {
      user_id: userId,
      content_id: 'test-movie-debug-123',
      current_time: 1800, // 30 minutes
      duration: 7200,     // 2 hours
      last_stream_url: 'https://example.com/test.m3u8',
      last_subtitles: [],
      updated_at: new Date().toISOString()
    }

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('watch_progress')
      .upsert(testProgress, { onConflict: 'user_id,content_id' })
      .select()

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to insert test data',
        details: insertError.message 
      }, { status: 500 })
    }

    // 2. Query continue watching
    const { data: continueData, error: continueError } = await supabaseAdmin
      .from('watch_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .gt('progress', 0.05)
      .lt('progress', 0.95)
      .order('updated_at', { ascending: false })

    return NextResponse.json({
      success: true,
      testDataInserted: insertData,
      continueWatchingItems: {
        count: continueData?.length || 0,
        items: continueData || [],
        error: continueError?.message || null
      },
      message: 'Test data created and continue watching queried'
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
