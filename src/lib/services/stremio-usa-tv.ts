// Stremio USA TV addon integration with Real-Debrid support

import RealDebridAPI, { RealDebridTorrent } from '../api/realdebrid'
import { streamHealthMonitor, NetworkHealthStatus } from './stream-health-monitor'

export interface StremioManifest {
  id: string
  version: string
  name: string
  description: string
  resources: string[]
  types: string[]
  catalogs: StremioCategory[]
  idPrefixes?: string[]
}

export interface StremioCategory {
  type: string
  id: string
  name: string
  extra?: StremioExtra[]
}

export interface StremioExtra {
  name: string
  options?: string[]
  isRequired?: boolean
}

export interface StremioMeta {
  id: string
  type: string
  name: string
  poster?: string
  posterShape?: string
  background?: string
  logo?: string
  description?: string
  releaseInfo?: string
  imdbRating?: number
  genres?: string[]
  runtime?: string
  country?: string
  language?: string
  year?: string
  videos?: StremioVideo[]
  behaviorHints?: {
    defaultVideoId?: string
  }
}

export interface StremioVideo {
  id: string
  title: string
  thumbnail?: string
  streams?: StremioStream[]
}

export interface StremioStream {
  url: string
  title?: string
  name?: string
  description?: string
  quality?: string
  infoHash?: string
  behaviorHints?: {
    notWebReady?: boolean
    bingeGroup?: string
    countryWhitelist?: string[]
  }
}

export interface USATVNetwork {
  id: string
  name: string
  logo?: string
  poster?: string
  category: string
  description: string
  isLive: boolean
  country: string
  language: string
  streamUrl?: string
  realDebridUrl?: string
  meta?: StremioMeta
}

export interface USATVStream {
  id: string
  title: string
  networkId: string
  networkName: string
  category: string
  url: string
  quality?: string
  description?: string
  isLive: boolean
  thumbnail?: string
  infoHash?: string
  realDebridUrl?: string
}

export interface StremioUSATVConfig {
  realDebridApiKey?: string
  useCache?: boolean
  cacheTimeout?: number
  enableHealthMonitoring?: boolean
}

export class StremioUSATVService {
  private baseUrl = 'https://848b3516657c-usatv.baby-beamup.club'
  private manifest: StremioManifest | null = null
  private realDebrid?: RealDebridAPI
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheTimeout: number
  private enableHealthMonitoring: boolean

  constructor(config: StremioUSATVConfig = {}) {
    this.cacheTimeout = config.cacheTimeout || 300000 // 5 minutes default
    this.enableHealthMonitoring = config.enableHealthMonitoring ?? true
    this.loadManifest()

    // Initialize Real-Debrid if API key provided
    if (config.realDebridApiKey) {
      this.realDebrid = new RealDebridAPI(config.realDebridApiKey)
      console.log('🎯 StremioUSATVService initialized with Real-Debrid support')
      
      // Test connection in background
      this.realDebrid.testConnection().catch(error => {
        console.warn('⚠️ Real-Debrid connection test failed:', error)
      })
    } else {
      console.warn('⚠️ StremioUSATVService initialized without Real-Debrid - streams may not work')
    }

    if (this.enableHealthMonitoring) {
      console.log('🩺 Health monitoring enabled for live TV streams')
    }
  }

