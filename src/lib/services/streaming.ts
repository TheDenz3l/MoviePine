// Streaming service that combines TMDB, Torrentio, and Torbox APIs

import { TMDBAPI, TMDBMovie, TMDBTVShow } from '../api/tmdb'
import { TorrentioAPI, TorrentioStream } from '../api/torrentio'
import { TorboxAPI, TorboxTorrent } from '../api/torbox'
import RealDebridAPI, { RealDebridTorrent } from '../api/realdebrid'
import { fetchMovieSubtitles, type ProcessedSubtitle } from './subtitle-service'
// Debug utilities temporarily disabled to avoid reserved keyword issues
// import { streamingDebugger, logStreamingStep, logStreamingError, logStreamingSuccess } from '../utils/debug'

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
  subtitles?: string[] // Available subtitle languages from stream
}

export interface StreamingResult {
  url: string
  subtitles: string[]
  realSubtitles?: ProcessedSubtitle[] // Real subtitle files from SubDL API
  source: StreamingSource
  movieTitle?: string
  movieYear?: number
  imdbId?: string
  tmdbId?: string
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
      backdrop: tmdbSeries.backdrop_path ? this.tmdb.getBackdropUrl(tmdbSeries.backdrop_path, 'original') : undefined,
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
      console.log(`🎬 Starting enhanced stream search for movie ID: ${movieId}`)

      // Enhanced ID conversion with multiple fallback strategies
      const searchIds = await this.getSearchIds(movieId)
      console.log(`🔍 Generated search IDs:`, searchIds)

      let allStreams: any[] = []

      // Try each ID until we find streams
      for (const searchId of searchIds) {
        console.log(`🔄 Searching streams with ID: ${searchId.id} (${searchId.type})`)

        const streams = await this.torrentio.getMovieStreams(searchId.id)
        console.log(`📊 Found ${streams.length} streams for ${searchId.id} (${searchId.type})`)

        if (streams.length > 0) {
          allStreams = streams
          console.log(`✅ Successfully found streams using ${searchId.type}: ${searchId.id}`)
          break
        }
      }

      console.log(`🎬 Total streams found: ${allStreams.length}`)

