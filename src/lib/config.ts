// Configuration for the streaming service

export interface AppConfig {
  tmdbApiKey: string
  torboxApiKey?: string
  torrentioProviders: string[]
  debridService?: 'realdebrid' | 'premiumize' | 'alldebrid'
  debridApiKey?: string
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

  return {
    tmdbApiKey,
    torboxApiKey: process.env.NEXT_PUBLIC_TORBOX_API_KEY,
    torrentioProviders,
    debridService,
    debridApiKey: process.env.NEXT_PUBLIC_DEBRID_API_KEY,
  }
}

// Default configuration for development/demo
export const defaultConfig: AppConfig = {
  tmdbApiKey: '', // Empty - will trigger fallback mode
  torrentioProviders: ['rarbg', '1337x', 'thepiratebay', 'kickass'],
}

export function getConfigOrDefault(): AppConfig {
  try {
    return getConfig()
  } catch (error) {
    console.warn('Using default configuration:', error)
    return defaultConfig
  }
}