  private async loadManifest(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/manifest.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`)
      }
      this.manifest = await response.json()
      console.log('🔴 USA TV Manifest loaded:', this.manifest)
    } catch (error) {
      console.error('❌ Failed to load USA TV manifest:', error)
    }
  }

  async getManifest(): Promise<StremioManifest | null> {
    if (!this.manifest) {
      await this.loadManifest()
    }
    return this.manifest
  }

  async getCategories(): Promise<StremioCategory[]> {
    const manifest = await this.getManifest()
    return manifest?.catalogs || []
  }

  async getNetworksByCategory(categoryId?: string): Promise<USATVNetwork[]> {
    try {
      const manifest = await this.getManifest()
      if (!manifest) return []

      // Find the appropriate catalog
      const catalog = categoryId 
        ? manifest.catalogs.find(cat => cat.id === categoryId)
        : manifest.catalogs.find(cat => cat.type === 'tv' || cat.type === 'channel')

      if (!catalog) {
        console.warn('No suitable catalog found, using default catalog')
        return this.getMockNetworks()
      }

      // Fetch the catalog content
      const catalogUrl = `${this.baseUrl}/catalog/${catalog.type}/${catalog.id}.json`
      console.log('🔍 Fetching catalog from:', catalogUrl)
      
      const response = await fetch(catalogUrl)
      if (!response.ok) {
        console.warn(`Catalog fetch failed: ${response.status}, using fallback`)
        return this.getMockNetworks()
      }

      const catalogData = await response.json()
      console.log('📺 Catalog data:', catalogData)

      // Transform Stremio meta objects to USATVNetwork format
      let networks: USATVNetwork[] = (catalogData.metas || []).map((meta: any): USATVNetwork => ({
        id: meta.id,
        name: meta.name,
        logo: meta.logo || meta.poster,
        poster: meta.poster,
        category: this.inferCategory(meta),
        description: meta.description || `${meta.name} - Live TV Channel`,
        isLive: true,
        country: meta.country || 'US',
        language: meta.language || 'en',
        meta: meta
      }))

      // If health monitoring is enabled, filter networks by stream health
      if (this.enableHealthMonitoring) {
        networks = await this.filterNetworksByHealth(networks)
      }

      return networks.length > 0 ? networks : this.getMockNetworks()
    } catch (error) {
      console.error('❌ Error fetching networks:', error)
      return this.getMockNetworks()
    }
  }

  /**
   * Get only networks that have healthy/active streams
   */
  async getHealthyNetworksByCategory(categoryId?: string): Promise<USATVNetwork[]> {
    const originalSetting = this.enableHealthMonitoring
    this.enableHealthMonitoring = true
    
    try {
      const networks = await this.getNetworksByCategory(categoryId)
      return networks
    } finally {
      this.enableHealthMonitoring = originalSetting
    }
  }

  /**
   * Filter networks by stream health
   */
  private async filterNetworksByHealth(networks: USATVNetwork[]): Promise<USATVNetwork[]> {
    console.log(`🩺 Checking health for ${networks.length} networks...`)
    
    const healthyNetworks: USATVNetwork[] = []
    
    // Check networks in batches to avoid overwhelming the system
    const batchSize = 3
    for (let i = 0; i < networks.length; i += batchSize) {
      const batch = networks.slice(i, i + batchSize)
      
      const healthChecks = await Promise.allSettled(
        batch.map(async (network) => {
          const streams = await this.getStreamsByNetworkId(network.id)
          const streamUrls = streams.map(s => s.url).filter(Boolean)
          
          if (streamUrls.length === 0) {
            return { network, isHealthy: false }
          }

          // Add streams to health monitor
          streamUrls.forEach(url => {
            streamHealthMonitor.addStream(url, network.id)
          })

          // Check health of first few streams (sample check)
          const sampleSize = Math.min(streamUrls.length, 2)
          const sampleUrls = streamUrls.slice(0, sampleSize)
          
          const healthResults = await Promise.allSettled(
            sampleUrls.map(url => streamHealthMonitor.checkStreamHealth(url))
          )

          const healthyStreams = healthResults
            .filter(result => result.status === 'fulfilled' && result.value.isActive)
            .length

          // Update network health
          const networkHealth = streamHealthMonitor.updateNetworkHealth(
            network.id,
            network.name,
            streamUrls
          )

          return {
            network,
            isHealthy: networkHealth.isHealthy && healthyStreams > 0
          }
        })
      )

      // Add healthy networks to results
      healthChecks.forEach(result => {
        if (result.status === 'fulfilled' && result.value.isHealthy) {
          healthyNetworks.push(result.value.network)
        }
      })

      // Small delay between batches
      if (i + batchSize < networks.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`🩺 Health check complete: ${healthyNetworks.length}/${networks.length} networks have active streams`)
    return healthyNetworks
  }
        description: meta.description || `${meta.name} - Live TV Channel`,
        isLive: true,
        country: meta.country || 'US',
        language: meta.language || 'en',
        meta: meta
      }))

      return networks.length > 0 ? networks : this.getMockNetworks()
    } catch (error) {
      console.error('❌ Error fetching networks:', error)
      return this.getMockNetworks()
    }
  }

  async getStreamsByNetworkId(networkId: string): Promise<USATVStream[]> {
    try {
      const streamsUrl = `${this.baseUrl}/stream/tv/${networkId}.json`
      console.log('🎯 Fetching streams from:', streamsUrl)
      
      const response = await fetch(streamsUrl)
      if (!response.ok) {
        console.warn(`Streams fetch failed: ${response.status}`)
        return this.getMockStreams(networkId)
      }

      const streamData = await response.json()
      console.log('🎬 Stream data:', streamData)

      const streams: USATVStream[] = (streamData.streams || []).map((stream: StremioStream): USATVStream => ({
        id: `${networkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: stream.title || stream.name || 'Live Stream',
        networkId: networkId,
        networkName: this.getNetworkNameById(networkId),
        category: 'Live TV',
        url: stream.url,
        quality: stream.quality || 'HD',
        description: stream.description || `Live stream from ${this.getNetworkNameById(networkId)}`,
        isLive: true,
        thumbnail: undefined
      }))

      return streams.length > 0 ? streams : this.getMockStreams(networkId)
    } catch (error) {
      console.error('❌ Error fetching streams for network:', networkId, error)
      return this.getMockStreams(networkId)
    }
  }

  async getMetaById(id: string): Promise<StremioMeta | null> {
    try {
      const metaUrl = `${this.baseUrl}/meta/tv/${id}.json`
      const response = await fetch(metaUrl)
      if (!response.ok) return null
      
      const metaData = await response.json()
      return metaData.meta || null
    } catch (error) {
      console.error('❌ Error fetching meta:', error)
      return null
    }
  }

  private inferCategory(meta: any): string {
    const name = meta.name.toLowerCase()
    const description = (meta.description || '').toLowerCase()
    const genres = (meta.genres || []).join(' ').toLowerCase()
    const genre = (meta.genre || '').toLowerCase()
    
    // Check the genre field first (this is what the API actually uses)
    if (genre.includes('news') || name.includes('news') || name.includes('cnn') || name.includes('fox news') || name.includes('msnbc')) {
      return 'News'
    }
    if (genre.includes('sport') || name.includes('espn') || name.includes('sport') || genres.includes('sport')) {
      return 'Sports'
    }
    if (genre.includes('documentar') || name.includes('discovery') || name.includes('national geographic') || name.includes('history') || genres.includes('documentary')) {
      return 'Documentary'
    }
    if (genre.includes('kids') || name.includes('kids') || name.includes('cartoon') || name.includes('nick') || genres.includes('kids')) {
      return 'Kids'
    }
    if (genre.includes('premium')) {
      return 'Premium'
    }
    if (genre.includes('lifestyle')) {
      return 'Lifestyle'
    }
    if (genre.includes('music')) {
      return 'Music'
    }
    if (genre.includes('latino')) {
      return 'Latino'
    }
    if (genre.includes('local')) {
      return 'Local'
    }
    return 'Entertainment'
  }

  private getNetworkNameById(networkId: string): string {
    // This would ideally come from cached network data
    // For now, extract from the ID or use a fallback
    return networkId.split('_')[0].toUpperCase() || 'Unknown Network'
  }

  private getMockNetworks(): USATVNetwork[] {
    return [
      {
        id: 'abc_news_live',
        name: 'ABC News Live',
        category: 'News',
        description: 'ABC News Live - Breaking news and live coverage',
        isLive: true,
        country: 'US',
        language: 'en'
      },
      {
        id: 'cbs_news',
        name: 'CBS News',
        category: 'News', 
        description: 'CBS News - Latest news and analysis',
        isLive: true,
        country: 'US',
        language: 'en'
      },
      {
        id: 'nbc_news_now',
        name: 'NBC News NOW',
        category: 'News',
        description: 'NBC News NOW - Live breaking news',
        isLive: true,
        country: 'US',
        language: 'en'
      },
      {
        id: 'fox_news',
        name: 'Fox News',
        category: 'News',
        description: 'Fox News Channel - News and commentary',
        isLive: true,
        country: 'US',
        language: 'en'
      },
      {
        id: 'cnn_live',
        name: 'CNN',
        category: 'News',
        description: 'CNN - Cable News Network',
        isLive: true,
        country: 'US',
        language: 'en'
      },
      {
        id: 'espn_live',
        name: 'ESPN',
        category: 'Sports',
        description: 'ESPN - Sports news and live events',
        isLive: true,
        country: 'US',
        language: 'en'
      }
    ]
  }

  private getMockStreams(networkId: string): USATVStream[] {
    const networkName = this.getNetworkNameById(networkId)
    return [
      {
        id: `${networkId}_main_stream`,
        title: `${networkName} Live`,
        networkId,
        networkName,
        category: 'Live TV',
        url: `#mock_stream_${networkId}`,
        quality: 'HD',
        description: `Live stream from ${networkName}`,
        isLive: true
      }
    ]
  }

  // Real-Debrid integration methods
  async getStreamWithRealDebrid(networkId: string, streamId?: string): Promise<USATVStream | null> {
    if (!this.realDebrid) {
      console.warn('⚠️ Real-Debrid not configured, cannot resolve streams')
      return null
    }

    try {
      console.log(`🔍 Getting Real-Debrid stream for network: ${networkId}`)

      // Get streams for the network from Stremio
      const stremioStreams = await this.getStreamsForNetwork(networkId)
      if (!stremioStreams.length) {
        console.warn(`No Stremio streams found for network: ${networkId}`)
        return null
      }

      // Use first available stream (live streams usually have one main stream)
      const stremioStream = stremioStreams[0]

      // Convert StremioStream to USATVStream format
      const usaTVStream: USATVStream = {
        id: streamId || `${networkId}_live`,
        title: stremioStream.title || `${networkId} Live`,
        networkId: networkId,
        networkName: stremioStream.name || networkId,
        category: 'Live TV',
        url: stremioStream.url,
        quality: stremioStream.quality || 'HD',
        description: stremioStream.description || `Live stream from ${networkId}`,
        isLive: true,
        infoHash: stremioStream.infoHash
      }

      // Check if stream has infoHash for torrent resolution
      if (stremioStream.infoHash) {
        return await this.resolveStreamWithTorrent(usaTVStream)
      }

      // Check if stream has direct URL that can be unrestricted
      if (stremioStream.url) {
        return await this.resolveStreamWithURL(usaTVStream)
      }

      console.warn('Stream has no resolvable source (no infoHash or URL)')
      return usaTVStream // Return basic stream info even if not resolvable

    } catch (error) {
      console.error('❌ Error getting Real-Debrid stream:', error)
      return null
    }
  }

  private async resolveStreamWithTorrent(stream: USATVStream): Promise<USATVStream | null> {
    if (!this.realDebrid || !stream.infoHash) return null

    try {
      console.log(`🧲 Resolving torrent stream: ${stream.infoHash}`)

      // Check if torrent already exists in Real-Debrid
      let torrent = await this.realDebrid.findTorrentByHash(stream.infoHash)
      
      if (!torrent) {
        console.log('⬇️ Adding torrent to Real-Debrid...')
        // Add torrent magnet link to Real-Debrid
        const magnetLink = `magnet:?xt=urn:btih:${stream.infoHash}`
        const addResult = await this.realDebrid.addMagnet(magnetLink)
        
        // Select all files for the torrent
        await this.realDebrid.selectFiles(addResult.id, 'all')
        
        // Fetch the full torrent info
        torrent = await this.realDebrid.getTorrent(addResult.id)
      }

      if (!torrent) {
        console.warn('Failed to add or find torrent in Real-Debrid')
        return null
      }

      // Wait for torrent to be ready
      if (!this.realDebrid.isReady(torrent)) {
        console.log('⏳ Torrent not ready yet, checking status...')
        // You might want to implement polling here
        return {
          ...stream,
          realDebridUrl: 'pending', // Indicate it's being processed
          description: stream.description + ' (Processing...)'
        }
      }

      // Get largest video file
      const videoFile = this.realDebrid.getLargestVideoFile(torrent)
      if (!videoFile) {
        console.warn('No video file found in torrent')
        return null
      }

      // Get download link for the file
      const fileLink = torrent.links[videoFile.id - 1] // File ID is 1-based
      if (!fileLink) {
        console.warn('No download link found for video file')
        return null
      }

      const unrestricted = await this.realDebrid.getDownloadLink(fileLink)
      
      return {
        ...stream,
        realDebridUrl: unrestricted.download,
        url: unrestricted.download,
        quality: this.inferQualityFromFileSize(videoFile.bytes),
        description: stream.description + ` (${this.formatFileSize(videoFile.bytes)})`
      }

    } catch (error) {
      console.error('❌ Error resolving torrent stream:', error)
      return null
    }
  }

  private async resolveStreamWithURL(stream: USATVStream): Promise<USATVStream | null> {
    if (!this.realDebrid || !stream.url) return stream

    try {
      console.log(`🔗 Attempting to unrestrict URL with Real-Debrid: ${stream.url}`)

      const unrestricted = await this.realDebrid.getDownloadLink(stream.url)
      
      console.log(`✅ Successfully unrestricted URL: ${unrestricted.download}`)
      
      return {
        ...stream,
        realDebridUrl: unrestricted.download,
        url: unrestricted.download,
        quality: stream.quality || 'HD',
        description: stream.description + ' (Real-Debrid Unrestricted)'
      }

    } catch (error: any) {
      // Check if this is an expected Real-Debrid limitation
      if (error.isExpectedError) {
        // Silent handling of expected limitations
        return {
          ...stream,
          description: stream.description + ' (Direct Stream)'
        }
      }
      
      // For unexpected errors, provide more detailed logging
      console.warn('⚠️ Unexpected Real-Debrid error:', error.message || error)
      
      // Return original stream with note about fallback
      return {
        ...stream,
        description: stream.description + ' (Direct Stream)'
      }
    }
  }

  private inferQualityFromFileSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb > 8) return '4K'
    if (gb > 4) return '1080p'
    if (gb > 2) return '720p'
    return 'SD'
  }

  private formatFileSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024)
    const mb = bytes / (1024 * 1024)
    
    if (gb >= 1) return `${gb.toFixed(1)}GB`
    return `${mb.toFixed(0)}MB`
  }

  // Get available streams for a network from Stremio
  async getStreamsForNetwork(networkId: string): Promise<StremioStream[]> {
    try {
      // First try to get streams from cached network data
      const networks = await this.getNetworksByCategory()
      const network = networks.find(n => n.id === networkId)
      
      if (network?.meta && (network.meta as any).streams) {
        console.log(`📡 Found embedded streams for ${networkId}:`, (network.meta as any).streams)
        return (network.meta as any).streams
      }

      // Fallback: Try to get meta for the network
      const metaUrl = `${this.baseUrl}/meta/tv/${networkId}.json`
      const metaResponse = await fetch(metaUrl)
      
      if (!metaResponse.ok) {
        console.warn(`Meta fetch failed for ${networkId}: ${metaResponse.status}`)
        return []
      }

      const metaData = await metaResponse.json()
      const meta = metaData.meta as StremioMeta

      if (!meta.videos || !meta.videos.length) {
        console.warn(`No videos found in meta for ${networkId}`)
        return []
      }

      // Get streams for the first video (live stream)
      const video = meta.videos[0]
      const streamUrl = `${this.baseUrl}/stream/tv/${networkId}:${video.id}.json`
      const streamResponse = await fetch(streamUrl)

      if (!streamResponse.ok) {
        console.warn(`Stream fetch failed for ${networkId}:${video.id}: ${streamResponse.status}`)
        return []
      }

      const streamData = await streamResponse.json()
      return streamData.streams || []

    } catch (error) {
      console.error(`Error fetching streams for network ${networkId}:`, error)
      return []
    }
  }
}

// Singleton instance with Real-Debrid configuration
export const createStremioUSATVService = (config: StremioUSATVConfig) => {
  return new StremioUSATVService(config)
}
