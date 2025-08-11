// Streaming service that combines TMDB, Torrentio, and Torbox APIs

import { TMDBAPI, TMDBMovie, TMDBTVShow, TMDBGenre } from '../api/tmdb'
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
  private isSafariRuntime?: boolean

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

    // Attempt asynchronous runtime codec capability detection on client
    if (typeof window !== 'undefined') {
      // Detect Safari once (simple UA check) for scoring/filter adjustments
      try {
        this.isSafariRuntime = /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent)
      } catch { this.isSafariRuntime = false }
      // Defer to next tick to avoid blocking constructor
      setTimeout(() => {
        this.detectRuntimeCodecSupport().catch(err => {
          console.debug('Runtime codec capability detection skipped:', err)
        })
      }, 0)
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

  /** Fetch popular TV series (separate from popular movies) */
  async getPopularSeries(): Promise<StreamingSeries[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const popularResult = await this.tmdb.getPopularTVShows()
      const genres = await this.tmdb.getTVGenres()
      return popularResult.results.map(series =>
        this.convertToSeries(series as TMDBTVShow, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching popular series:', error)
      return []
    }
  }

  /** Fetch top rated TV series */
  async getTopRatedSeries(): Promise<StreamingSeries[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const topRatedResult = await this.tmdb.getTopRatedTVShows()
      const genres = await this.tmdb.getTVGenres()
      return topRatedResult.results.map(series =>
        this.convertToSeries(series as TMDBTVShow, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching top rated series:', error)
      return []
    }
  }

  /** Fetch currently airing TV series */
  async getOnTheAirSeries(): Promise<StreamingSeries[]> {
    if (!this.config.tmdbApiKey) {
      console.warn('TMDB API key not configured')
      return []
    }

    try {
      const onAirResult = await this.tmdb.getOnTheAirTVShows()
      const genres = await this.tmdb.getTVGenres()
      return onAirResult.results.map(series =>
        this.convertToSeries(series as TMDBTVShow, genres.genres)
      )
    } catch (error) {
      console.error('Error fetching on-the-air series:', error)
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
      const discoverResult = await this.tmdb.makeRequest<{ results: TMDBMovie[] }>('/discover/movie', {
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
      rating: tmdbSeries.vote_average,
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
  // Parse inline token after # (supports multiple tokens separated by '+', e.g. #safari+h264+1080p)
      let rawToken: string | undefined
      let tokens: string[] = []
      if (movieId.includes('#')) {
        const parts = movieId.split('#')
        movieId = parts[0]
        rawToken = parts[1]
        if (rawToken) tokens = rawToken.toLowerCase().split('+').filter(Boolean)
        // If a recognized quality appears among tokens and caller didn't provide preferredQuality, use it
        const qualityToken = tokens.find(t => /(4k|2160|1080|720|480|360)p?/.test(t))
        if (qualityToken && !preferredQuality) preferredQuality = qualityToken
      }
      console.log(`🎬 STREMIO MODE: Starting stream selection for ${movieId}${tokens.length ? ' (tokens '+tokens.join(',')+')' : ''}`)
  // Automatic safari detection (tokens can still force behavior, but runtime Safari always enabled)
  const safariRuntime = (this as any).isSafariRuntime === true
  const safariLike = safariRuntime || tokens.includes('safari')
      const h264Only = tokens.includes('h264') || tokens.includes('h264only')

      const filterSafariSources = <T extends { name: string }>(list: T[]): T[] => {
        if (!safariLike) return list
        const decisions: { kept: number; dropped: number; reasons: Record<string, number> } = { kept: 0, dropped: 0, reasons: {} }
        const filtered = list.filter(s => {
          const raw = s.name
          const n = raw.toLowerCase()
          const isMkv = /\.mkv\b|\bmkv\b/.test(n)
          const isRemux = /remux/.test(n)
          const unsupportedCodec = /(av1|vp9|vvc)/.test(n)
          if (unsupportedCodec) { decisions.dropped++; decisions.reasons['codec']=(decisions.reasons['codec']||0)+1; return false }
          if (isMkv) { decisions.dropped++; decisions.reasons['mkv']=(decisions.reasons['mkv']||0)+1; return false }
          if (isRemux) { decisions.dropped++; decisions.reasons['remux']=(decisions.reasons['remux']||0)+1; return false }
          // Allowed indicators
          const hasMp4 = /\.mp4\b/.test(n)
          const hasH264 = /(x264|h264|avc)/.test(n)
          const hasHevc = /(hevc|x265|h\.265)/.test(n)
          if (h264Only && !hasH264) { decisions.dropped++; decisions.reasons['force-h264']=(decisions.reasons['force-h264']||0)+1; return false }
          // Accept order: explicit mp4 + (h264|hevc) > h264 label > hevc label (if not forcing h264)
          const accept = (hasMp4 && (hasH264 || (!h264Only && hasHevc))) || hasH264 || (!h264Only && hasHevc)
          if (accept) { decisions.kept++; return true }
          decisions.dropped++; decisions.reasons['ambiguous']=(decisions.reasons['ambiguous']||0)+1; return false
        })
        console.log(`🧪 Safari filter pass: kept=${decisions.kept} dropped=${decisions.dropped} reasons=`, decisions.reasons)
        // Secondary preference pass: if we have any clear H.264 candidates, drop HEVC/x265 to reduce unsupported/decode errors on some Safari setups
        if (filtered.length) {
          const h264Preferred = filtered.filter(s => {
            const n = s.name.toLowerCase()
            return /(x264|h264)/.test(n) || (n.includes('.mp4') && !/(hevc|x265)/.test(n))
          })
          if (h264Preferred.length) {
            console.log(`🧪 Safari post-filter preferring H.264 set ${h264Preferred.length} of ${filtered.length}`)
            return h264Preferred
          }
        }
        if (filtered.length === 0) {
          console.log('⚠️ Safari filter eliminated all sources; falling back to original list length', list.length)
          return list
        }
        console.log(`🧪 Safari filtering reduced sources ${list.length} -> ${filtered.length}`)
        return filtered
      }

      // Series episode composite ID pattern: baseId:S<season>E<episode>
  const seriesMatch = movieId.match(/^(tmdb_tv_\d+|tt\d+|tmdb_\d+):S(\d+)E(\d+)$/i)
      if (seriesMatch) {
        const baseId = seriesMatch[1]
        const seasonNum = parseInt(seriesMatch[2], 10)
        const episodeNum = parseInt(seriesMatch[3], 10)
        const forcedQuality = seriesMatch[4] // optional quality override
        console.log(`📺 Detected series episode request ${baseId} S${seasonNum}E${episodeNum}`)

        // Attempt to resolve IMDB id if TMDB TV id
        let imdbId: string | undefined
        if (baseId.startsWith('tmdb_tv_')) {
          const tmdbNumeric = parseInt(baseId.replace('tmdb_tv_', ''), 10)
            try {
              const ext = await this.tmdb.getTVShowExternalIds(tmdbNumeric)
              if (ext.imdb_id) imdbId = ext.imdb_id
            } catch (e) {
              console.warn('Could not fetch TV external IDs', e)
            }
        } else if (baseId.startsWith('tt')) {
          imdbId = baseId
        }
        const searchId = imdbId || baseId.replace('tmdb_tv_', '').replace('tmdb_', '')
        try {
          const streams = await this.torrentio.getSeriesStreams(searchId, seasonNum, episodeNum)
          if (!streams || streams.length === 0) {
            console.log('❌ No series streams found')
            return null
          }
          const sources = streams.map(s => {
            const quality = this.inferQuality(s.name)
            const codecScore = this.computeCodecCompatibilityScore(s.name)
            const audioScore = this.getAudioCompatibilityScore(s.name)
            return {
              name: s.name,
              quality,
              size: '-',
              infoHash: s.infoHash,
              url: s.url,
              isReady: true,
              subtitles: s.subtitles,
              _score: this.weightedStreamScore({ quality, codecScore, audioScore })
            }
          })
          let sorted = sources.sort((a, b) => b._score - a._score)
          if (forcedQuality) {
            // Bring preferred quality to front while preserving relative order among equals
            sorted = sorted.sort((a, b) => {
              const aMatch = a.quality.toLowerCase() === forcedQuality.toLowerCase()
              const bMatch = b.quality.toLowerCase() === forcedQuality.toLowerCase()
              if (aMatch && !bMatch) return -1
              if (!aMatch && bMatch) return 1
              return 0
            })
          }
          sorted = filterSafariSources(sorted)
      for (const source of sorted) {
            const streamingUrl = await this.prepareStream(source)
            if (streamingUrl) {
              return {
                url: streamingUrl,
                subtitles: source.subtitles || [],
                source: { ...source },
                movieTitle: `${baseId} S${seasonNum}E${episodeNum}${forcedQuality ? ' ' + forcedQuality : ''}`
              }
            }
          }
          return null
        } catch (err) {
          console.error('Series episode streaming failed', err)
          return null
        }
      }

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

  let sources = await this.getMovieStreams(movieId)
  sources = filterSafariSources(sources)

      if (sources.length === 0) {
        console.log(`❌ No streams found for ${movieId}`)
        return null
      }

      console.log(`📊 Found ${sources.length} total streams, checking for Torrentio resolve URLs...`)

      // Apply unified weighted scoring (quality dominant) including Torrentio resolve URLs
      const scoringDetails: Array<{ src: StreamingSource; score: number; parts: { quality: number; codec: number; audio: number; readiness: number; preferred: number; seeders: number } }> = []
      for (const s of sources) {
        const baseQuality = this.getQualityScore(s.quality)
        const codecScore = this.computeCodecCompatibilityScore(s.name)
        const audioScore = this.getAudioCompatibilityScore(s.name)
        const readiness = s.isReady ? 0.3 : 0 // converted later into weighted addition
        const preferred = preferredQuality && s.quality.toLowerCase().includes(preferredQuality.toLowerCase()) ? 1 : 0
        const seedBoost = Math.min((s.seeders || 0) / 200, 0.4) // cap influence
        let composite: number
        if (safariLike) {
          // Safari priority: codec > quality > seeders (audio minor)
            composite = (codecScore * 120) + (baseQuality * 80) + (seedBoost * 60) + (audioScore * 5) + (readiness * 40) + (preferred * 150)
        } else {
          composite = this.weightedStreamScore({ quality: s.quality, codecScore, audioScore })
            + (readiness * 100) + (preferred * 200) + (seedBoost * 100)
        }
        scoringDetails.push({
          src: s,
          score: composite,
          parts: { quality: baseQuality, codec: codecScore, audio: audioScore, readiness: readiness * 100, preferred: preferred * 200, seeders: seedBoost * 100 }
        })
      }
      scoringDetails.sort((a, b) => b.score - a.score)
      console.log('🧮 Top 5 scored movie sources (unified weighting):')
      scoringDetails.slice(0, 5).forEach((d, i) => {
        console.log(`${i + 1}. Q=${d.src.quality} Name=${d.src.name.substring(0, 70)}... score=${d.score.toFixed(1)} parts`, d.parts)
      })

      for (const { src } of scoringDetails) {
        try {
          const streamingUrl = await this.prepareStream(src)
          if (streamingUrl) {
            // Fetch real subtitles from SubDL API
            let realSubtitles: ProcessedSubtitle[] = []
            try {
              realSubtitles = await fetchMovieSubtitles(
                movieMetadata?.title || src.name,
                movieMetadata?.year,
                movieMetadata?.imdbId,
                movieMetadata?.tmdbId,
                ['en', 'es', 'fr', 'de', 'it']
              )
            } catch (error) {
              console.warn('⚠️ Subtitle fetch failed (continuing):', error)
              realSubtitles = []
            }
            return {
              url: streamingUrl,
              subtitles: src.subtitles || [],
              realSubtitles,
              source: src
            }
          }
        } catch (err) {
          console.warn('⚠️ Scored movie source failed, trying next:', err instanceof Error ? err.message : err)
        }
      }

      console.log('❌ All scored movie sources failed to prepare stream')

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

      // Unified weighted scoring path
      const scored = sources.map(s => {
        const codecScore = this.computeCodecCompatibilityScore(s.name)
        const audioScore = this.getAudioCompatibilityScore(s.name)
        const readiness = s.isReady ? 0.3 : 0
        const preferred = preferredQuality && s.quality.toLowerCase().includes(preferredQuality.toLowerCase()) ? 1 : 0
        const seedBoost = Math.min((s.seeders || 0) / 200, 0.4)
        const composite = this.weightedStreamScore({ quality: s.quality, codecScore, audioScore })
          + readiness * 100 + preferred * 200 + seedBoost * 100
        return { s, composite }
      }).sort((a, b) => b.composite - a.composite)
      console.log('🧮 Top 5 scored movie sources (URL only path):')
      scored.slice(0, 5).forEach((d, i) => {
        console.log(`${i + 1}. Q=${d.s.quality} Name=${d.s.name.substring(0, 70)}... score=${d.composite.toFixed(1)}`)
      })
      for (const { s } of scored) {
        try {
          const streamingUrl = await this.prepareStream(s)
          if (streamingUrl) return streamingUrl
        } catch (err) {
          console.warn('⚠️ Scored movie URL source failed, trying next:', err instanceof Error ? err.message : err)
        }
      }
      console.log('❌ All scored movie URL sources failed, falling back to legacy fallback method...')

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
          facebook_id: (externalIds as any).facebook_id
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
    const scored = sources.map(s => {
      const codecScore = this.computeCodecCompatibilityScore(s.name)
      const audioScore = this.getAudioCompatibilityScore(s.name)
      const readiness = s.isReady ? 0.3 : 0
      const preferred = preferredQuality && s.quality.toLowerCase().includes(preferredQuality.toLowerCase()) ? 1 : 0
      const seedBoost = Math.min((s.seeders || 0) / 200, 0.4)
      const composite = this.weightedStreamScore({ quality: s.quality, codecScore, audioScore })
        + readiness * 100 + preferred * 200 + seedBoost * 100
      return { s, composite }
    }).sort((a, b) => b.composite - a.composite)
    console.log('🧮 sortSourcesByPriority top 5:')
    scored.slice(0, 5).forEach((d, i) => {
      console.log(`${i + 1}. Q=${d.s.quality} Name=${d.s.name.substring(0, 60)} score=${d.composite.toFixed(1)}`)
    })
    return scored.map(d => d.s)
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

  private runtimeCodecSupport?: { h264?: boolean; hevc?: boolean; vp9?: boolean; av1?: boolean }

  private computeCodecCompatibilityScore(name: string): number {
    const n = name.toLowerCase()
  let base = 5
  const safariRuntime = this.isSafariRuntime === true
  // Safari prefers efficient HEVC if hardware-supported; user requested h265 first then h264
  if (/(hevc|x265|h\.265)/.test(n)) base = safariRuntime ? 12 : 9
  else if (/(h\.264|x264|avc)/.test(n)) base = safariRuntime ? 11 : 10
  else if (/vp9/.test(n)) base = 6
  else if (/(av1)/.test(n)) base = 5
  else if (/(mpeg2|mpeg-2)/.test(n)) base = 3

    // Adjust with runtime capabilities if detected
    if (this.runtimeCodecSupport) {
  if (/(h\.264|x264|avc)/.test(n) && this.runtimeCodecSupport.h264 === false) base -= 4
  if (/(hevc|x265|h\.265)/.test(n) && this.runtimeCodecSupport.hevc === false) base -= 5
      if (/vp9/.test(n) && this.runtimeCodecSupport.vp9 === false) base -= 2
      if (/(av1)/.test(n) && this.runtimeCodecSupport.av1 === false) base -= 2
      // Small positive reinforcement for supported high-efficiency codecs
      if (/(hevc|x265|h\.265)/.test(n) && this.runtimeCodecSupport.hevc) base += 1
      if (/(av1)/.test(n) && this.runtimeCodecSupport.av1) base += 1
    }
    return base
  }

  private weightedStreamScore(params: { quality: string; codecScore: number; audioScore: number }): number {
    const qualityScore = this.getQualityScore(params.quality)
    return qualityScore * 100 + params.codecScore * 10 + params.audioScore
  }

  private inferQuality(name: string): string {
    const lower = (name || '').toLowerCase()
    if (/(2160|4k)/.test(lower)) return '2160p'
    if (/1080/.test(lower)) return '1080p'
    if (/720/.test(lower)) return '720p'
    if (/480/.test(lower)) return '480p'
    return 'SD'
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

  // Runtime codec capability detection (client-side only). Safe to call multiple times.
  async detectRuntimeCodecSupport(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.runtimeCodecSupport && Object.values(this.runtimeCodecSupport).some(v => v !== undefined)) return
    const nav: any = (typeof navigator !== 'undefined') ? navigator : null
    if (!nav || !('mediaCapabilities' in nav)) {
      this.runtimeCodecSupport = {}
      return
    }
    try {
      const mc: any = nav.mediaCapabilities
      const test = async (contentType: string): Promise<boolean> => {
        try {
          const config = { type: 'file', video: { contentType, width: 1920, height: 1080, bitrate: 8000000, framerate: 30 } }
          const result = await mc.decodingInfo(config)
          return !!result?.supported
        } catch { return false }
      }
      const [h264, hevc, vp9, av1] = await Promise.all([
        test('video/mp4; codecs="avc1.42E01E"'),
        test('video/mp4; codecs="hvc1.1.6.L93.B0"'),
        test('video/webm; codecs="vp9"'),
        test('video/mp4; codecs="av01.0.08M.08"')
      ])
      this.runtimeCodecSupport = { h264, hevc, vp9, av1 }
      console.log('🧪 Runtime codec support detected:', this.runtimeCodecSupport)
    } catch (err) {
      console.debug('MediaCapabilities detection failed:', err)
      this.runtimeCodecSupport = {}
    }
  }
}

// Helper function to create streaming service
export function createStreamingService(config: StreamingConfig): StreamingService {
  return new StreamingService(config)
}
