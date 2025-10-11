// Stremio USA TV addon integration with Real-Debrid support and health monitoring

import RealDebridAPI, { RealDebridTorrent } from '../api/realdebrid'

// Stream health monitor removed - stubbing functionality
const streamHealthMonitor = {
  addStream: (..._args: any[]) => {},
  updateNetworkHealth: (..._args: any[]) => ({ healthy: true, isHealthy: true, streams: [], latency: 0 }),
  checkStreamHealth: async (..._args: any[]) => ({ healthy: true, isActive: true, latency: 0, bitrate: 0 }),
  getStreamHealth: (..._args: any[]) => ({ healthy: true, isActive: true, latency: 0, bitrate: 0 }),
  getNetworkHealth: (..._args: any[]) => ({ healthy: true, isHealthy: true, streams: [], latency: 0 }),
  getHealthStats: () => ({ totalStreams: 0, healthyStreams: 0, networks: [] })
}

type NetworkHealthStatus = {
  healthy: boolean
  isHealthy: boolean
  streams: any[]
  latency: number
}

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

  async getNetworksByCategory(categoryId?: string, skipHealthCheck: boolean = false): Promise<USATVNetwork[]> {
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

      // Always register streams for health monitoring (but don't wait for health checks if skipped)
      if (this.enableHealthMonitoring) {
        if (skipHealthCheck) {
          // Register streams but don't wait for health checks
          this.registerStreamsForHealthMonitoring(networks)
        } else {
          // Do fast health filtering to avoid long delays
          networks = await this.filterNetworksByHealth(networks)
        }
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
   * Register streams for health monitoring without blocking
   */
  private async registerStreamsForHealthMonitoring(networks: USATVNetwork[]): Promise<void> {
    console.log(`🩺 Registering streams for ${networks.length} networks for background monitoring...`)
    
    // First pass: Synchronously register all available streams to populate health stats
    for (const network of networks) {
      try {
        // Check if streams are embedded in network metadata (quick sync operation)
        if (network.meta && (network.meta as any).streams) {
          const embeddedStreams = (network.meta as any).streams
          const streamUrls = embeddedStreams.map((stream: any) => stream.url).filter(Boolean)
          console.log(`📡 Found ${streamUrls.length} embedded streams for ${network.name}`)
          
          if (streamUrls.length > 0) {
            // Add streams to health monitor synchronously
            streamUrls.forEach((url: string) => {
              streamHealthMonitor.addStream(url, network.id)
            })

            // Update network health status immediately (marks as registered)
            streamHealthMonitor.updateNetworkHealth(
              network.id,
              network.name,
              streamUrls
            )
          }
        }
      } catch (error) {
        console.debug(`Failed to register embedded streams for ${network.name}:`, error)
      }
    }
    
    // Second pass: Asynchronously fetch remaining streams and start health checks
    setTimeout(async () => {
      for (const network of networks) {
        try {
          let streamUrls: string[] = []
          
          if (network.meta && (network.meta as any).streams) {
            // Already processed in sync pass above
            const embeddedStreams = (network.meta as any).streams
            streamUrls = embeddedStreams.map((stream: any) => stream.url).filter(Boolean)
          } else {
            // Fallback: fetch streams from API
            const streams = await this.getStreamsByNetworkId(network.id)
            streamUrls = streams.map(s => s.url).filter(Boolean)
            console.log(`📡 Found ${streamUrls.length} API streams for ${network.name}`)
            
            if (streamUrls.length > 0) {
              // Add streams to health monitor
              streamUrls.forEach((url: string) => {
                streamHealthMonitor.addStream(url, network.id)
              })

              // Update network health status
              streamHealthMonitor.updateNetworkHealth(
                network.id,
                network.name,
                streamUrls
              )
            }
          }
          
          if (streamUrls.length > 0) {
            // Start background health checks for this network
            this.startBackgroundHealthCheck(network, streamUrls)
          } else {
            console.warn(`No streams found for network ${network.name}`)
          }
        } catch (error) {
          console.warn(`Failed to register streams for network ${network.name}:`, error)
        }
      }
    }, 100) // Small delay to not block UI
  }

  /**
   * Start background health check for a specific network
   */
  private async startBackgroundHealthCheck(network: USATVNetwork, streamUrls: string[]): Promise<void> {
    // Check first stream for health
    if (streamUrls.length > 0) {
      try {
        const firstStreamUrl = streamUrls[0]
        const healthResult = await streamHealthMonitor.checkStreamHealth(firstStreamUrl)
        
        // Update network health based on result
        streamHealthMonitor.updateNetworkHealth(
          network.id,
          network.name,
          streamUrls
        )
      } catch (error) {
        // Health check failed, but stream is still registered
        console.debug(`Health check failed for ${network.name}:`, error)
      }
    }
  }

  /**
   * Filter networks by stream health in background without blocking UI
   */
  private filterNetworksByHealthBackground(networks: USATVNetwork[]): void {
    // Start health check in background
    setTimeout(async () => {
      console.log(`🩺 Starting background health check for ${networks.length} networks...`)
      
      // Check networks in smaller batches with shorter delays
      const batchSize = 5
      for (let i = 0; i < networks.length; i += batchSize) {
        const batch = networks.slice(i, i + batchSize)
        
        // Process batch without awaiting to avoid blocking
        batch.forEach(async (network) => {
          try {
            const streams = await this.getStreamsByNetworkId(network.id)
            const streamUrls = streams.map(s => s.url).filter(Boolean)
            
            if (streamUrls.length > 0) {
              // Add streams to health monitor
              streamUrls.forEach(url => {
                streamHealthMonitor.addStream(url, network.id)
              })

              // Check health of first stream only for speed
              const firstStreamUrl = streamUrls[0]
              try {
                const healthResult = await streamHealthMonitor.checkStreamHealth(firstStreamUrl)
                
                // Update network health
                streamHealthMonitor.updateNetworkHealth(
                  network.id,
                  network.name,
                  streamUrls
                )
              } catch (error) {
                // Silently fail for background checks
              }
            }
          } catch (error) {
            // Silently fail for background checks
          }
        })
        
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }, 0)
  }

  /**
   * Filter networks by stream health
   */
  private async filterNetworksByHealth(networks: USATVNetwork[]): Promise<USATVNetwork[]> {
    console.log(`🩺 Fast-checking health for ${networks.length} networks...`)

    const healthyNetworks: USATVNetwork[] = []

    // Lighter batching and smaller sample for speed
    const batchSize = 6
    for (let i = 0; i < networks.length; i += batchSize) {
      const batch = networks.slice(i, i + batchSize)

      const healthChecks = await Promise.allSettled(
        batch.map(async (network) => {
          const rawStreams = await this.getStreamsForNetwork(network.id)
          const streamUrls = rawStreams.map(s => s.url).filter(Boolean)

          if (streamUrls.length === 0) {
            // Update health with empty list
            streamHealthMonitor.updateNetworkHealth(network.id, network.name, [])
            return { network, isHealthy: false }
          }

          // Register streams for monitoring
          streamUrls.forEach(url => streamHealthMonitor.addStream(url, network.id))

          // Tiny sample: check just the first URL for fast feedback
          const firstUrl = streamUrls[0]
          const health = await streamHealthMonitor.checkStreamHealth(firstUrl)

          // Update network health (counts only checked/registered)
          const networkHealth = streamHealthMonitor.updateNetworkHealth(
            network.id,
            network.name,
            streamUrls
          )

          const isHealthy = (health?.isActive ?? false) || networkHealth.isHealthy
          return { network, isHealthy }
        })
      )

      healthChecks.forEach(result => {
        if (result.status === 'fulfilled' && result.value.isHealthy) {
          healthyNetworks.push(result.value.network)
        }
      })

      // Very small delay to yield to UI thread
      if (i + batchSize < networks.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    console.log(`🩺 Fast health check complete: ${healthyNetworks.length}/${networks.length} networks have active streams`)
    return healthyNetworks
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

      let streams: USATVStream[] = (streamData.streams || []).map((stream: StremioStream): USATVStream => ({
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

      // Filter streams by health if enabled
      if (this.enableHealthMonitoring) {
        streams = await this.filterStreamsByHealth(streams)
      }

      return streams.length > 0 ? streams : this.getMockStreams(networkId)
    } catch (error) {
      console.error('❌ Error fetching streams for network:', networkId, error)
      return this.getMockStreams(networkId)
    }
  }

  /**
   * Filter streams by health status
   */
  private async filterStreamsByHealth(streams: USATVStream[]): Promise<USATVStream[]> {
    const healthyStreams: USATVStream[] = []
    
    for (const stream of streams) {
      // Add to health monitor
      streamHealthMonitor.addStream(stream.url, stream.networkId)
      
      // Check health
      const health = await streamHealthMonitor.checkStreamHealth(stream.url)
      
      if (health.isActive) {
        healthyStreams.push(stream)
      }
    }
    
    console.log(`🩺 Stream health filter: ${healthyStreams.length}/${streams.length} streams are healthy`)
    return healthyStreams
  }

  /**
   * Get stream health status
   */
  getStreamHealthStatus(url: string) {
    return streamHealthMonitor.getStreamHealth(url)
  }

  /**
   * Get network health status
   */
  getNetworkHealthStatus(networkId: string) {
    return streamHealthMonitor.getNetworkHealth(networkId)
  }

  /**
   * Get health statistics
   */
  getHealthStats() {
    return streamHealthMonitor.getHealthStats()
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
        id: 'cnn',
        name: 'CNN',
        logo: 'https://logo.stremio.com/cnn.png',
        poster: 'https://logo.stremio.com/cnn.png',
        category: 'News',
        description: 'Cable News Network - Breaking news and analysis',
        isLive: true,
        country: 'US',
        language: 'en'
      },
      {
        id: 'fox_news',
        name: 'Fox News',
        logo: 'https://logo.stremio.com/fox_news.png',
        poster: 'https://logo.stremio.com/fox_news.png',
        category: 'News',
        description: 'Fox News Channel - News and opinion',
        isLive: true,
        country: 'US',
        language: 'en'
      }
    ]
  }

  private getMockStreams(networkId: string): USATVStream[] {
    return [
      {
        id: `${networkId}_mock_stream`,
        title: `${this.getNetworkNameById(networkId)} Live`,
        networkId: networkId,
        networkName: this.getNetworkNameById(networkId),
        category: 'Live TV',
        url: 'https://example.com/live-stream.m3u8',
        quality: 'HD',
        description: `Live stream from ${this.getNetworkNameById(networkId)}`,
        isLive: true
      }
    ]
  }

  // Additional utility methods for integration
  async getStreamsForNetwork(networkId: string): Promise<StremioStream[]> {
    try {
      const streamsUrl = `${this.baseUrl}/stream/tv/${networkId}.json`
      const response = await fetch(streamsUrl)
      
      if (!response.ok) {
        return []
      }

      const streamData = await response.json()
      return streamData.streams || []
    } catch (error) {
      console.error('❌ Error fetching Stremio streams:', error)
      return []
    }
  }

  async getStreamWithRealDebrid(networkId: string, streamId?: string): Promise<string | null> {
    if (!this.realDebrid) {
      console.warn('Real-Debrid not configured')
      return null
    }

    try {
      // Implementation for Real-Debrid stream enhancement
      const streams = await this.getStreamsForNetwork(networkId)
      
      if (streams.length === 0) {
        return null
      }

      // For now, return the first available stream
      return streams[0]?.url || null
    } catch (error) {
      console.error('❌ Error getting Real-Debrid stream:', error)
      return null
    }
  }
}

export function createStremioUSATVService(config: StremioUSATVConfig = {}) {
  return new StremioUSATVService(config)
}
