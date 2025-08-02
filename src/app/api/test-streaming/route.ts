import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { createStreamingService } from '@/lib/services/streaming'

export async function GET() {
  try {
    const config = getConfig()
    const streamingService = createStreamingService(config)
    
    // Test TMDB
    const popularMovies = await streamingService.getPopularMovies()
    
    // Test service validation
    const serviceStatus = await streamingService.validateConfiguration()
    
    return NextResponse.json({
      success: true,
      config: {
        tmdbApiKey: config.tmdbApiKey ? 'SET' : 'NOT SET',
        debridService: config.debridService || 'NOT SET',
        debridApiKey: config.debridApiKey ? 'SET' : 'NOT SET',
      },
      serviceStatus,
      moviesCount: popularMovies.length,
      firstMovie: popularMovies[0] ? {
        title: popularMovies[0].title,
        year: popularMovies[0].year,
        id: popularMovies[0].id
      } : null
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
