// Torrentio Stremio Plugin API Integration
// Based on Stremio addon protocol: https://github.com/Stremio/stremio-addon-sdk

export interface TorrentioStream {
  name: string
  title: string
  infoHash: string
  fileIdx?: number
  url?: string
  behaviorHints?: {
    bingeGroup?: string
    countryWhitelist?: string[]
    notWebReady?: boolean
  }
}

export interface TorrentioManifest {
  id: string
  version: string
  name: string
  description: string
  resources: string[]
  types: string[]
  catalogs: Array<{
    type: string
    id: string
    name: string
  }>
}

export interface MovieMetadata {
  id: string
  type: 'movie' | 'series'
  name: string
  poster?: string
  background?: string
  logo?: string
  description?: string
  releaseInfo?: string
  director?: string[]
  cast?: string[]
  imdbRating?: number
  genre?: string[]
  runtime?: string
  year?: number
  country?: string
  language?: string
  awards?: string
  website?: string
  behaviorHints?: {
    defaultVideoId?: string
    hasScheduledVideos?: boolean
  }
}

export class TorrentioAPI {
  private baseUrl: string
  private providers: string[]
  private debridService?: string

  constructor(options: {
    providers?: string[]
    debridService?: string
    apiKey?: string
  } = {}) {
    // Default Torrentio configuration - use ALL available providers for maximum coverage
    this.providers = options.providers || ['rarbg', '1337x', 'thepiratebay', 'kickass', 'torrentgalaxy', 'magnetdl', 'horriblesubs', 'nyaasi', 'tokyotosho', 'anidex']
    this.debridService = options.debridService || 'realdebrid'

    // Build Torrentio URL with configuration
    // Torrentio uses the correct domain: torrentio.strem.fun
    const providersParam = this.providers.join('|')
    // Get ALL streams with minimal filtering for maximum discovery
    // Only exclude the worst quality sources but allow everything else
    let configString = `providers=${providersParam}|sort=qualitysize`

    if (this.debridService && options.apiKey) {
      configString += `|${this.debridService}=${options.apiKey}`
    }

    // Use the correct Torrentio domain and URL format
    this.baseUrl = `https://torrentio.strem.fun/${configString}`
  }

