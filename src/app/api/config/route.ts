import { NextResponse } from 'next/server'
import { getConfig, getConfigOrDefault } from '@/lib/config'

export async function GET() {
  try {
    // Try to get the real config first
    let config
    let configSource = 'real'
    
    try {
      config = getConfig()
    } catch (error) {
      config = getConfigOrDefault()
      configSource = 'default'
    }

    return NextResponse.json({
      success: true,
      configSource,
      config: {
        tmdbApiKey: config.tmdbApiKey,
        torboxApiKey: config.torboxApiKey,
        torrentioProviders: config.torrentioProviders,
        debridService: config.debridService,
        debridApiKey: config.debridApiKey,
        debridioApiKey: config.debridioApiKey,
        debridioEnabled: config.debridioEnabled,
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