      if (allStreams.length === 0) {
        console.log(`❌ No streams found for any ID variant of ${movieId}`)

        // Final fallback: Try alternative search methods
        console.log(`🔄 Attempting alternative search methods...`)
        allStreams = await this.alternativeStreamSearch(movieId)

        if (allStreams.length === 0) {
          console.log(`❌ No streams found after all fallback attempts for ${movieId}`)
          return []
        } else {
          console.log(`✅ Alternative search found ${allStreams.length} streams`)
        }
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

        const subtitles = stream.subtitles || []
        console.log(`📝 StreamingService: Stream "${stream.title}" has subtitles: [${subtitles.join(', ')}]`)

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
          subtitles,
        })
      }

      console.log(`✅ Stream search completed for ${movieId}:`, {
        totalSources: streamingSources.length,
        readySources: streamingSources.filter(s => s.isReady).length
      })

      return streamingSources
    } catch (error) {
      console.error(`❌ Error getting movie streams for ${movieId}:`, error)
      return []
    }
  }

  async prepareStream(source: StreamingSource): Promise<string | null> {
    try {
      console.log(`🔗 PREPARING STREAM: ${source.name}`)
      console.log(`📊 SOURCE URL: ${source.url}`)

      // STREMIO MODE: If this is a Torrentio resolve URL, resolve it to get the actual video URL
      if (source.url && source.url.includes('/resolve/realdebrid/')) {
        console.log(`✅ TORRENTIO RESOLVE URL DETECTED! 🎯`)
        console.log(`🎬 STREMIO MODE: Resolving Torrentio URL to get actual video URL`)
        console.log(`🔗 RESOLVE URL: ${source.url}`)

        try {
          // Use the proxy endpoint to resolve the Torrentio URL
          const proxyUrl = `/api/resolve-stream?url=${encodeURIComponent(source.url)}`
          console.log(`🔗 Using proxy URL: ${proxyUrl}`)

          const response = await fetch(proxyUrl)

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.resolvedUrl) {
              console.log(`🚀 RESOLVED VIDEO URL: ${data.resolvedUrl.substring(0, 100)}...`)
              console.log(`📹 Content Type: ${data.contentType || 'unknown'}`)
              console.log(`🎬 Is Video: ${data.isVideo ? 'Yes' : 'No'}`)
              console.log(`📝 Available subtitles: ${source.subtitles?.join(', ') || 'None detected'}`)

              // Use stream proxy for Real-Debrid URLs to handle CORS and streaming
              if (data.resolvedUrl.includes('real-debrid.com') || data.resolvedUrl.includes('download.')) {
                const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(data.resolvedUrl)}`
                console.log(`🔄 Using stream proxy for Real-Debrid URL: ${proxiedUrl.substring(0, 100)}...`)
                return proxiedUrl
              }

              // Return the actual video URL for other sources
              return data.resolvedUrl
            } else {
              console.log(`❌ Failed to resolve Torrentio URL: ${data.error || 'Unknown error'}`)
              return null
            }
          } else {
            const errorText = await response.text().catch(() => 'Unable to read error response')
            console.log(`❌ Proxy request failed: ${response.status} ${response.statusText}`)
            console.log(`❌ Error details: ${errorText}`)
            return null
          }
        } catch (error) {
          console.error(`❌ Error resolving Torrentio URL:`, error)
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error(`❌ This appears to be a network/CORS error. Check if the proxy endpoint is working.`)
          }
          return null
        }
      }

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

  async getStreamingResult(movieId: string, preferredQuality?: string): Promise<StreamingResult | null> {
    try {
      console.log(`🎬 STREMIO MODE: Starting stream selection for ${movieId}`)

      // Get movie metadata for better subtitle searching
      let movieMetadata: { title?: string, year?: number, imdbId?: string, tmdbId?: string } = {}
      if (movieId.startsWith('tmdb_')) {
        try {
          const tmdbId = parseInt(movieId.replace('tmdb_', ''))
          const movie = await this.tmdb.getMovieDetails(tmdbId)
          const externalIds = await this.tmdb.getMovieExternalIds(tmdbId)
          movieMetadata = {
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            imdbId: externalIds.imdb_id,
            tmdbId: tmdbId.toString()
          }
          console.log(`📊 Movie metadata: "${movieMetadata.title}" (${movieMetadata.year}) - IMDB: ${movieMetadata.imdbId}`)
        } catch (error) {
          console.warn(`⚠️ Could not fetch movie metadata:`, error)
        }
      }

      const sources = await this.getMovieStreams(movieId)

      if (sources.length === 0) {
        console.log(`❌ No streams found for ${movieId}`)
        return null
      }

      console.log(`📊 Found ${sources.length} total streams, checking for Torrentio resolve URLs...`)

      // STREMIO MODE: Look for Torrentio resolve URLs with audio compatibility prioritization
      const torrentioSources = sources.filter(source =>
        source.url && source.url.includes('/resolve/realdebrid/')
      )

      if (torrentioSources.length > 0) {
        console.log(`🎵 Found ${torrentioSources.length} Torrentio streams, prioritizing by audio compatibility...`)

        // Sort Torrentio sources by audio compatibility first, then by quality
        const sortedTorrentioSources = torrentioSources.sort((a, b) => {
          // Priority 1: Audio compatibility (browser-supported codecs first)
          const aAudioScore = this.getAudioCompatibilityScore(a.name)
          const bAudioScore = this.getAudioCompatibilityScore(b.name)
          if (aAudioScore !== bAudioScore) {
            console.log(`🎵 Audio priority: "${a.name}" (score: ${aAudioScore}) vs "${b.name}" (score: ${bAudioScore})`)
            return bAudioScore - aAudioScore
          }

          // Priority 2: Quality (4K > 1080p > 720p)
          const aQualityScore = this.getQualityScore(a.quality)
          const bQualityScore = this.getQualityScore(b.quality)
          if (aQualityScore !== bQualityScore) return bQualityScore - aQualityScore

          // Priority 3: Seeders/peers (higher is better)
          const aSeeders = this.extractSeeders(a.name)
          const bSeeders = this.extractSeeders(b.name)
          return bSeeders - aSeeders
        })

        // Try each Torrentio source in audio-compatibility order
        for (const source of sortedTorrentioSources) {
          const audioScore = this.getAudioCompatibilityScore(source.name)
          console.log(`✅ TRYING TORRENTIO STREAM! 🎯`)
          console.log(`🎵 Stream: ${source.name} (Audio Score: ${audioScore})`)
          console.log(`📊 Quality: ${source.quality}, Seeders: ${this.extractSeeders(source.name)}`)

          try {
            const streamingUrl = await this.prepareStream(source)
            if (streamingUrl) {
              console.log(`✅ Success! Stream prepared with subtitles: ${source.quality} quality`)

              // Fetch real subtitles from SubDL API
              let realSubtitles: ProcessedSubtitle[] = []
              try {
                console.log(`🎬 Fetching real subtitles using movie metadata...`)
                realSubtitles = await fetchMovieSubtitles(
                  movieMetadata?.title || source.name, // Use movie title or stream name as fallback
                  movieMetadata?.year,
                  movieMetadata?.imdbId,
                  movieMetadata?.tmdbId,
                  ['en', 'es', 'fr', 'de', 'it'] // Default languages
                )
                console.log(`✅ Found ${realSubtitles.length} real subtitle tracks`)
              } catch (error) {
                console.error(`❌ Failed to fetch real subtitles:`, error)
              }

              return {
                url: streamingUrl,
                subtitles: source.subtitles || [],
                realSubtitles,
                source
              }
            }
          } catch (error) {
            console.log(`❌ Torrentio stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            // Continue to next stream
          }
        }
      }

      console.log(`⚠️ No Torrentio resolve URLs found, falling back to traditional method...`)

      // Enhanced priority algorithm with fallback logic
      const result = await this.selectOptimalStreamWithFallbackResult(sources, preferredQuality, movieMetadata)

      if (result) {
        console.log(`✅ Successfully prepared streaming URL with subtitles`)
        return result
      } else {
        console.log(`❌ Failed to prepare any streaming URL after trying all available streams`)
        return null
      }

    } catch (error) {
      console.error('Error getting streaming result:', error)
      return null
    }
  }

  async getStreamingUrl(movieId: string, preferredQuality?: string): Promise<string | null> {
    try {
      console.log(`🎬 STREMIO MODE: Starting stream selection for ${movieId}`)
      const sources = await this.getMovieStreams(movieId)

      if (sources.length === 0) {
        console.log(`❌ No streams found for ${movieId}`)
        return null
      }

      console.log(`📊 Found ${sources.length} total streams, checking for Torrentio resolve URLs...`)

      // STREMIO MODE: Look for Torrentio resolve URLs with audio compatibility prioritization
      const torrentioSources = sources.filter(source =>
        source.url && source.url.includes('/resolve/realdebrid/')
      )

      if (torrentioSources.length > 0) {
        console.log(`🎵 Found ${torrentioSources.length} Torrentio streams, prioritizing by audio compatibility...`)

        // Sort Torrentio sources by audio compatibility first, then by quality
        const sortedTorrentioSources = torrentioSources.sort((a, b) => {
          // Priority 1: Audio compatibility (browser-supported codecs first)
          const aAudioScore = this.getAudioCompatibilityScore(a.name)
          const bAudioScore = this.getAudioCompatibilityScore(b.name)
          if (aAudioScore !== bAudioScore) {
            console.log(`🎵 Audio priority: "${a.name}" (score: ${aAudioScore}) vs "${b.name}" (score: ${bAudioScore})`)
            return bAudioScore - aAudioScore
          }

          // Priority 2: Quality (4K > 1080p > 720p)
          const aQualityScore = this.getQualityScore(a.quality)
          const bQualityScore = this.getQualityScore(b.quality)
          if (aQualityScore !== bQualityScore) return bQualityScore - aQualityScore

          // Priority 3: Seeders/peers (higher is better)
          const aSeeders = this.extractSeeders(a.name)
          const bSeeders = this.extractSeeders(b.name)
          return bSeeders - aSeeders
        })

        console.log(`🎵 Top 3 audio-prioritized streams:`)
        sortedTorrentioSources.slice(0, 3).forEach((source, index) => {
          const audioScore = this.getAudioCompatibilityScore(source.name)
          console.log(`  ${index + 1}. ${source.name} (Audio: ${audioScore}, Quality: ${source.quality})`)
        })

        // Try each Torrentio source in audio-compatibility order
        for (const source of sortedTorrentioSources) {
          const audioScore = this.getAudioCompatibilityScore(source.name)
          console.log(`✅ TRYING TORRENTIO STREAM! 🎯`)
          console.log(`🎵 Audio compatibility score: ${audioScore}`)
          console.log(`🔗 RESOLVE URL: ${source.url}`)
          console.log(`📊 Quality: ${source.quality}, Size: ${source.size}`)

          try {
            // Use a server-side proxy to resolve the URL and follow redirects
            const proxyUrl = `/api/resolve-stream?url=${encodeURIComponent(source.url)}`
            const response = await fetch(proxyUrl)

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.resolvedUrl) {
                console.log(`🚀 RESOLVED VIDEO URL: ${data.resolvedUrl.substring(0, 100)}...`)
                console.log(`🎵 Selected stream with audio score: ${audioScore}`)

                // Use video proxy to bypass CORS issues
                const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(data.resolvedUrl)}`
                console.log(`🎬 Using video proxy for CORS-free streaming`)
                return proxyUrl
              } else {
                console.log(`❌ Failed to resolve stream: ${data.error || 'Unknown error'}`)
                continue
              }
            } else {
              console.log(`❌ Proxy request failed: ${response.status} ${response.statusText}`)
              continue
            }
          } catch (error) {
            console.error(`❌ Error resolving Torrentio URL:`, error)
            continue
          }
        }
      }

      console.log(`⚠️ No Torrentio resolve URLs found, falling back to traditional method...`)

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

  private async selectOptimalStreamWithFallbackResult(
    sources: StreamingSource[],
    preferredQuality?: string,
    movieMetadata?: { title?: string, year?: number, imdbId?: string, tmdbId?: string }
  ): Promise<StreamingResult | null> {
    // Step 1: Sort sources by quality and readiness
    const sortedSources = this.sortSourcesByPriority(sources, preferredQuality)

    // Step 2: Try each source in order until one works
    for (let i = 0; i < sortedSources.length; i++) {
      const source = sortedSources[i]
      console.log(`🔄 Attempt ${i + 1}/${sortedSources.length}: ${source.quality} - ${source.name} (${source.seeders || 0} seeders)`)

      try {
        const streamingUrl = await this.prepareStream(source)
        if (streamingUrl) {
          console.log(`✅ Success! Stream prepared: ${source.quality} quality`)

          return {
            url: streamingUrl,
            subtitles: source.subtitles || [],
            source,
            movieTitle: source.name
          }
        }
      } catch (error) {
        console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Continue to next stream
      }
    }

    return null
  }

  // Enhanced ID conversion with multiple fallback strategies
  private async getSearchIds(movieId: string): Promise<Array<{id: string, type: string}>> {
    const searchIds: Array<{id: string, type: string}> = []

    if (movieId.startsWith('tmdb_')) {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''))
      console.log(`🔄 Converting TMDB ID ${tmdbId} to IMDB ID...`)

      try {
        // Get external IDs from TMDB
        const externalIds = await this.tmdb.getMovieExternalIds(tmdbId)
        console.log(`📊 TMDB External IDs:`, {
          imdb_id: externalIds.imdb_id,
          wikidata_id: externalIds.wikidata_id,
          facebook_id: externalIds.facebook_id
        })

        // Primary: Use IMDB ID if available
        if (externalIds.imdb_id) {
          searchIds.push({ id: externalIds.imdb_id, type: 'IMDB (from TMDB)' })
        }

        // Fallback 1: Try TMDB ID directly (some sources might support it)
        searchIds.push({ id: movieId, type: 'TMDB ID (direct)' })
        searchIds.push({ id: tmdbId.toString(), type: 'TMDB ID (numeric)' })

        // Fallback 2: If no IMDB ID, try to get movie details and search by title+year
        if (!externalIds.imdb_id) {
          try {
            const movieDetails = await this.tmdb.getMovieDetails(tmdbId)
            if (movieDetails.title && movieDetails.release_date) {
              const year = new Date(movieDetails.release_date).getFullYear()
              const titleSearch = `${movieDetails.title} ${year}`
              searchIds.push({ id: titleSearch, type: 'Title+Year search' })

              // Also try original title if different
              if (movieDetails.original_title && movieDetails.original_title !== movieDetails.title) {
                const originalTitleSearch = `${movieDetails.original_title} ${year}`
                searchIds.push({ id: originalTitleSearch, type: 'Original Title+Year search' })
              }
            }
          } catch (error) {
            console.warn(`⚠️ Could not get movie details for TMDB ${tmdbId}:`, error)
          }
        }

      } catch (error) {
        console.error(`❌ Error converting TMDB ID ${tmdbId}:`, error)
        // Fallback to using TMDB ID directly
        searchIds.push({ id: movieId, type: 'TMDB ID (error fallback)' })
        searchIds.push({ id: tmdbId.toString(), type: 'TMDB ID numeric (error fallback)' })
      }
    } else if (movieId.startsWith('tt')) {
      // Already an IMDB ID
      searchIds.push({ id: movieId, type: 'IMDB (provided)' })
    } else {
      // Unknown format, try as-is
      searchIds.push({ id: movieId, type: 'Unknown format (as-is)' })
    }

    return searchIds
  }

  // Alternative stream search methods when primary search fails
  private async alternativeStreamSearch(movieId: string): Promise<any[]> {
    console.log(`🔍 Starting alternative stream search for ${movieId}`)

    try {
      // Method 1: Try with different Torrentio configurations
      const alternativeStreams = await this.tryAlternativeTorrentioConfigs(movieId)
      if (alternativeStreams.length > 0) {
        console.log(`✅ Found ${alternativeStreams.length} streams with alternative Torrentio config`)
        return alternativeStreams
      }

      // Method 2: If it's a TMDB ID, try searching by movie title and year
      if (movieId.startsWith('tmdb_')) {
        const titleBasedStreams = await this.searchByTitleAndYear(movieId)
        if (titleBasedStreams.length > 0) {
          console.log(`✅ Found ${titleBasedStreams.length} streams by title search`)
          return titleBasedStreams
        }
      }

      // Method 3: Try with simplified search terms
      const simplifiedStreams = await this.trySimplifiedSearch(movieId)
      if (simplifiedStreams.length > 0) {
        console.log(`✅ Found ${simplifiedStreams.length} streams with simplified search`)
        return simplifiedStreams
      }

    } catch (error) {
      console.error(`❌ Alternative search failed:`, error)
    }

    return []
  }

  // Try alternative Torrentio configurations
  private async tryAlternativeTorrentioConfigs(movieId: string): Promise<any[]> {
    // Create alternative Torrentio instance with different provider selection
    const alternativeProviders = ['1337x', 'rarbg', 'thepiratebay'] // Focus on most reliable providers
    const altTorrentio = new TorrentioAPI({
      providers: alternativeProviders,
      debridService: this.realdebrid ? 'realdebrid' : undefined,
      apiKey: this.realdebrid ? process.env.NEXT_PUBLIC_DEBRID_API_KEY : undefined
    })

    // Try with the main ID first
    let streams = await altTorrentio.getMovieStreams(movieId)
    if (streams.length > 0) return streams

    // If TMDB ID, try converting to IMDB and search again
    if (movieId.startsWith('tmdb_')) {
      try {
        const tmdbId = parseInt(movieId.replace('tmdb_', ''))
        const externalIds = await this.tmdb.getMovieExternalIds(tmdbId)
        if (externalIds.imdb_id) {
          streams = await altTorrentio.getMovieStreams(externalIds.imdb_id)
        }
      } catch (error) {
        console.warn(`⚠️ Could not get external IDs for alternative search:`, error)
      }
    }

    return streams
  }

  // Search by movie title and year
  private async searchByTitleAndYear(movieId: string): Promise<any[]> {
    if (!movieId.startsWith('tmdb_')) return []

    try {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''))
      const movieDetails = await this.tmdb.getMovieDetails(tmdbId)

      if (!movieDetails.title || !movieDetails.release_date) {
        console.log(`⚠️ Missing title or release date for TMDB ${tmdbId}`)
        return []
      }

      const year = new Date(movieDetails.release_date).getFullYear()

      // Try different title variations
      const titleVariations = [
        movieDetails.title,
        movieDetails.original_title,
        // Remove common subtitle patterns
        movieDetails.title.split(':')[0].trim(),
        movieDetails.title.split(' - ')[0].trim(),
      ].filter((title, index, arr) => title && arr.indexOf(title) === index) // Remove duplicates

      for (const title of titleVariations) {
        console.log(`🔍 Trying title search: "${title}" (${year})`)

        // This would require implementing a title-based search in Torrentio
        // For now, we'll try constructing potential IMDB-style searches
        const searchTerms = [
          `${title} ${year}`,
          `${title.toLowerCase().replace(/[^a-z0-9\s]/g, '')} ${year}`,
        ]

        for (const searchTerm of searchTerms) {
          try {
            // This is a placeholder - in a real implementation, you might:
            // 1. Use a different torrent search API that supports title search
            // 2. Implement a title-to-IMDB lookup service
            // 3. Use alternative streaming sources
            console.log(`🔍 Would search for: "${searchTerm}"`)
          } catch (error) {
            console.warn(`⚠️ Title search failed for "${searchTerm}":`, error)
          }
        }
      }
    } catch (error) {
      console.error(`❌ Title-based search failed:`, error)
    }

    return []
  }

  // Try simplified search with basic terms
  private async trySimplifiedSearch(movieId: string): Promise<any[]> {
    // This could implement additional fallback search strategies
    // such as using different torrent search engines or APIs
    console.log(`🔍 Simplified search not yet implemented for ${movieId}`)
    return []
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
      if (aAudioScore !== bAudioScore) {
        console.log(`🎵 Audio priority: "${a.name}" (score: ${aAudioScore}) vs "${b.name}" (score: ${bAudioScore})`)
        return bAudioScore - aAudioScore
      }

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

    // Dolby Digital Plus with or without Atmos (supported by some browsers)
    // Check for DDP/EAC3 first, even if it has Atmos metadata
    if (name.includes('ddp') || name.includes('dd+') || name.includes('eac3')) {
      return 8
    }

    // Standard Dolby Digital with or without Atmos (limited support)
    if (name.includes('dd5.1') || name.includes('ac3')) {
      return 6
    }

    // DTS variants (not supported by browsers)
    if (name.includes('dts-hd') || name.includes('dts-ma') || name.includes('dts')) {
      return 2
    }

    // TrueHD (not supported by browsers)
    if (name.includes('truehd')) {
      return 1
    }

    // Standalone Atmos without base codec (rare, not supported)
    if (name.includes('atmos') && !name.includes('ddp') && !name.includes('dd+') && !name.includes('eac3') && !name.includes('dd5.1') && !name.includes('ac3')) {
      return 1
    }

    // Unknown audio codec
    return 5
  }

  private getQualityScore(quality: string): number {
    const q = quality.toLowerCase()
    if (q.includes('4k') || q.includes('2160p')) return 5
    if (q.includes('1080p')) return 4
    if (q.includes('720p')) return 3
    if (q.includes('480p')) return 2
    return 1
  }

  private extractSeeders(streamName: string): number {
    // Try to extract seeder count from stream name (format: 👤 123)
    const seederMatch = streamName.match(/👤\s*(\d+)/)
    if (seederMatch) {
      return parseInt(seederMatch[1], 10)
    }
    return 0
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
