/**
 * Debridio API Client
 * 
 * Debridio is a Stremio addon that provides cached streaming links
 * through debrid services like Real-Debrid and All-Debrid.
 * 
 * Documentation: https://debridio.com/
 * Format: Stremio Addon Protocol
 */

import { StreamCompatibilityChecker } from '@/lib/utils/stream-compatibility'
import type { AppConfig } from '@/lib/config'

export interface DebridioStream {
  name: string
  title: string
  url: string
  infoHash?: string
  behaviorHints?: {
    notWebReady?: boolean
    bingeGroup?: string
  }
}

export interface DebridioConfig {
  manifestUrl: string
  appConfig?: AppConfig
}

export class DebridioAPI {
  private manifestUrl: string
  private baseUrl: string
  private config?: AppConfig

  constructor(config: DebridioConfig) {
    this.manifestUrl = config.manifestUrl
    // Extract base URL from manifest URL
    // e.g., https://addon.debridio.com/{token}/manifest.json -> https://addon.debridio.com/{token}
    this.baseUrl = config.manifestUrl.replace('/manifest.json', '')
    this.config = config.appConfig
    
    if (this.config?.webSafeMode) {
      console.log(`🎯 [DEBRIDIO] Web-safe mode enabled: will filter for browser-compatible streams`)
    }
  }

  /**
   * Get the manifest URL for this addon
   */
  getManifestUrl(): string {
    return this.manifestUrl
  }

  /**
   * Get streams for a movie
   * @param tmdbId - TMDB movie ID (e.g., "617126" or "tmdb_617126")
   * @param isSafari - Optional Safari browser flag for compatibility filtering
   */
  async getMovieStreams(tmdbId: string, isSafari?: boolean): Promise<DebridioStream[]> {
    try {
      // Remove "tmdb_" prefix if present
      const cleanId = tmdbId.replace('tmdb_', '')
      
      const url = `${this.baseUrl}/stream/movie/${cleanId}.json`
      console.log(`🔍 [DEBRIDIO] Fetching movie streams: ${url}`)

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ [DEBRIDIO] HTTP ${response.status}: ${response.statusText}`)
        return []
      }

      const data = await response.json()
      
      if (!data.streams || !Array.isArray(data.streams)) {
        console.warn(`⚠️ [DEBRIDIO] No streams array in response`)
        return []
      }

      // Filter out "No links found" placeholder streams
      const validStreams = data.streams.filter((stream: DebridioStream) => {
        // Check if this is a "no links found" placeholder
        const isPlaceholder = 
          stream.title?.toLowerCase().includes('no links') ||
          stream.title?.toLowerCase().includes('not found') ||
          stream.infoHash === '#' ||
          !stream.url
        
        if (isPlaceholder) {
          console.log(`⚠️ [DEBRIDIO] Skipping placeholder stream: ${stream.title || stream.name}`)
          return false
        }
        
        return true
      })

      console.log(`✅ [DEBRIDIO] Found ${validStreams.length} valid streams for movie ${cleanId} (${data.streams.length - validStreams.length} placeholders filtered)`)
      
      // Apply compatibility filtering
      return this.applyCompatibilityFiltering(validStreams, isSafari)
    } catch (error) {
      console.error(`❌ [DEBRIDIO] Error fetching movie streams:`, error)
      return []
    }
  }

  /**
   * Get streams for a TV series episode
   * @param tmdbId - TMDB series ID (e.g., "110316" or "tmdb_tv_110316")
   * @param season - Season number (e.g., 1)
   * @param episode - Episode number (e.g., 1)
   * @param isSafari - Optional Safari browser flag for compatibility filtering
   */
  async getSeriesStreams(
    tmdbId: string,
    season: number,
    episode: number,
    isSafari?: boolean
  ): Promise<DebridioStream[]> {
    try {
      // Remove "tmdb_tv_" or "tmdb_" prefix if present
      const cleanId = tmdbId.replace('tmdb_tv_', '').replace('tmdb_', '')
      
      const url = `${this.baseUrl}/stream/series/${cleanId}:${season}:${episode}.json`
      console.log(`🔍 [DEBRIDIO] Fetching series streams: ${url}`)

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ [DEBRIDIO] HTTP ${response.status}: ${response.statusText}`)
        return []
      }

