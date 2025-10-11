import { NextResponse } from 'next/server'

export async function GET() {
  // Check environment variables
  const envVars = {
    TMDB_API_KEY: {
      set: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      value: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 
        `${process.env.NEXT_PUBLIC_TMDB_API_KEY.substring(0, 8)}...` : 'NOT SET',
      length: process.env.NEXT_PUBLIC_TMDB_API_KEY?.length || 0
    },
    DEBRID_SERVICE: {
      set: !!process.env.NEXT_PUBLIC_DEBRID_SERVICE,
      value: process.env.NEXT_PUBLIC_DEBRID_SERVICE || 'NOT SET'
    },
    DEBRID_API_KEY: {
      set: !!process.env.NEXT_PUBLIC_DEBRID_API_KEY,
      value: process.env.NEXT_PUBLIC_DEBRID_API_KEY ? 
        `${process.env.NEXT_PUBLIC_DEBRID_API_KEY.substring(0, 8)}...` : 'NOT SET',
      length: process.env.NEXT_PUBLIC_DEBRID_API_KEY?.length || 0
    },
    TORBOX_API_KEY: {
      set: !!process.env.NEXT_PUBLIC_TORBOX_API_KEY,
      value: process.env.NEXT_PUBLIC_TORBOX_API_KEY ? 
        `${process.env.NEXT_PUBLIC_TORBOX_API_KEY.substring(0, 8)}...` : 'NOT SET'
    },
    DEBUG_STREAMING: {
      set: !!process.env.NEXT_PUBLIC_DEBUG_STREAMING,
      value: process.env.NEXT_PUBLIC_DEBUG_STREAMING || 'false'
    }
  }

  // Test TMDB API
  let tmdbStatus = { working: false, error: null as string | null }
  if (process.env.NEXT_PUBLIC_TMDB_API_KEY) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
      )
      if (response.ok) {
        tmdbStatus.working = true
      } else {
        tmdbStatus.error = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      tmdbStatus.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Test Real-Debrid API
  let realDebridStatus = { working: false, error: null as string | null, user: null as any }
  if (process.env.NEXT_PUBLIC_DEBRID_SERVICE === 'realdebrid' && process.env.NEXT_PUBLIC_DEBRID_API_KEY) {
    try {
      const response = await fetch('https://api.real-debrid.com/rest/1.0/user', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEBRID_API_KEY}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        realDebridStatus.working = true
        realDebridStatus.user = {
          username: userData.username,
          premium: userData.premium,
          expiration: userData.expiration
        }
      } else {
        const errorText = await response.text()
        realDebridStatus.error = `HTTP ${response.status}: ${errorText}`
      }
    } catch (error) {
      realDebridStatus.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envVars,
    apiStatus: {
      tmdb: tmdbStatus,
      realDebrid: realDebridStatus
    },
    recommendations: {
      restartRequired: !envVars.TMDB_API_KEY.set || !envVars.DEBRID_API_KEY.set,
      message: (!envVars.TMDB_API_KEY.set || !envVars.DEBRID_API_KEY.set) 
        ? 'Environment variables not loaded. Please restart your Next.js dev server: npm run dev'
        : 'Environment variables loaded successfully'
    }
  })
}
