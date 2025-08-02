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

  // Streaming methods
  async getMovieStreams(movieId: string): Promise<StreamingSource[]> {
    try {
      let imdbId = movieId
      
      // If it's a TMDB ID, get the IMDB ID
      if (movieId.startsWith('tmdb_')) {
        const tmdbId = parseInt(movieId.replace('tmdb_', ''))
        const externalIds = await this.tmdb.getMovieExternalIds(tmdbId)
        imdbId = externalIds.imdb_id || movieId
      }

      // Get streams from Torrentio
      const allStreams = await this.torrentio.getMovieStreams(imdbId)

      // Filter for high quality streams only (4K, 2160p, 1080p)
      const highQualityStreams = this.torrentio.getHighQualityStreams(allStreams)

      // Convert to StreamingSource format
      const streamingSources: StreamingSource[] = []

      for (const stream of highQualityStreams) {
        const quality = this.torrentio.parseStreamQuality(stream.title)

        // Skip if not high quality (additional safety check)
        if (!quality.isHighQuality) continue

        // Debug: Log stream data to check info hash
        console.log(`🔍 Processing stream: ${stream.title}`)
        console.log(`📊 Info Hash: ${stream.infoHash}`)
        console.log(`🔗 URL: ${stream.url}`)
        console.log(`📁 File Index: ${stream.fileIdx}`)

        // Validate info hash
        if (!stream.infoHash || stream.infoHash.length !== 40) {
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

          // Create magnet link from info hash
          const magnetLink = `magnet:?xt=urn:btih:${source.infoHash}&dn=${encodeURIComponent(source.name)}`
          console.log(`⏳ Waiting for torrent to be ready...`)

          const torrent = await this.realdebrid.addTorrentAndWait(magnetLink)
          console.log(`✅ Torrent ready, getting streaming URL...`)

          const streamingUrl = await this.realdebrid.getStreamingUrl(torrent)
          console.log(`🎬 Streaming URL obtained: ${streamingUrl?.substring(0, 50)}...`)

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
      const sources = await this.getMovieStreams(movieId)

      if (sources.length === 0) {
        return null
      }

      // Prioritize highest quality with most seeders: 4K > 2160p > 1080p
      const qualityPriority = ['4K', '2160p', '1080p']

      let selectedSource: StreamingSource | undefined

      // If preferred quality is specified, try to find it first (with highest seeders)
      if (preferredQuality) {
        const preferredSources = sources.filter(s =>
          s.quality.toLowerCase().includes(preferredQuality.toLowerCase()) && s.isReady
        )
        if (preferredSources.length > 0) {
          // Sort by seeders within preferred quality
          selectedSource = preferredSources.sort((a, b) => (b.seeders || 0) - (a.seeders || 0))[0]
        }
      }

      // If no preferred quality match, use priority order with seeder sorting
      if (!selectedSource) {
        for (const quality of qualityPriority) {
          const qualitySources = sources.filter(s =>
            s.quality.toLowerCase().includes(quality.toLowerCase()) && s.isReady
          )
          if (qualitySources.length > 0) {
            // Sort by seeders within this quality tier
            selectedSource = qualitySources.sort((a, b) => (b.seeders || 0) - (a.seeders || 0))[0]
            break
          }
        }
      }

      // If no ready sources, try to prepare the highest quality one with most seeders
      if (!selectedSource) {
        for (const quality of qualityPriority) {
          const qualitySources = sources.filter(s =>
            s.quality.toLowerCase().includes(quality.toLowerCase())
          )
          if (qualitySources.length > 0) {
            // Sort by seeders within this quality tier
            selectedSource = qualitySources.sort((a, b) => (b.seeders || 0) - (a.seeders || 0))[0]
            break
          }
        }
      }

      // Fallback to source with most seeders
      if (!selectedSource && sources.length > 0) {
        selectedSource = sources.sort((a, b) => (b.seeders || 0) - (a.seeders || 0))[0]
      }

      return await this.prepareStream(selectedSource)

    } catch (error) {
      console.error('Error getting streaming URL:', error)
      return null
    }
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
