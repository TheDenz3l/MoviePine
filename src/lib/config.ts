// Configuration for the streaming service

export interface AppConfig {
  tmdbApiKey: string
  torboxApiKey?: string
  torrentioProviders: string[]
  debridService?: 'realdebrid' | 'premiumize' | 'alldebrid'
  debridApiKey?: string
  debridioManifestUrl?: string
  debridioEnabled?: boolean
  webSafeMode?: boolean // Only fetch browser-compatible streams (MP4/H.264/AAC)
  allowTranscoding?: boolean // Allow transcoding for incompatible formats
}

export function getConfig(): AppConfig {
  const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY

  if (!tmdbApiKey) {
    throw new Error('TMDB API key is required. Please set NEXT_PUBLIC_TMDB_API_KEY in your environment variables.')
  }

  const torrentioProviders = process.env.NEXT_PUBLIC_TORRENTIO_PROVIDERS
    ? process.env.NEXT_PUBLIC_TORRENTIO_PROVIDERS.split(',').map(p => p.trim())
    : ['rarbg', '1337x', 'thepiratebay', 'kickass']

  const debridService = process.env.NEXT_PUBLIC_DEBRID_SERVICE as 'realdebrid' | 'premiumize' | 'alldebrid' | undefined
  const debridioEnabled = process.env.NEXT_PUBLIC_DEBRIDIO_ENABLED === 'true'
  
  // Debug: Log environment variables
  console.log('🔧 [CONFIG] Reading environment variables:', {
    hasDebridioManifestUrl: !!process.env.NEXT_PUBLIC_DEBRIDIO_MANIFEST_URL,
    debridioEnabled: debridioEnabled,
    debridioEnabledRaw: process.env.NEXT_PUBLIC_DEBRIDIO_ENABLED
  })

  return {
    tmdbApiKey,
    torboxApiKey: process.env.NEXT_PUBLIC_TORBOX_API_KEY,
    torrentioProviders,
    debridService,
    debridApiKey: process.env.NEXT_PUBLIC_DEBRID_API_KEY,
    debridioManifestUrl: process.env.NEXT_PUBLIC_DEBRIDIO_MANIFEST_URL,
    debridioEnabled,
    webSafeMode: process.env.NEXT_PUBLIC_WEB_SAFE_MODE === 'true',
    allowTranscoding: process.env.NEXT_PUBLIC_ALLOW_TRANSCODING !== 'false', // Default true
  }
}

// Default configuration for development/demo
export const defaultConfig: AppConfig = {
  tmdbApiKey: '', // Empty - will trigger fallback mode
  torrentioProviders: ['rarbg', '1337x', 'thepiratebay', 'kickass'],
  webSafeMode: false,
  allowTranscoding: true,
}

export function getConfigOrDefault(): AppConfig {
  try {
    return getConfig()
  } catch (error) {
    console.warn('Using default configuration:', error)
    return defaultConfig
  }
}
