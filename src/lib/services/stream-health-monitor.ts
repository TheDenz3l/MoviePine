// Stream health monitoring and dynamic filtering system

export interface StreamHealthStatus {
  url: string
  isActive: boolean
  lastChecked: number
  responseTime?: number
  error?: string
  consecutiveFailures: number
}

export interface NetworkHealthStatus {
  networkId: string
  networkName: string
  activeStreams: number
  totalStreams: number
  isHealthy: boolean
  lastUpdated: number
}

export class StreamHealthMonitor {
  private streamHealth = new Map<string, StreamHealthStatus>()
  private networkHealth = new Map<string, NetworkHealthStatus>()
  private checkInterval: NodeJS.Timeout | null = null
  private readonly MAX_CONSECUTIVE_FAILURES = 3
  private readonly CHECK_INTERVAL = 60000 // 1 minute
  private readonly TIMEOUT_MS = 5000 // 5 seconds (reduced for faster checks)

  constructor() {
    this.startHealthChecking()
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.CHECK_INTERVAL)

    console.log('🩺 Stream health monitoring started')
  }

  /**
   * Stop health checking
   */
  public stopHealthChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    console.log('🩺 Stream health monitoring stopped')
  }

  /**
   * Add a stream to monitor
   */
  public addStream(url: string, networkId: string): void {
    if (!this.streamHealth.has(url)) {
      this.streamHealth.set(url, {
        url,
        isActive: true, // Assume active until proven otherwise
        lastChecked: 0,
        consecutiveFailures: 0
      })
      console.log(`🩺 Added stream to monitor: ${url}`)
    }
  }

  /**
   * Remove a stream from monitoring
   */
  public removeStream(url: string): void {
    this.streamHealth.delete(url)
    console.log(`🩺 Removed stream from monitor: ${url}`)
  }

  /**
   * Check if a specific stream is healthy
   */
  public async checkStreamHealth(url: string): Promise<StreamHealthStatus> {
    const startTime = Date.now()
    
    try {
      // For M3U8 streams, check the playlist
      if (url.includes('.m3u8')) {
        const response = await this.fetchWithTimeout(url, this.TIMEOUT_MS)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const content = await response.text()
        
        // Basic M3U8 validation
        if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-VERSION')) {
          throw new Error('Invalid M3U8 format')
        }

        // Check if playlist has segments
        const hasSegments = content.includes('#EXTINF') || content.includes('.ts') || content.includes('.m4s')
        
        if (!hasSegments) {
          throw new Error('M3U8 playlist has no segments')
        }

        const responseTime = Date.now() - startTime
        const status: StreamHealthStatus = {
          url,
          isActive: true,
          lastChecked: Date.now(),
          responseTime,
          consecutiveFailures: 0
        }

        this.streamHealth.set(url, status)
        return status

      } else {
        // For other streams, do a HEAD request
        const response = await this.fetchWithTimeout(url, this.TIMEOUT_MS, { method: 'HEAD' })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseTime = Date.now() - startTime
        const status: StreamHealthStatus = {
          url,
          isActive: true,
          lastChecked: Date.now(),
          responseTime,
          consecutiveFailures: 0
        }

        this.streamHealth.set(url, status)
        return status
      }

    } catch (error) {
      const existingStatus = this.streamHealth.get(url)
      const consecutiveFailures = (existingStatus?.consecutiveFailures || 0) + 1
      
      const status: StreamHealthStatus = {
        url,
        isActive: consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
        consecutiveFailures
      }

      this.streamHealth.set(url, status)
      console.warn(`🩺 Stream health check failed for ${url}:`, error)
      
      return status
    }
  }

  /**
   * Get current health status for a stream
   */
  public getStreamHealth(url: string): StreamHealthStatus | null {
    return this.streamHealth.get(url) || null
  }

  /**
   * Get all healthy streams
   */
  public getHealthyStreams(): string[] {
    return Array.from(this.streamHealth.entries())
      .filter(([_, status]) => status.isActive)
      .map(([url, _]) => url)
  }

  /**
   * Get all unhealthy streams
   */
  public getUnhealthyStreams(): string[] {
    return Array.from(this.streamHealth.entries())
      .filter(([_, status]) => !status.isActive)
      .map(([url, _]) => url)
  }

  /**
   * Update network health based on stream health
   */
  public updateNetworkHealth(networkId: string, networkName: string, streamUrls: string[]): NetworkHealthStatus {
    const activeStreams = streamUrls.filter(url => {
      const health = this.streamHealth.get(url)
      return health?.isActive ?? true // Assume active until proven otherwise (consistent with addStream)
    }).length

    const registeredStreams = streamUrls.filter(url => {
      return this.streamHealth.has(url)
    }).length

    const status: NetworkHealthStatus = {
      networkId,
      networkName,
      activeStreams,
      totalStreams: streamUrls.length,
      isHealthy: activeStreams > 0,
      lastUpdated: Date.now()
    }

    this.networkHealth.set(networkId, status)
    
    // Debug logging
    console.log(`🩺 Updated network health for ${networkName}: ${activeStreams}/${streamUrls.length} active (${registeredStreams} registered)`)
    
    return status
  }

  /**
   * Get network health status
   */
  public getNetworkHealth(networkId: string): NetworkHealthStatus | null {
    return this.networkHealth.get(networkId) || null
  }

  /**
   * Get all healthy networks
   */
  public getHealthyNetworks(): NetworkHealthStatus[] {
    return Array.from(this.networkHealth.values())
      .filter(status => status.isHealthy)
  }

  /**
   * Perform health checks on all monitored streams
   */
  private async performHealthChecks(): Promise<void> {
    const streams = Array.from(this.streamHealth.keys())
    
    if (streams.length === 0) {
      return
    }

    console.log(`🩺 Performing health checks on ${streams.length} streams...`)

    // Check streams in batches to avoid overwhelming the network
    const batchSize = 5
    for (let i = 0; i < streams.length; i += batchSize) {
      const batch = streams.slice(i, i + batchSize)
      
      await Promise.allSettled(
        batch.map(url => this.checkStreamHealth(url))
      )

      // Small delay between batches
      if (i + batchSize < streams.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const healthyCount = this.getHealthyStreams().length
    const totalCount = streams.length
    
    console.log(`🩺 Health check complete: ${healthyCount}/${totalCount} streams healthy`)
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, timeout: number, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          ...options.headers
        }
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Get health statistics
   */
  public getHealthStats(): {
    totalStreams: number
    healthyStreams: number
    unhealthyStreams: number
    totalNetworks: number
    healthyNetworks: number
    lastUpdated: number
  } {
    const totalStreams = this.streamHealth.size
    const healthyStreams = this.getHealthyStreams().length
    const healthyNetworks = this.getHealthyNetworks().length
    
    // Debug logging
    console.log('🩺 Health Stats Debug:', {
      totalStreams,
      healthyStreams,
      totalNetworks: this.networkHealth.size,
      healthyNetworks,
      streamHealthSize: this.streamHealth.size,
      networkHealthSize: this.networkHealth.size,
      sampleStreams: Array.from(this.streamHealth.entries()).slice(0, 3),
      sampleNetworks: Array.from(this.networkHealth.values()).slice(0, 3)
    })
    
    return {
      totalStreams,
      healthyStreams,
      unhealthyStreams: totalStreams - healthyStreams,
      totalNetworks: this.networkHealth.size,
      healthyNetworks,
      lastUpdated: Date.now()
    }
  }

  /**
   * Clear all health data
   */
  public clearAllHealth(): void {
    this.streamHealth.clear()
    this.networkHealth.clear()
    console.log('🩺 All health data cleared')
  }
}

// Singleton instance
export const streamHealthMonitor = new StreamHealthMonitor()
