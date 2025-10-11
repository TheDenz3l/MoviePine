// Torrentio API client for fetching torrent streams
// This service provides access to torrent streams via the Torrentio addon

import { StreamCompatibilityChecker, CompatibilityTier } from '@/lib/utils/stream-compatibility'
import type { AppConfig } from '@/lib/config'

export interface TorrentioStream {
  name: string
  title: string
  infoHash: string
  fileIdx?: number
  url: string
  behaviorHints?: {
    bingeGroup?: string
    filename?: string
  }
  subtitles?: string[] // Available subtitle languages extracted from title
}

export interface MovieMetadata {
  id: string
  title: string
  year?: number
  imdbId?: string
  tmdbId?: number
  poster?: string
  description?: string
}

export class TorrentioAPI {
  private baseUrl: string
  private providers: string[]
  private debridService?: string
  private config?: AppConfig
  // Static/shared manifest cache & in-flight promise to dedupe concurrent requests
  private static manifestCache: { data: any; timestamp: number } | null = null
  private static manifestPromise: Promise<any> | null = null
  private static readonly MANIFEST_TTL_MS = 10 * 60 * 1000 // 10 minutes

  constructor(options: {
    providers?: string[]
    debridService?: string
    apiKey?: string
    config?: AppConfig
  } = {}) {
    // Simplified configuration for better compatibility
    this.providers = options.providers || [
      'rarbg',           // High quality, reliable
      '1337x',           // Large selection, good quality
      'thepiratebay',    // Broad coverage
      'kickass',         // Good for movies
      'torrentgalaxy',   // Quality releases
      'magnetdl',        // Additional coverage
      'eztv',            // Good for TV shows
      'ettv',            // TV show alternative
      'yts',             // Movie-focused, smaller files
    ]
    this.debridService = options.debridService || 'realdebrid'

    // Simplified configuration for better compatibility
    let configString = `providers=${this.providers.join('|')}`
    
    // Add sorting preference
    configString += `|sort=qualitysize`
    
    // Add debrid service if available
    if (this.debridService && options.apiKey) {
      configString += `|${this.debridService}=${options.apiKey}`
    }

    // Use the correct Torrentio domain and URL format
    this.baseUrl = `https://torrentio.strem.fun/${configString}`
    
    // Store config for stream filtering
    this.config = options.config
    
    console.log(`🔧 Torrentio configuration: ${this.baseUrl}`)
    if (this.config?.webSafeMode) {
      console.log(`🎯 Web-safe mode enabled: will filter for browser-compatible streams only`)
    }
  }

