// Streaming service that combines TMDB, Torrentio, and Torbox APIs

import { TMDBAPI, TMDBMovie, TMDBTVShow } from '../api/tmdb'
import { TorrentioAPI, TorrentioStream } from '../api/torrentio'
import { TorboxAPI, TorboxTorrent } from '../api/torbox'
import RealDebridAPI, { RealDebridTorrent } from '../api/realdebrid'

export interface StreamingMovie {
  id: string
  title: string
  poster?: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
  runtime?: number
  imdbId?: string
  tmdbId?: number
}

export interface StreamingSeries {
  id: string
  title: string
  poster?: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
  seasons?: number
  episodes?: number
  imdbId?: string
  tmdbId?: number
}

export interface StreamingSource {
  name: string
  quality: string
  size: string
  seeders?: number
  infoHash: string
  url?: string
  isReady: boolean
  torboxId?: number
  realDebridId?: string
}

export interface StreamingConfig {
  tmdbApiKey: string
  torboxApiKey?: string
  torrentioProviders?: string[]
  debridService?: 'realdebrid' | 'premiumize' | 'alldebrid'
  debridApiKey?: string
}

export class StreamingService {
  private tmdb: TMDBAPI
  private torrentio: TorrentioAPI
  private torbox?: TorboxAPI
  private realdebrid?: RealDebridAPI
  private config: StreamingConfig

  constructor(config: StreamingConfig) {
    this.config = config

    // Only initialize TMDB if API key is provided
    if (config.tmdbApiKey) {
      this.tmdb = new TMDBAPI(config.tmdbApiKey)
    } else {
      // Create a dummy TMDB instance that will fail gracefully
      this.tmdb = new TMDBAPI('dummy')
    }

    this.torrentio = new TorrentioAPI({
      providers: config.torrentioProviders,
      debridService: config.debridService,
      apiKey: config.debridApiKey,
    })

    if (config.torboxApiKey) {
      this.torbox = new TorboxAPI(config.torboxApiKey)
    }

    // Initialize Real-Debrid if configured
    if (config.debridService === 'realdebrid' && config.debridApiKey) {
      this.realdebrid = new RealDebridAPI(config.debridApiKey)
      // Test connection in background
      this.realdebrid.testConnection().catch(error => {
        console.warn('Real-Debrid connection test failed:', error)
      })
    }
  }