      const data = await response.json()
      
      if (!data.streams || !Array.isArray(data.streams)) {
        console.warn(`⚠️ [DEBRIDIO] No streams array in response`)
        return []
      }

      // Filter out "No links found" placeholder streams
      const validStreams = data.streams.filter((stream: DebridioStream) => {
        // Check if this is a "no links found" placeholder
        const isPlaceholder = 
          stream.title?.toLowerCase().includes('no links') ||
          stream.title?.toLowerCase().includes('not found') ||
          stream.infoHash === '#' ||
          !stream.url
        
        if (isPlaceholder) {
          console.log(`⚠️ [DEBRIDIO] Skipping placeholder stream: ${stream.title || stream.name}`)
          return false
        }
        
        return true
      })

      console.log(`✅ [DEBRIDIO] Found ${validStreams.length} valid streams for series ${cleanId} S${season}E${episode} (${data.streams.length - validStreams.length} placeholders filtered)`)
      
      // Apply compatibility filtering
      return this.applyCompatibilityFiltering(validStreams, isSafari)
    } catch (error) {
      console.error(`❌ [DEBRIDIO] Error fetching series streams:`, error)
      return []
    }
  }

  /**
   * Test the connection to Debridio
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const manifestUrl = this.getManifestUrl()
      console.log(`🔍 [DEBRIDIO] Testing connection: ${manifestUrl}`)

      const response = await fetch(manifestUrl)
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const manifest = await response.json()
      
      if (!manifest.id || !manifest.name) {
        return {
          success: false,
          error: 'Invalid manifest format'
        }
      }

      console.log(`✅ [DEBRIDIO] Connection successful: ${manifest.name}`)
      return { success: true }
    } catch (error) {
      console.error(`❌ [DEBRIDIO] Connection test failed:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Parse quality from stream name/title
   */
  parseStreamQuality(name: string): string {
    const lower = name.toLowerCase()
    
    if (lower.includes('2160p') || lower.includes('4k')) return '4K'
    if (lower.includes('1080p')) return '1080p'
    if (lower.includes('720p')) return '720p'
    if (lower.includes('480p')) return '480p'
    if (lower.includes('360p')) return '360p'
    
    return 'Unknown'
  }

  /**
   * Extract seeders count from stream name/title if available
   */
  parseStreamSeeders(name: string): number | undefined {
    const match = name.match(/👤\s*(\d+)/i) || name.match(/seeders?:\s*(\d+)/i)
    return match ? parseInt(match[1], 10) : undefined
  }

  /**
   * Apply compatibility filtering using the new tier-based system
   * Debridio returns direct URLs, so we need to analyze stream names for format info
   */
  private applyCompatibilityFiltering(streams: DebridioStream[], isSafari?: boolean): DebridioStream[] {
    if (streams.length === 0) return streams
    
    const webSafeMode = this.config?.webSafeMode || false
    
    console.log(`🎯 [DEBRIDIO] Applying compatibility filtering:`, {
      totalStreams: streams.length,
      isSafari,
      webSafeMode
    })
    
    // Use the new compatibility checker
    const filteredStreams = StreamCompatibilityChecker.getBestAvailableStreams(
      streams,
      isSafari,
      webSafeMode
    )
    
    console.log(`🎯 [DEBRIDIO] Filtering complete: ${filteredStreams.length} compatible streams`)
    
    // Log sample of filtered streams for debugging
    if (filteredStreams.length > 0) {
      const sample = filteredStreams.slice(0, 3).map(s => {
        const compat = StreamCompatibilityChecker.analyze(s.name, isSafari)
        return `${s.name.substring(0, 50)}... [${compat.tier}]`
      })
      console.log(`🎯 [DEBRIDIO] Sample streams:`, sample)
    }
    
    return filteredStreams
  }
}