  async getMovieStreams(imdbId: string, isSafari?: boolean): Promise<TorrentioStream[]> {
    try {
      const torrentioUrl = `${this.baseUrl}/stream/movie/${imdbId}.json`
      const proxyUrl = `/api/torrentio?endpoint=${encodeURIComponent(torrentioUrl)}${isSafari ? '&isSafari=true' : ''}`
      
      console.log(`🔗 Torrentio API call via proxy: ${torrentioUrl}`)
      if (isSafari) {
        console.log(`🍎 Safari filtering requested for movie streams`)
      }

  const { rateLimitedFetch } = await import('@/lib/utils/rateLimitedFetch')
  const response = await rateLimitedFetch(proxyUrl, {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      console.log(`📡 Torrentio proxy response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`❌ Torrentio: No streams found for ${imdbId} (404)`)
          return [] // No streams found
        }
        if (response.status === 502 || response.status === 503) {
          console.warn(`⚠️ Torrentio: Service unavailable for ${imdbId} (${response.status})`)
          return []
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error(`❌ Torrentio API error: ${response.status} ${response.statusText}`, errorData)
        return [] // Return empty array instead of throwing
      }

      const data = await response.json()
      console.log(`📊 Torrentio response for ${imdbId}:`, {
        streamsCount: data.streams?.length || 0,
        hasStreams: !!data.streams
      })

      const rawStreams = data.streams || []

      // Process streams to extract info hash properly
      const streams: TorrentioStream[] = rawStreams.map((stream: any) => {
        let infoHash = ''

        // Extract info hash from different possible locations
        if (stream.infoHash) {
          infoHash = stream.infoHash
        } else if (stream.url) {
          // Extract from Torrentio resolve URL
          const torrentioMatch = stream.url.match(/\/resolve\/[^\/]+\/([A-Z0-9]+)/i)
          if (torrentioMatch) {
            const extractedHash = torrentioMatch[1]
            if (extractedHash.length >= 32) {
              infoHash = extractedHash.toLowerCase()
            }
          }

          // Also try to extract from magnet URL if present
          const magnetMatch = stream.url.match(/btih:([a-fA-F0-9]{40})/i)
          if (magnetMatch && !infoHash) {
            infoHash = magnetMatch[1].toLowerCase()
          }
        }

        const streamTitle = stream.title || stream.name || 'Unknown'

        return {
          name: stream.name || stream.title || 'Unknown',
          title: streamTitle,
          infoHash,
          fileIdx: stream.fileIdx,
          url: stream.url,
          behaviorHints: stream.behaviorHints,
          subtitles: this.parseSubtitlesFromTitle(streamTitle)
        }
      }).filter((stream: TorrentioStream) =>
        stream.infoHash &&
        stream.infoHash.length >= 32
      )

      console.log(`✅ Torrentio: Found ${streams.length} valid streams for ${imdbId}`)
      
      // Apply compatibility filtering
      return this.applyCompatibilityFiltering(streams, isSafari)
    } catch (error) {
      console.error(`Error fetching streams for movie ${imdbId}:`, error)
      return []
    }
  }

  async getSeriesStreams(imdbId: string, season: number, episode: number, isSafari?: boolean): Promise<TorrentioStream[]> {
    try {
      const torrentioUrl = `${this.baseUrl}/stream/series/${imdbId}:${season}:${episode}.json`
      const proxyUrl = `/api/torrentio?endpoint=${encodeURIComponent(torrentioUrl)}${isSafari ? '&isSafari=true' : ''}`
      
      if (isSafari) {
        console.log(`🍎 Safari filtering requested for series streams`)
      }
      
  const { rateLimitedFetch } = await import('@/lib/utils/rateLimitedFetch')
  const response = await rateLimitedFetch(proxyUrl, {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return [] // No streams found
        }
        console.error(`Torrentio API error: ${response.status} ${response.statusText}`)
        return []
      }
      
      const data = await response.json()
      const rawStreams = data.streams || []
      
      // Process streams to extract info hash properly (same as movies)
      const streams: TorrentioStream[] = rawStreams.map((stream: any) => {
        let infoHash = ''
        
        // Extract info hash from different possible locations
        if (stream.infoHash) {
          infoHash = stream.infoHash
        } else if (stream.url) {
          // Extract from Torrentio resolve URL
          const torrentioMatch = stream.url.match(/\/resolve\/[^\/]+\/([A-Z0-9]+)/i)
          if (torrentioMatch) {
            const extractedHash = torrentioMatch[1]
            if (extractedHash.length >= 32) {
              infoHash = extractedHash.toLowerCase()
            }
          }

          // Also try to extract from magnet URL if present
          const magnetMatch = stream.url.match(/btih:([a-fA-F0-9]{40})/i)
          if (magnetMatch && !infoHash) {
            infoHash = magnetMatch[1].toLowerCase()
          }
        }

        const streamTitle = stream.title || stream.name || 'Unknown'

        return {
          name: stream.name || stream.title || 'Unknown',
          title: streamTitle,
          infoHash,
          fileIdx: stream.fileIdx,
          url: stream.url,
          behaviorHints: stream.behaviorHints,
          subtitles: this.parseSubtitlesFromTitle(streamTitle)
        }
      }).filter((stream: TorrentioStream) =>
        stream.infoHash &&
        stream.infoHash.length >= 32
      )

      console.log(`✅ Torrentio: Found ${streams.length} valid streams for ${imdbId} S${season}E${episode}`)
      
      // Apply compatibility filtering
      return this.applyCompatibilityFiltering(streams, isSafari)
    } catch (error) {
      console.error(`Error fetching streams for series ${imdbId} S${season}E${episode}:`, error)
      return []
    }
  }

  // Helper method to extract info hash from URL
  private extractInfoHash(url: string): string {
    if (!url) return ''
    
    // Try to extract from magnet URL
    const magnetMatch = url.match(/btih:([a-fA-F0-9]{40})/i)
    if (magnetMatch) {
      return magnetMatch[1].toLowerCase()
    }
    
    // Try to extract from Torrentio resolve URL
    const torrentioMatch = url.match(/\/resolve\/[^\/]+\/([A-Z0-9]+)/i)
    if (torrentioMatch) {
      const extractedHash = torrentioMatch[1]
      if (extractedHash.length >= 32) {
        return extractedHash.toLowerCase()
      }
    }
    
    return ''
  }

  // Get manifest for service validation
  async getManifest(): Promise<any> {
    // Serve fresh (non-expired) cache immediately
    const now = Date.now()
    if (TorrentioAPI.manifestCache && (now - TorrentioAPI.manifestCache.timestamp) < TorrentioAPI.MANIFEST_TTL_MS) {
      return TorrentioAPI.manifestCache.data
    }

    // If a request is already in flight, await it (prevents stampede)
    if (TorrentioAPI.manifestPromise) {
      try {
        const data = await TorrentioAPI.manifestPromise
        return data
      } catch (e) {
        // Fall through to a new attempt below only if no valid cache
        if (TorrentioAPI.manifestCache) {
          console.warn('⚠️ Using stale Torrentio manifest due to concurrent fetch failure')
          return TorrentioAPI.manifestCache.data
        }
      }
    }

    const manifestUrl = `${this.baseUrl}/manifest.json`
    const proxyUrl = `/api/torrentio?endpoint=${encodeURIComponent(manifestUrl)}`

    const fetchWithRetry = async () => {
      const maxAttempts = 3
      let attempt = 0
      let lastError: any = null
      while (attempt < maxAttempts) {
        attempt++
        try {
          const response = await fetch(proxyUrl, {
            headers: { 'Accept': 'application/json' },
          })

            // Handle rate limiting or transient errors with retry
          if (!response.ok) {
            if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
              const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10)
              const backoffBase = Math.pow(2, attempt - 1) * 500
              const delayMs = (retryAfter * 1000) || backoffBase + Math.floor(Math.random() * 400)
              console.warn(`⚠️ Manifest fetch attempt ${attempt} failed with ${response.status}. Retrying in ${delayMs}ms...`)
              await new Promise(res => setTimeout(res, delayMs))
              continue
            }
            // Non-retryable error
            throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          // Update cache
          TorrentioAPI.manifestCache = { data, timestamp: Date.now() }
          return data
        } catch (err) {
          lastError = err
          if (attempt >= maxAttempts) {
            break
          }
          // Exponential backoff for network-level failures
          const delayMs = Math.pow(2, attempt - 1) * 500 + Math.floor(Math.random() * 300)
          console.warn(`⚠️ Manifest fetch network error on attempt ${attempt}. Retrying in ${delayMs}ms...`, err)
          await new Promise(res => setTimeout(res, delayMs))
        }
      }
      throw lastError || new Error('Failed to fetch manifest after retries')
    }

    TorrentioAPI.manifestPromise = fetchWithRetry()
    try {
      const data = await TorrentioAPI.manifestPromise
      return data
    } catch (error) {
      console.error('❌ Error fetching Torrentio manifest after retries:', error)
      // Serve stale cache if present
      if (TorrentioAPI.manifestCache) {
        console.warn('⚠️ Returning stale Torrentio manifest due to fetch failure')
        return TorrentioAPI.manifestCache.data
      }
      // Propagate if nothing to fall back to
      throw error
    } finally {
      // Clear the in-flight promise reference (cache stays)
      TorrentioAPI.manifestPromise = null
    }
  }

  // Parse stream quality information from title
  parseStreamQuality(title: string): { quality: string; size: string; seeders: number; format?: string } {
    if (!title) {
      return { quality: 'Unknown', size: 'Unknown', seeders: 0, format: 'Unknown' }
    }

    // Extract format information first (highest priority)
    let format = 'Unknown'
    const titleLower = title.toLowerCase()
    
    // Enhanced format detection patterns - MP4 and WebM get priority for browsers
    // Check in order of browser compatibility
    
    // MP4 - Best browser support (check first with multiple patterns)
    if (titleLower.includes('.mp4') || titleLower.match(/\bmp4\b/) ||
        titleLower.includes('h264.mp4') || titleLower.includes('x264.mp4') ||
        titleLower.includes('hevc.mp4') || titleLower.includes('x265.mp4') ||
        titleLower.match(/\.mp4\b/)) {
      format = 'MP4'
      console.log(`🎯 [FORMAT DETECT] MP4 detected: ${title.substring(0, 60)}...`)
    }
    // WebM - Good browser support (except Safari)
    else if (titleLower.includes('.webm') || titleLower.match(/\bwebm\b/)) {
      format = 'WebM'
      console.log(`🎯 [FORMAT DETECT] WebM detected: ${title.substring(0, 60)}...`)
    }
    // MKV - NOT browser compatible (mark for filtering)
    else if (titleLower.includes('.mkv') || titleLower.match(/\bmkv\b/) ||
             titleLower.includes('matroska')) {
      format = 'MKV'
      console.log(`🚫 [FORMAT DETECT] MKV detected (will be filtered): ${title.substring(0, 60)}...`)
    }
    // AVI - NOT browser compatible
    else if (titleLower.includes('.avi') || titleLower.match(/\bavi\b/)) {
      format = 'AVI'
      console.log(`🚫 [FORMAT DETECT] AVI detected (will be filtered): ${title.substring(0, 60)}...`)
    }
    // MOV - Limited browser support
    else if (titleLower.includes('.mov') || titleLower.match(/\bmov\b/)) {
      format = 'MOV'
      console.log(`⚠️ [FORMAT DETECT] MOV detected (limited support): ${title.substring(0, 60)}...`)
    }

    // Extract quality information
    let quality = 'Unknown'

    // Quality patterns (ordered by preference)
    const qualityPatterns = [
      { pattern: /2160p|4k|uhd/i, quality: '4K' },
      { pattern: /1080p/i, quality: '1080p' },
      { pattern: /720p/i, quality: '720p' },
      { pattern: /480p/i, quality: '480p' },
      { pattern: /360p/i, quality: '360p' },
      { pattern: /webrip/i, quality: 'WEBRip' },
      { pattern: /webdl|web-dl/i, quality: 'WEB-DL' },
      { pattern: /bluray|brrip/i, quality: 'BluRay' },
      { pattern: /dvdrip/i, quality: 'DVDRip' },
      { pattern: /hdtv/i, quality: 'HDTV' },
      { pattern: /cam/i, quality: 'CAM' },
      { pattern: /scr|screener/i, quality: 'Screener' },
      { pattern: /ts|telesync/i, quality: 'TS' }
    ]

    for (const { pattern, quality: q } of qualityPatterns) {
      if (pattern.test(title)) {
        quality = q
        break
      }
    }

    // Extract file size
    let size = 'Unknown'
    const sizeMatch = title.match(/(\d+(?:\.\d+)?)\s*(gb|mb|tb)/i)
    if (sizeMatch) {
      size = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`
    }

    // Extract seeders (if available in title)
    let seeders = 0
    const seedersMatch = title.match(/(\d+)\s*seeders?/i)
    if (seedersMatch) {
      seeders = parseInt(seedersMatch[1], 10)
    }

    // Also try to extract seeders from 👤 emoji pattern commonly used in torrent names
    const emojiSeedersMatch = title.match(/👤\s*(\d+)/)
    if (emojiSeedersMatch) {
      seeders = Math.max(seeders, parseInt(emojiSeedersMatch[1], 10))
    }

    console.log(`🔍 [STREAM PARSE] Format: ${format} | Quality: ${quality} | Seeders: ${seeders} | ${title.substring(0, 50)}...`)
    
    return { quality, size, seeders, format }
  }

  // Parse subtitle languages from stream title
  parseSubtitlesFromTitle(title: string): string[] {
    if (!title) {
      console.log('📝 parseSubtitlesFromTitle: Empty title provided')
      return []
    }

    console.log(`📝 parseSubtitlesFromTitle: Analyzing title: "${title}"`)

    const subtitles: string[] = []

    // Enhanced subtitle language patterns in torrent titles
    const subtitlePatterns = [
      { pattern: /\b(eng|english)\b/i, language: 'en' },
      { pattern: /\b(spa|spanish|español)\b/i, language: 'es' },
      { pattern: /\b(fre|french|français)\b/i, language: 'fr' },
      { pattern: /\b(ger|german|deutsch)\b/i, language: 'de' },
      { pattern: /\b(ita|italian|italiano)\b/i, language: 'it' },
      { pattern: /\b(por|portuguese|português)\b/i, language: 'pt' },
      { pattern: /\b(rus|russian|русский)\b/i, language: 'ru' },
      { pattern: /\b(jap|japanese|日本語)\b/i, language: 'ja' },
      { pattern: /\b(kor|korean|한국어)\b/i, language: 'ko' },
      { pattern: /\b(chi|chinese|中文)\b/i, language: 'zh' },
      { pattern: /\b(dut|dutch|nederlands)\b/i, language: 'nl' },
      { pattern: /\b(swe|swedish|svenska)\b/i, language: 'sv' },
      { pattern: /\b(nor|norwegian|norsk)\b/i, language: 'no' },
      { pattern: /\b(dan|danish|dansk)\b/i, language: 'da' },
      { pattern: /\b(fin|finnish|suomi)\b/i, language: 'fi' },
      { pattern: /\b(pol|polish|polski)\b/i, language: 'pl' },
      { pattern: /\b(cze|czech|čeština)\b/i, language: 'cs' },
      { pattern: /\b(hun|hungarian|magyar)\b/i, language: 'hu' },
      { pattern: /\b(tur|turkish|türkçe)\b/i, language: 'tr' },
      { pattern: /\b(ara|arabic|العربية)\b/i, language: 'ar' },
      { pattern: /\b(heb|hebrew|עברית)\b/i, language: 'he' },
      { pattern: /\b(hin|hindi|हिन्दी)\b/i, language: 'hi' },
      { pattern: /\b(tha|thai|ไทย)\b/i, language: 'th' },
      { pattern: /\b(vie|vietnamese|tiếng việt)\b/i, language: 'vi' },
    ]

    // Enhanced subtitle indicators - including ESub, HSub, etc.
    const subtitleIndicators = [
      /\b(sub|subs|subtitle|subtitles)\b/i,
      /\b(esub|hsub|vsub)\b/i,  // External/Hard/Soft subtitles
      /\b(cc|closed.caption)\b/i,
      /\b(sub\.?\w{2,3})\b/i,  // sub.eng, sub.spa, etc.
      /\b(\w{2,3}\.?sub)\b/i,  // eng.sub, spa.sub, etc.
    ]

    // Check for subtitle indicators
    const hasSubtitles = subtitleIndicators.some(pattern => pattern.test(title))
    console.log(`📝 parseSubtitlesFromTitle: Subtitle indicators found: ${hasSubtitles}`)

    if (hasSubtitles) {
      // Check for specific language mentions
      for (const { pattern, language } of subtitlePatterns) {
        if (pattern.test(title)) {
          subtitles.push(language)
          console.log(`📝 parseSubtitlesFromTitle: Found language: ${language} (${pattern})`)
        }
      }

      // If no specific languages found but subtitles are mentioned, assume English
      if (subtitles.length === 0) {
        subtitles.push('en')
        console.log('📝 parseSubtitlesFromTitle: No specific languages found, assuming English')
      }
    }

    // Look for multi-language indicators
    const multiLangPatterns = [
      /\b(multi|multilingual|multi.sub|multi.lang)\b/i,
      /\b(dual.audio)\b/i,
      /\b(\d+\s*lang)\b/i,  // 5 lang, 3lang, etc.
    ]

    const hasMultiLang = multiLangPatterns.some(pattern => pattern.test(title))
    if (hasMultiLang) {
      console.log('📝 parseSubtitlesFromTitle: Multi-language indicators found')
      // Common multi-language releases usually include these
      subtitles.push('en', 'es', 'fr', 'de', 'it', 'pt')
    }

    // Special handling for common patterns
    if (/\besub\b/i.test(title)) {
      console.log('📝 parseSubtitlesFromTitle: ESub detected - adding multiple languages')
      subtitles.push('en', 'es', 'fr', 'de', 'it')
    }

    // Remove duplicates and return
    const uniqueSubtitles = [...new Set(subtitles)]
    console.log(`📝 parseSubtitlesFromTitle: Final result: [${uniqueSubtitles.join(', ')}]`)
    return uniqueSubtitles
  }

  /**
   * Apply compatibility filtering using the new tier-based system
   * Following Stremio's approach: prioritize browser-compatible formats
   * CRITICAL: Aggressively filters MKV files
   */
  private applyCompatibilityFiltering(streams: TorrentioStream[], isSafari?: boolean): TorrentioStream[] {
    if (streams.length === 0) return streams
    
    const webSafeMode = this.config?.webSafeMode || false
    
    console.log(`\n🎯 [TORRENTIO FILTER] Starting compatibility filtering:`)
    console.log(`  📊 Input: ${streams.length} streams`)
    console.log(`  🍎 Safari mode: ${isSafari ? 'YES' : 'NO'}`)
    console.log(`  🔒 Web-safe mode: ${webSafeMode ? 'YES' : 'NO'}`)
    
    // Log format distribution BEFORE filtering
    const formatsBefore = streams.reduce((acc, s) => {
      const quality = this.parseStreamQuality(s.title)
      const fmt = quality.format || 'Unknown'
      acc[fmt] = (acc[fmt] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(`  📊 Format distribution BEFORE:`, formatsBefore)
    
    // Use the new compatibility checker
    const filteredStreams = StreamCompatibilityChecker.getBestAvailableStreams(
      streams,
      isSafari,
      webSafeMode
    )
    
    // Log format distribution AFTER filtering
    const formatsAfter = filteredStreams.reduce((acc, s) => {
      const quality = this.parseStreamQuality(s.title)
      const fmt = quality.format || 'Unknown'
      acc[fmt] = (acc[fmt] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mkvFiltered = (formatsBefore['MKV'] || 0)
    const aviFiltered = (formatsBefore['AVI'] || 0)
    const totalFiltered = streams.length - filteredStreams.length
    
    console.log(`\n✅ [TORRENTIO FILTER] Filtering complete:`)
    console.log(`  📤 Output: ${filteredStreams.length} streams`)
    console.log(`  🚫 Filtered out: ${totalFiltered} streams`)
    console.log(`  🚫 MKV blocked: ${mkvFiltered}`)
    console.log(`  🚫 AVI blocked: ${aviFiltered}`)
    console.log(`  📊 Format distribution AFTER:`, formatsAfter)
    
    // Log sample of filtered streams for debugging
    if (filteredStreams.length > 0) {
      console.log(`\n🎯 [TORRENTIO FILTER] Top 5 compatible streams:`)
      filteredStreams.slice(0, 5).forEach((s, i) => {
        const compat = StreamCompatibilityChecker.analyze(s.name, isSafari)
        const quality = this.parseStreamQuality(s.title)
        console.log(`  ${i+1}. [${quality.format}] [${compat.tier}] ${s.name.substring(0, 60)}...`)
      })
    } else {
      console.warn(`⚠️ [TORRENTIO FILTER] WARNING: No compatible streams found!`)
    }
    
    return filteredStreams
  }
}

// Default instance with config
import { getConfigOrDefault } from '@/lib/config'
const appConfig = getConfigOrDefault()
export const torrentioAPI = new TorrentioAPI({ config: appConfig })