  // Search and discovery methods
  async searchMovies(query: string): Promise<StreamingMovie[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const searchResult = await this.tmdb.searchMovies(query)
      const genres = await this.tmdb.getMovieGenres()

      return searchResult.results.map(movie =>
        this.tmdb.convertToMovie(movie as TMDBMovie, genres.genres)
      )
    } catch (error) {
      console.error('Error searching movies:', error)
      return []
    }
  }

  async getTrendingMovies(): Promise<StreamingMovie[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const trendingResult = await this.tmdb.getTrendingMovies()
      const genres = await this.tmdb.getMovieGenres()

      return trendingResult.results.map(movie =>
        this.tmdb.convertToMovie(movie as TMDBMovie, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching trending movies:', error)
      return []
    }
  }

  async getTrendingSeries(): Promise<StreamingSeries[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const trendingResult = await this.tmdb.getTrendingTVShows()
      const genres = await this.tmdb.getTVGenres()

      return trendingResult.results.map(series =>
        this.convertToSeries(series as TMDBTVShow, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching trending series:', error)
      return []
    }
  }

  async getNowPlayingMovies(): Promise<StreamingMovie[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const nowPlayingResult = await this.tmdb.getNowPlayingMovies()
      const genres = await this.tmdb.getMovieGenres()

      return nowPlayingResult.results.map(movie =>
        this.tmdb.convertToMovie(movie as TMDBMovie, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching now playing movies:', error)
      return []
    }
  }

  async getPopularMovies(): Promise<StreamingMovie[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const popularResult = await this.tmdb.getPopularMovies()
      const genres = await this.tmdb.getMovieGenres()

      return popularResult.results.map(movie =>
        this.tmdb.convertToMovie(movie as TMDBMovie, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching popular movies:', error)
      return []
    }
  }

  async getTopRatedMovies(): Promise<StreamingMovie[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const topRatedResult = await this.tmdb.getTopRatedMovies()
      const genres = await this.tmdb.getMovieGenres()

      return topRatedResult.results.map(movie =>
        this.tmdb.convertToMovie(movie as TMDBMovie, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching top rated movies:', error)
      return []
    }
  }

  async getMoviesByGenre(genreId: number): Promise<StreamingMovie[]> {
    try {
      const discoverResult = await this.tmdb.makeRequest('/discover/movie', {
        with_genres: genreId.toString(),
      })
      const genres = await this.tmdb.getMovieGenres()

      return discoverResult.results.map((movie: TMDBMovie) =>
        this.tmdb.convertToMovie(movie, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching movies by genre:', error)
      return []
    }
  }

  // Helper method to convert TMDB TV show to StreamingSeries
  private convertToSeries(tmdbSeries: TMDBTVShow, genres: TMDBGenre[]): StreamingSeries {
    const seriesGenres = tmdbSeries.genres || genres.filter(g => tmdbSeries.genre_ids?.includes(g.id))

    return {
      id: `tmdb_tv_${tmdbSeries.id}`,
      title: tmdbSeries.name,
      poster: tmdbSeries.poster_path ? this.tmdb.getPosterUrl(tmdbSeries.poster_path) : undefined,
      backdrop: tmdbSeries.backdrop_path ? this.tmdb.getBackdropUrl(tmdbSeries.backdrop_path) : undefined,
      year: tmdbSeries.first_air_date ? new Date(tmdbSeries.first_air_date).getFullYear() : new Date().getFullYear(),
      rating: Math.round(tmdbSeries.vote_average * 10),
      genre: seriesGenres.map(g => g.name),
      description: tmdbSeries.overview,
      seasons: tmdbSeries.number_of_seasons,
      episodes: tmdbSeries.number_of_episodes,
      tmdbId: tmdbSeries.id,
    }
  }

  // Streaming methods
  async getMovieStreams(movieId: string): Promise<StreamingSource[]> {
    try {
      let imdbId = movieId
      
      // If it's a TMDB ID, get the IMDB ID
      if (movieId.startsWith('tmdb_')) {
        const tmdbId = parseInt(movieId.replace('tmdb_', ''))
        console.log(`🔄 Converting TMDB ID ${tmdbId} to IMDB ID...`)

        const externalIds = await this.tmdb.getMovieExternalIds(tmdbId)
        console.log(`📊 TMDB External IDs response:`, JSON.stringify(externalIds, null, 2))

        imdbId = externalIds.imdb_id || movieId
        console.log(`🎯 Using IMDB ID: ${imdbId} (converted from TMDB ${tmdbId})`)
      } else {
        console.log(`🎯 Using provided ID: ${imdbId}`)
      }

      // Get ALL streams from Torrentio (no filtering yet)
      let allStreams = await this.torrentio.getMovieStreams(imdbId)

      console.log(`🎬 Found ${allStreams.length} total streams for ${imdbId}`)

      // If no streams found with IMDB ID and we converted from TMDB, try with original TMDB ID as fallback
      if (allStreams.length === 0 && movieId.startsWith('tmdb_') && imdbId !== movieId) {
        console.log(`🔄 No streams found with IMDB ID, trying with original TMDB ID: ${movieId}`)
        allStreams = await this.torrentio.getMovieStreams(movieId)
        console.log(`🎬 Found ${allStreams.length} total streams for ${movieId} (TMDB fallback)`)
      }

      // We'll process ALL streams and do intelligent selection later

      // Convert to StreamingSource format
      const streamingSources: StreamingSource[] = []

      for (const stream of allStreams) {
        const quality = this.torrentio.parseStreamQuality(stream.title)

        // Skip only obviously bad quality (screeners, cams, etc.)
        if (quality.quality.toLowerCase().includes('cam') ||
            quality.quality.toLowerCase().includes('scr') ||
            quality.quality.toLowerCase().includes('ts')) continue

        // Debug: Log stream data to check info hash
        console.log(`🔍 Processing stream: ${stream.title}`)
        console.log(`📊 Info Hash: ${stream.infoHash}`)
        console.log(`🔗 URL: ${stream.url}`)
        console.log(`📁 File Index: ${stream.fileIdx}`)

        // Validate info hash (accept both 40-char hex and longer base32 hashes)
        if (!stream.infoHash || stream.infoHash.length < 32) {
          console.warn(`⚠️ Invalid info hash for stream: ${stream.title} - Hash: ${stream.infoHash}`)
          continue
        }

        let isReady = false
        let torboxId: number | undefined
        let realDebridId: string | undefined

        // Check if torrent is available in Torbox
        if (this.torbox && stream.infoHash) {
          try {
            const existingTorrent = await this.torbox.findTorrentByHash(stream.infoHash)
            if (existingTorrent) {
              isReady = existingTorrent.status === 'completed'
              torboxId = existingTorrent.id
            }
          } catch (error) {
            console.warn('Error checking Torbox torrent:', error)
          }
        }

        // Check if torrent is available in Real-Debrid
        if (this.realdebrid && stream.infoHash && !isReady) {
          try {
            const existingTorrent = await this.realdebrid.findTorrentByHash(stream.infoHash)
            if (existingTorrent) {
              isReady = this.realdebrid.isReady(existingTorrent)
              realDebridId = existingTorrent.id
            }
          } catch (error) {
            console.warn('Error checking Real-Debrid torrent:', error)
          }
        }

        streamingSources.push({
          name: stream.title,
          quality: quality.quality,
          size: quality.size,
          seeders: quality.seeders,
          infoHash: stream.infoHash,
          url: stream.url,
          isReady,
          torboxId,
          realDebridId,
        })
      }
      
      return streamingSources
    } catch (error) {
      console.error('Error getting movie streams:', error)
      return []
    }
  }

  async prepareStream(source: StreamingSource): Promise<string | null> {
    try {
      // Try Real-Debrid first if available and configured
      if (this.realdebrid && source.realDebridId) {
        const torrent = await this.realdebrid.getTorrent(source.realDebridId)
        if (this.realdebrid.isReady(torrent)) {
          return await this.realdebrid.getStreamingUrl(torrent)
        }
      }

      // Try Real-Debrid with new torrent if configured
      if (this.realdebrid && source.infoHash) {
        try {
          console.log(`🚀 Adding torrent to Real-Debrid: ${source.name}`)
          console.log(`📊 Quality: ${source.quality}, Size: ${source.size}, Seeders: ${source.seeders}`)

          // Check if this is a Torrentio resolve URL (indicates cached stream)
          console.log(`🔗 Checking Torrentio URL: ${source.url}`)

          // If the URL is a Torrentio resolve URL, the stream is already cached on Real-Debrid
          if (source.url.includes('/resolve/realdebrid/')) {
            console.log(`✅ Stream is already cached on Real-Debrid!`)
            console.log(`🎬 Using Torrentio resolve URL via proxy: ${source.url}`)

            // Use our proxy to handle CORS issues
            const proxyUrl = `/api/stream?url=${encodeURIComponent(source.url)}`
            console.log(`🔄 Proxy URL: ${proxyUrl}`)

            // Return the proxy URL instead of direct Real-Debrid URL
            return {
              url: proxyUrl,
              quality: source.quality || 'Unknown',
              size: source.size || 'Unknown',
              title: source.name
            }
          }

          // For non-cached streams, try to add to Real-Debrid
          console.log(`⏳ Stream not cached, adding to Real-Debrid...`)

          // Create magnet link from info hash
          const magnetLink = `magnet:?xt=urn:btih:${source.infoHash}&dn=${encodeURIComponent(source.name)}`
          console.log(`🧲 Using magnet link: ${magnetLink.substring(0, 100)}...`)
          console.log(`⏳ Waiting for torrent to be ready...`)

          const torrent = await this.realdebrid.addTorrentAndWait(magnetLink)
          console.log(`✅ Torrent ready, getting streaming URL...`)

          const streamingUrl = await this.realdebrid.getStreamingUrl(torrent)
          console.log(`🎬 Streaming URL obtained: ${streamingUrl?.substring(0, 50)}...`)

          // Use proxy to handle CORS issues with Real-Debrid URLs
          if (streamingUrl) {
            const proxyUrl = `/api/stream?url=${encodeURIComponent(streamingUrl)}`
            console.log(`🔄 Using proxy URL for Real-Debrid stream`)
            return proxyUrl
          }

          return streamingUrl
        } catch (error) {
          console.error('💥 Real-Debrid failed:', error)

          // If it's a timeout or not-cached error, provide helpful message
          if (error instanceof Error) {
            if (error.message.includes('not cached') || error.message.includes('downloading')) {
              throw new Error(`Stream not instantly available. ${error.message}. Try a different movie or wait for this torrent to be cached.`)
            } else if (error.message.includes('did not become ready')) {
              throw new Error(`Stream preparation timed out. This torrent may not be cached on Real-Debrid. Try a different quality or movie.`)
            } else if (error.message.includes('API error')) {
              throw new Error(`Real-Debrid API error: ${error.message}. Please check your API key and account status.`)
            }
          }

          throw new Error(`Real-Debrid failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Fallback to Torbox
      if (!this.torbox) {
        if (this.realdebrid) {
          throw new Error('Real-Debrid failed to prepare stream. Torbox not configured as fallback.')
        } else {
          throw new Error('No debrid service configured for streaming')
        }
      }

      let torrent: TorboxTorrent

      if (source.torboxId) {
        // Use existing torrent
        torrent = await this.torbox.getTorrent(source.torboxId)
      } else {
        // Create new torrent
        torrent = await this.torbox.getOrCreateTorrent(source.infoHash)
      }

      // Wait for torrent to be ready (in a real app, you'd want to poll this)
      if (torrent.status !== 'completed') {
        throw new Error('Torrent not ready for streaming')
      }

      // Get the largest video file
      const videoFile = await this.torbox.getLargestVideoFile(torrent.id)
      if (!videoFile) {
        throw new Error('No video files found in torrent')
      }

      // Get streaming URL
      const streamingUrl = await this.torbox.getStreamingUrl(torrent.id, videoFile.id)
      return streamingUrl

    } catch (error) {
      console.error('Error preparing stream:', error)
      return null
    }
  }

  async getStreamingUrl(movieId: string, preferredQuality?: string): Promise<string | null> {
    try {
      console.log(`🎬 Starting intelligent stream selection for ${movieId}`)
      const sources = await this.getMovieStreams(movieId)

      if (sources.length === 0) {
        console.log(`❌ No streams found for ${movieId}`)
        return null
      }

      console.log(`📊 Found ${sources.length} total streams, starting intelligent selection...`)

      // Enhanced priority algorithm with fallback logic
      const streamingUrl = await this.selectOptimalStreamWithFallback(sources, preferredQuality)

      if (streamingUrl) {
        console.log(`✅ Successfully prepared streaming URL`)
        return streamingUrl
      } else {
        console.log(`❌ Failed to prepare any streaming URL after trying all available streams`)
        return null
      }

    } catch (error) {
      console.error('Error getting streaming URL:', error)
      return null
    }
  }

  private async selectOptimalStreamWithFallback(sources: StreamingSource[], preferredQuality?: string): Promise<string | null> {
    // Step 1: Sort all sources by our intelligent priority algorithm
    const sortedSources = this.sortSourcesByPriority(sources, preferredQuality)

    console.log(`🎯 Trying ${sortedSources.length} streams in priority order...`)

    // Step 2: Try each source in order until one works
    for (let i = 0; i < sortedSources.length; i++) {
      const source = sortedSources[i]
      console.log(`🔄 Attempt ${i + 1}/${sortedSources.length}: ${source.quality} - ${source.name} (${source.seeders || 0} seeders)`)

      try {
        const streamingUrl = await this.prepareStream(source)
        if (streamingUrl) {
          console.log(`✅ Success! Stream prepared: ${source.quality} quality`)
          return streamingUrl
        }
      } catch (error) {
        console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Continue to next stream
      }
    }

    return null
  }

  private sortSourcesByPriority(sources: StreamingSource[], preferredQuality?: string): StreamingSource[] {
    return sources.sort((a, b) => {
      // Priority 1: Preferred quality (if specified)
      if (preferredQuality) {
        const aMatchesPreferred = a.quality.toLowerCase().includes(preferredQuality.toLowerCase())
        const bMatchesPreferred = b.quality.toLowerCase().includes(preferredQuality.toLowerCase())
        if (aMatchesPreferred && !bMatchesPreferred) return -1
        if (!aMatchesPreferred && bMatchesPreferred) return 1
      }

      // Priority 2: Cache status (ready streams first)
      if (a.isReady && !b.isReady) return -1
      if (!a.isReady && b.isReady) return 1

      // Priority 3: Audio compatibility (browser-supported codecs first)
      const aAudioScore = this.getAudioCompatibilityScore(a.name)
      const bAudioScore = this.getAudioCompatibilityScore(b.name)
      if (aAudioScore !== bAudioScore) return bAudioScore - aAudioScore

      // Priority 4: Quality priority (4K > 2160p > 1080p > 720p > 480p)
      const qualityScore = (quality: string): number => {
        const q = quality.toLowerCase()
        if (q.includes('4k') || q.includes('2160p')) return 5
        if (q.includes('1080p')) return 4
        if (q.includes('720p')) return 3
        if (q.includes('480p')) return 2
        return 1
      }

      const aQualityScore = qualityScore(a.quality)
      const bQualityScore = qualityScore(b.quality)
      if (aQualityScore !== bQualityScore) return bQualityScore - aQualityScore

      // Priority 5: Seeders/peers (higher is better)
      const aSeeders = a.seeders || 0
      const bSeeders = b.seeders || 0
      return bSeeders - aSeeders
    })
  }

  private getAudioCompatibilityScore(streamName: string): number {
    const name = streamName.toLowerCase()

    // Browser-compatible audio codecs (highest priority)
    if (name.includes('aac') || name.includes('mp3') || name.includes('opus')) {
      return 10
    }

    // Dolby Digital Plus (supported by some browsers)
    if (name.includes('ddp') || name.includes('dd+') || name.includes('eac3')) {
      return 8
    }

    // Standard Dolby Digital (limited support)
    if (name.includes('dd5.1') || name.includes('ac3')) {
      return 6
    }

    // DTS variants (not supported by browsers)
    if (name.includes('dts-hd') || name.includes('dts-ma') || name.includes('dts')) {
      return 2
    }

    // TrueHD and other high-end codecs (not supported)
    if (name.includes('truehd') || name.includes('atmos')) {
      return 1
    }

    // Unknown audio codec
    return 5
  }

  // Utility methods
  async validateConfiguration(): Promise<{
    tmdb: boolean
    torbox: boolean
    torrentio: boolean
    realdebrid: boolean
  }> {
    const results = {
      tmdb: false,
      torbox: false,
      torrentio: false,
      realdebrid: false,
    }

    // Check TMDB
    if (this.config.tmdbApiKey) {
      try {
        await this.tmdb.getPopularMovies()
        results.tmdb = true
      } catch (error) {
        console.error('TMDB validation failed:', error)
      }
    }

    // Check Torbox
    if (this.torbox) {
      try {
        results.torbox = await this.torbox.validateApiKey()
      } catch (error) {
        console.error('Torbox validation failed:', error)
      }
    }

    // Check Real-Debrid
    if (this.realdebrid) {
      try {
        await this.realdebrid.getUser()
        results.realdebrid = true
      } catch (error) {
        console.error('Real-Debrid validation failed:', error)
      }
    }

    // Check Torrentio
    try {
      await this.torrentio.getManifest()
      results.torrentio = true
    } catch (error) {
      console.error('Torrentio validation failed:', error)
    }

    return results
  }
}

// Helper function to create streaming service
export function createStreamingService(config: StreamingConfig): StreamingService {
  return new StreamingService(config)
}
