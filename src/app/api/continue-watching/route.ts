import { NextRequest, NextResponse } from 'next/server';
import { getSessionServer } from '@/lib/sessionUtils';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { user } = await getSessionServer(request);

    if (!user) {
      console.warn('[Continue Watching API] Unauthorized access attempt: No user session.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client for database operations
    // Use the same approach as the progress API for consistency
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get in-progress items (not completed, has some progress)
    const { data: progressItems, error: progressError } = await supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gt('current_time', 0)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (progressError) {
      console.error('[Continue Watching API] Database error fetching progress:', progressError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Enrich with metadata from TMDB (mock for now, you can add real TMDB integration)
    const enrichedItems = await Promise.all(
      (progressItems || []).map(async (item) => {
        // For now, return basic structure
        // You can integrate with TMDB API here to get title, poster, etc.
        return {
          id: item.id,
          content_id: item.content_id,
          content_type: item.content_type,
          title: `Content ${item.content_id}`, // Replace with TMDB lookup
          poster_path: null, // Replace with TMDB data
          season_number: item.season_number,
          episode_number: item.episode_number,
          episode_title: item.episode_title,
          current_time: item.current_time,
          duration: item.duration,
          progress: parseFloat(item.progress || '0'),
          completed: item.completed,
          updated_at: item.updated_at,
          last_stream_url: item.last_stream_url,
        };
      })
    );

    console.log(`[Continue Watching API] Successfully fetched ${enrichedItems.length} items for user: ${user.id}`);
    return NextResponse.json({
      success: true,
      items: enrichedItems,
    });

  } catch (error: any) {
    console.error('[Continue Watching API] Internal server error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