  async getManifest(): Promise<TorrentioManifest> {
    try {
      const response = await fetch(`${this.baseUrl}/manifest.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching Torrentio manifest:', error)
      throw error
    }
  }

  async getMovieStreams(imdbId: string): Promise<TorrentioStream[]> {
    try {
      const fullUrl = `${this.baseUrl}/stream/movie/${imdbId}.json`
      console.log(`🔗 Torrentio API call: ${fullUrl}`)
      console.log(`🔧 Torrentio base URL: ${this.baseUrl}`)

      const response = await fetch(fullUrl)
      console.log(`📡 Torrentio response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`❌ Torrentio: No streams found for ${imdbId} (404)`)
          return [] // No streams found
        }
        const errorText = await response.text()
        console.error(`❌ Torrentio API error: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`Failed to fetch streams: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`📊 Torrentio raw response:`, JSON.stringify(data, null, 2))

      const rawStreams = data.streams || []

      // Debug: Log first few streams to check data format
      if (rawStreams.length > 0) {
        console.log(`🎬 Torrentio found ${rawStreams.length} streams for ${imdbId}`)
        console.log(`📊 Sample raw stream data:`, JSON.stringify(rawStreams.slice(0, 2), null, 2))
      } else {
        console.log(`❌ Torrentio: No streams in response for ${imdbId}`)
      }

      // Process streams to extract info hash properly
      const streams: TorrentioStream[] = rawStreams.map((stream: any) => {
        let infoHash = ''

        // Extract info hash from different possible locations
        if (stream.infoHash) {
          infoHash = stream.infoHash
        } else if (stream.url) {
          // Extract from Torrentio resolve URL (e.g., /resolve/realdebrid/LNWEQRH45NCRI52OTWOGJ24NFQDYTQ...)
          const torrentioMatch = stream.url.match(/\/resolve\/[^\/]+\/([A-Z0-9]+)/i)
          if (torrentioMatch) {
            // Use the extracted identifier as the info hash
            const extractedHash = torrentioMatch[1]
            console.log(`🔍 Extracted hash from URL: ${extractedHash}`)

            if (extractedHash.length >= 32) {
              // Use the extracted hash as identifier (could be base32 or hex)
              infoHash = extractedHash.toLowerCase()
            }
          }

          // Also try to extract from magnet URL if present
          const magnetMatch = stream.url.match(/btih:([a-fA-F0-9]{40})/i)
          if (magnetMatch && !infoHash) {
            infoHash = magnetMatch[1].toLowerCase()
          }
        }

        // Also check if the stream name/title contains the hash
        if (!infoHash && stream.name) {
          const hashMatch = stream.name.match(/([a-fA-F0-9]{40})/i)
          if (hashMatch) {
            infoHash = hashMatch[1].toLowerCase()
          }
        }

        console.log(`🔍 Processing stream: ${stream.title || stream.name}`)
        console.log(`📊 Extracted info hash: ${infoHash}`)
        console.log(`🔗 Original URL: ${stream.url}`)

        return {
          name: stream.name || stream.title || 'Unknown',
          title: stream.title || stream.name || 'Unknown',
          infoHash,
          fileIdx: stream.fileIdx,
          url: stream.url,
          behaviorHints: stream.behaviorHints
        }
      })

      // Filter streams that have valid info hashes (any length >= 32)
      return streams.filter(stream =>
        stream.infoHash &&
        stream.infoHash.length >= 32
      )
    } catch (error) {
      console.error(`Error fetching streams for movie ${imdbId}:`, error)
      return []
    }
  }

  async getSeriesStreams(imdbId: string, season: number, episode: number): Promise<TorrentioStream[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stream/series/${imdbId}:${season}:${episode}.json`)
      if (!response.ok) {
        if (response.status === 404) {
          return [] // No streams found
        }
        throw new Error(`Failed to fetch streams: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.streams || []
    } catch (error) {
      console.error(`Error fetching streams for series ${imdbId} S${season}E${episode}:`, error)
      return []
    }
  }

  async searchContent(query: string, type: 'movie' | 'series' = 'movie'): Promise<MovieMetadata[]> {
    // Note: Torrentio doesn't provide search functionality directly
    // This would typically be handled by TMDB or IMDB API for metadata
    // and then streams would be fetched using the IMDB ID
    console.warn('Direct search not supported by Torrentio. Use TMDB API for search and then fetch streams.')
    return []
  }

  // Helper method to parse stream quality from title
  parseStreamQuality(streamTitle: string): {
    quality: string
    size: string
    seeders?: number
    isHighQuality: boolean
  } {
    const qualityMatch = streamTitle.match(/(\d{3,4}p|720p|1080p|4K|2160p)/i)
    const sizeMatch = streamTitle.match(/💾\s*([\d.]+\s*[KMGT]B)/i)
    const seedersMatch = streamTitle.match(/👤\s*(\d+)/i)

    const quality = qualityMatch ? qualityMatch[1] : 'Unknown'

    // Check if this is high quality (2160p, 4K, 1080p)
    const isHighQuality = /^(2160p|4K|1080p)$/i.test(quality)

    return {
      quality,
      size: sizeMatch ? sizeMatch[1] : 'Unknown',
      seeders: seedersMatch ? parseInt(seedersMatch[1]) : undefined,
      isHighQuality
    }
  }

  // Helper method to get best quality stream (highest quality + most seeders)
  getBestStream(streams: TorrentioStream[]): TorrentioStream | null {
    if (streams.length === 0) return null

    // Filter for high quality streams (4K, 2160p, 1080p)
    const highQualityStreams = streams.filter(stream => {
      const qualityInfo = this.parseStreamQuality(stream.title)
      return qualityInfo.isHighQuality
    })

    if (highQualityStreams.length === 0) return null

    // Sort by quality preference: 4K > 2160p > 1080p, then by seeders within same quality
    const qualityOrder = ['4K', '2160p', '1080p']

    return highQualityStreams.sort((a, b) => {
      const aQualityInfo = this.parseStreamQuality(a.title)
      const bQualityInfo = this.parseStreamQuality(b.title)

      const aIndex = qualityOrder.indexOf(aQualityInfo.quality)
      const bIndex = qualityOrder.indexOf(bQualityInfo.quality)

      // First priority: higher quality
      if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
        return aIndex - bIndex
      }
      if (aIndex !== -1 && bIndex === -1) return -1
      if (aIndex === -1 && bIndex !== -1) return 1

      // Second priority: within same quality, prefer higher seeders
      const aSeeders = aQualityInfo.seeders || 0
      const bSeeders = bQualityInfo.seeders || 0
      return bSeeders - aSeeders
    })[0]
  }

  // Helper method to filter streams by quality (prioritize quality + seeders)
  getHighQualityStreams(streams: TorrentioStream[]): TorrentioStream[] {
    return streams.filter(stream => {
      const qualityInfo = this.parseStreamQuality(stream.title)
      return qualityInfo.isHighQuality
    }).sort((a, b) => {
      // Sort by quality: 4K > 2160p > 1080p, then by seeders within same quality
      const qualityOrder = ['4K', '2160p', '1080p']
      const aQualityInfo = this.parseStreamQuality(a.title)
      const bQualityInfo = this.parseStreamQuality(b.title)

      const aIndex = qualityOrder.indexOf(aQualityInfo.quality)
      const bIndex = qualityOrder.indexOf(bQualityInfo.quality)

      // First priority: higher quality
      if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
        return aIndex - bIndex
      }
      if (aIndex !== -1 && bIndex === -1) return -1
      if (aIndex === -1 && bIndex !== -1) return 1

      // Second priority: within same quality, prefer higher seeders
      const aSeeders = aQualityInfo.seeders || 0
      const bSeeders = bQualityInfo.seeders || 0
      return bSeeders - aSeeders
    })
  }
}

// Default instance
export const torrentioAPI = new TorrentioAPI()
