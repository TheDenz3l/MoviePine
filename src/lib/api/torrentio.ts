// Torrentio API client for fetching torrent streams
// This service provides access to torrent streams via the Torrentio addon

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
  // Static/shared manifest cache & in-flight promise to dedupe concurrent requests
  private static manifestCache: { data: any; timestamp: number } | null = null
  private static manifestPromise: Promise<any> | null = null
  private static readonly MANIFEST_TTL_MS = 10 * 60 * 1000 // 10 minutes

  constructor(options: {
    providers?: string[]
    debridService?: string
    apiKey?: string
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
    
    console.log(`🔧 Torrentio configuration: ${this.baseUrl}`)
  }

  async getMovieStreams(imdbId: string, isSafari?: boolean): Promise<TorrentioStream[]> {
    try {
      const torrentioUrl = `${this.baseUrl}/stream/movie/${imdbId}.json`
      const proxyUrl = `/api/torrentio?endpoint=${encodeURIComponent(torrentioUrl)}${isSafari ? '&isSafari=true' : ''}`
      
      console.log(`🔗 Torrentio API call via proxy: ${torrentioUrl}`)
      if (isSafari) {
        console.log(`🍎 Safari filtering requested for movie streams`)
      }

      const response = await fetch(proxyUrl, {
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
      
      // 🍎 CRITICAL SAFARI FILTERING - Safari filtering now happens in API route if isSafari=true
      // This is a fallback for direct API usage without the proxy route
      if (isSafari) {
        console.log(`🍎 Applying client-side Safari filtering as fallback`)
        const filteredStreams = this.applySafariFiltering(streams, isSafari)
        console.log(`🍎 Safari filtering complete: ${filteredStreams.length} compatible streams remaining`)
        return filteredStreams
      }
      
      return streams
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
      
      const response = await fetch(proxyUrl, {
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
      
      // 🍎 CRITICAL SAFARI FILTERING - Safari filtering now happens in API route if isSafari=true
      // This is a fallback for direct API usage without the proxy route
      if (isSafari) {
        console.log(`🍎 Applying client-side Safari filtering as fallback for series`)
        const filteredStreams = this.applySafariFiltering(streams, isSafari)
        console.log(`🍎 Safari filtering complete: ${filteredStreams.length} compatible streams remaining`)
        return filteredStreams
      }
      
      return streams
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
    
    // Format detection patterns (MP4 gets priority)
    if (titleLower.includes('.mp4') || titleLower.includes('mp4') || 
        titleLower.includes('h264.mp4') || titleLower.includes('x264.mp4') ||
        titleLower.includes('hevc.mp4') || titleLower.includes('x265.mp4')) {
      format = 'MP4'
    } else if (titleLower.includes('.webm') || titleLower.includes('webm')) {
      format = 'WebM'
    } else if (titleLower.includes('.mkv') || titleLower.includes('mkv')) {
      format = 'MKV'
    } else if (titleLower.includes('.avi') || titleLower.includes('avi')) {
      format = 'AVI'
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

  // 🍎 SAFARI COMPATIBILITY FILTERING
  // This method filters streams to ensure Safari compatibility
  applySafariFiltering(streams: TorrentioStream[], isSafari?: boolean): TorrentioStream[] {
    // Use passed parameter or fallback to client-side detection
    const shouldFilterForSafari = isSafari !== undefined 
      ? isSafari 
      : (typeof window !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent))
    
    if (!shouldFilterForSafari) {
      console.log(`🍎 Not Safari browser, returning all ${streams.length} streams`)
      return streams
    }

    console.log(`🍎 Safari detected! Applying strict compatibility filtering to ${streams.length} streams...`)
    
    const decisions: { kept: number; dropped: number; reasons: Record<string, number> } = { 
      kept: 0, dropped: 0, reasons: {} 
    }
    
    // Ultra-strict Safari compatibility filtering
    const safariCompatibleStreams = streams.filter(stream => {
      const name = stream.name.toLowerCase()
      
      console.log(`🍎 [ANALYZING] ${stream.name.substring(0, 80)}...`)
      
      // PHASE 1: Absolute rejections (will never work in Safari)
      const isMkv = /\.mkv\b|\bmkv\b/.test(name)
      const isAvi = /\.avi\b|\bavi\b/.test(name)
      const isWebm = /\.webm\b|\bwebm\b/.test(name)
      const hasUnsupportedCodec = /(av1|vp9|vvc)/.test(name)
      const hasUnsupportedAudio = /(dts|dts-hd|dts-ma|truehd|flac)/.test(name)
      const isRemux = /remux/i.test(name)
      const has10bit = /10bit|10-bit/i.test(name)
      const hasHDR = /hdr|dolby.vision|dv/i.test(name)
      
      if (isMkv) { 
        console.log(`🍎 [REJECT] MKV container: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['mkv-container']=(decisions.reasons['mkv-container']||0)+1
        return false 
      }
      if (isAvi) { 
        console.log(`🍎 [REJECT] AVI container: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['avi-container']=(decisions.reasons['avi-container']||0)+1
        return false 
      }
      if (isWebm) { 
        console.log(`🍎 [REJECT] WebM container: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['webm-container']=(decisions.reasons['webm-container']||0)+1
        return false 
      }
      if (hasUnsupportedCodec) { 
        console.log(`🍎 [REJECT] Unsupported codec: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['unsupported-codec']=(decisions.reasons['unsupported-codec']||0)+1
        return false 
      }
      if (hasUnsupportedAudio) { 
        console.log(`🍎 [REJECT] Unsupported audio: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['unsupported-audio']=(decisions.reasons['unsupported-audio']||0)+1
        return false 
      }
      if (isRemux) { 
        console.log(`🍎 [REJECT] Remux: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['remux']=(decisions.reasons['remux']||0)+1
        return false 
      }
      if (has10bit) { 
        console.log(`🍎 [REJECT] 10-bit: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['10bit']=(decisions.reasons['10bit']||0)+1
        return false 
      }
      if (hasHDR) { 
        console.log(`🍎 [REJECT] HDR: ${stream.name.substring(0, 60)}...`)
        decisions.dropped++; decisions.reasons['hdr']=(decisions.reasons['hdr']||0)+1
        return false 
      }
      
      // PHASE 2: Positive requirements (must have these to work in Safari)
      const hasMp4 = /\.mp4\b/.test(name)
      const hasH264 = /(x264|h\.?264|avc)/i.test(name)
      const hasCompatibleAudio = /(aac|mp3)/i.test(name) || !/(dts|ac3|eac3|opus)/.test(name) // Allow if no audio specified
      
      // Ultra-safe: Must be MP4 + H.264 + compatible audio
      if (hasMp4 && hasH264 && hasCompatibleAudio) {
        console.log(`🍎 [ACCEPT ULTRA-SAFE] ${stream.name.substring(0, 60)}...`)
        decisions.kept++
        decisions.reasons['ultra-safe']=(decisions.reasons['ultra-safe']||0)+1
        return true
      }
      
      console.log(`🍎 [REJECT] Not ultra-safe: ${stream.name.substring(0, 60)}...`)
      decisions.dropped++
      decisions.reasons['not-ultra-safe']=(decisions.reasons['not-ultra-safe']||0)+1
      return false
    })
    
    console.log(`🍎 Safari ultra-safe filter: kept=${decisions.kept} dropped=${decisions.dropped}`)
    console.log(`🍎 Rejection reasons:`, decisions.reasons)
    
    // If ultra-safe filtering gives us results, use them
    if (safariCompatibleStreams.length > 0) {
      console.log(`🍎 Safari ultra-safe streams found: ${safariCompatibleStreams.length}`)
      return safariCompatibleStreams
    }
    
    // FALLBACK: More lenient Safari filtering if ultra-safe found nothing
    console.log(`🍎 No ultra-safe streams found, trying lenient Safari filter...`)
    const lenientStreams = streams.filter(stream => {
      const name = stream.name.toLowerCase()
      
      // Still reject absolute incompatibles
      if (/\.mkv\b|\bmkv\b/.test(name)) return false
      if (/(av1|vp9|vvc)/.test(name)) return false
      if (/(dts|dts-hd|dts-ma|truehd)/.test(name)) return false
      
      // Accept MP4 with any codec (risky but might work)
      const hasMp4 = /\.mp4\b/.test(name)
      if (hasMp4) return true
      
      // Accept H.264 even without explicit MP4 (might be in MP4 container)
      const hasH264 = /(x264|h\.?264|avc)/i.test(name)
      if (hasH264) return true
      
      return false
    })
    
    if (lenientStreams.length > 0) {
      console.log(`🍎 Safari lenient filter found: ${lenientStreams.length} streams`)
      return lenientStreams
    }
    
    // LAST RESORT: Return original list with warning
    console.log(`🍎 ⚠️ No Safari-compatible streams found! Returning original ${streams.length} streams with warning`)
    return streams
  }
}

// Default instance
export const torrentioAPI = new TorrentioAPI()
