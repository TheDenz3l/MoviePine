// TV Garden-Powered Live TV Service
// Uses TV Garden (https://tv.garden/us) for reliable US-based channel streaming
// Maintains original network grid design with modern streaming backend

export interface TVGardenNetwork {
  id: string
  name: string
  logo?: string
  category: string
  description: string
  country: string
  language: string
  tvGardenSlug: string // The slug used in TV Garden URLs
  isActive: boolean
  isLive: boolean
}

export interface TVGardenStream {
  id: string
  networkId: string
  networkName: string
  title: string
  url: string
  quality: string
  isLive: boolean
  isActive: boolean
}

// US-based TV networks with TV Garden integration
const TV_GARDEN_NETWORKS: TVGardenNetwork[] = [
  // Major US News Networks
  {
    id: 'cbs_news',
    name: 'CBS News',
    category: 'News',
    description: 'Breaking news and live coverage from CBS',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'cbs-news',
    isActive: true,
    isLive: true
  },
  {
    id: 'abc_news',
    name: 'ABC News Live',
    category: 'News', 
    description: 'ABC News live stream coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'abc-news',
    isActive: true,
    isLive: true
  },
  {
    id: 'fox_news',
    name: 'Fox News',
    category: 'News',
    description: 'Fox News Channel live stream',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'fox-news',
    isActive: true,
    isLive: true
  },
  {
    id: 'cnn',
    name: 'CNN',
    category: 'News',
    description: 'CNN live news coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'cnn',
    isActive: true,
    isLive: true
  },
  {
    id: 'msnbc',
    name: 'MSNBC',
    category: 'News',
    description: 'MSNBC live news and analysis',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'msnbc',
    isActive: true,
    isLive: true
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg TV',
    category: 'News',
    description: 'Bloomberg Television live business news',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'bloomberg',
    isActive: true,
    isLive: true
  },
  {
    id: 'nbc_news',
    name: 'NBC News',
    category: 'News',
    description: 'NBC News live coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'nbc-news',
    isActive: true,
    isLive: true
  },
  {
    id: 'pbs_newshour',
    name: 'PBS NewsHour',
    category: 'News',
    description: 'PBS NewsHour live coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'pbs-newshour',
    isActive: true,
    isLive: true
  },
  // Entertainment Networks
  {
    id: 'comedy_central',
    name: 'Comedy Central',
    category: 'Entertainment',
    description: 'Comedy shows and entertainment',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'comedy-central',
    isActive: true,
    isLive: true
  },
  {
    id: 'mtv',
    name: 'MTV',
    category: 'Entertainment',
    description: 'Music Television and entertainment',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'mtv',
    isActive: true,
    isLive: true
  },
  {
    id: 'vh1',
    name: 'VH1',
    category: 'Entertainment',
    description: 'Music and pop culture entertainment',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'vh1',
    isActive: true,
    isLive: true
  },
  {
    id: 'bet',
    name: 'BET',
    category: 'Entertainment',
    description: 'Black Entertainment Television',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'bet',
    isActive: true,
    isLive: true
  },
  // Sports Networks
  {
    id: 'espn',
    name: 'ESPN',
    category: 'Sports',
    description: 'Sports news and live coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'espn',
    isActive: true,
    isLive: true
  },
  {
    id: 'fox_sports',
    name: 'Fox Sports',
    category: 'Sports',
    description: 'Live sports and sports news',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'fox-sports',
    isActive: true,
    isLive: true
  },
  {
    id: 'nfl_network',
    name: 'NFL Network',
    category: 'Sports',
    description: 'National Football League coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'nfl-network',
    isActive: true,
    isLive: true
  },
  // Documentary/Educational
  {
    id: 'discovery',
    name: 'Discovery Channel',
    category: 'Documentary',
    description: 'Nature and science documentaries',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'discovery',
    isActive: true,
    isLive: true
  },
  {
    id: 'history',
    name: 'History Channel',
    category: 'Documentary',
    description: 'Historical documentaries and shows',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'history',
    isActive: true,
    isLive: true
  },
  {
    id: 'national_geographic',
    name: 'National Geographic',
    category: 'Documentary',
    description: 'Wildlife and exploration documentaries',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'national-geographic',
    isActive: true,
    isLive: true
  },
  {
    id: 'animal_planet',
    name: 'Animal Planet',
    category: 'Documentary',
    description: 'Animal and wildlife programming',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'animal-planet',
    isActive: true,
    isLive: true
  },
  {
    id: 'nasa_tv',
    name: 'NASA TV',
    category: 'Documentary',
    description: 'NASA Television space coverage',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'nasa-tv',
    isActive: true,
    isLive: true
  },
  // Kids/Family
  {
    id: 'cartoon_network',
    name: 'Cartoon Network',
    category: 'Kids',
    description: 'Animated shows for children',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'cartoon-network',
    isActive: true,
    isLive: true
  },
  {
    id: 'disney_channel',
    name: 'Disney Channel',
    category: 'Kids',
    description: 'Disney family entertainment',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'disney-channel',
    isActive: true,
    isLive: true
  },
  {
    id: 'nickelodeon',
    name: 'Nickelodeon',
    category: 'Kids',
    description: 'Kids entertainment and cartoons',
    country: 'US',
    language: 'English',
    tvGardenSlug: 'nickelodeon',
    isActive: true,
    isLive: true
  }
]

export class TVGardenService {
  private static instance: TVGardenService
  private networks: TVGardenNetwork[]
  private baseUrl = 'https://tv.garden'

  private constructor() {
    this.networks = [...TV_GARDEN_NETWORKS]
  }

  public static getInstance(): TVGardenService {
    if (!TVGardenService.instance) {
      TVGardenService.instance = new TVGardenService()
    }
    return TVGardenService.instance
  }

  public getNetworks(): TVGardenNetwork[] {
    return this.networks.filter(network => network.isActive)
  }

  public getNetworksByCategory(category?: string): TVGardenNetwork[] {
    const networks = this.getNetworks()
    if (!category || category === 'all') {
      return networks
    }
    return networks.filter(network => 
      network.category.toLowerCase() === category.toLowerCase()
    )
  }

  public getNetwork(networkId: string): TVGardenNetwork | null {
    return this.networks.find(network => network.id === networkId) || null
  }

  // Generate TV Garden stream URL
  public getTVGardenStreamUrl(networkId: string): string | null {
    const network = this.getNetwork(networkId)
    if (!network) return null
    
    // TV Garden URL format: https://tv.garden/watch/{slug}
    const streamUrl = `${this.baseUrl}/watch/${network.tvGardenSlug}`
    console.log(`🎯 [TV GARDEN] Generated stream URL for ${network.name}: ${streamUrl}`)
    return streamUrl
  }

  // Get direct embed stream URL (if TV Garden provides it)
  public getTVGardenEmbedUrl(networkId: string): string | null {
    const network = this.getNetwork(networkId)
    if (!network) return null
    
    // TV Garden embed URL format (if available)
    const embedUrl = `${this.baseUrl}/embed/${network.tvGardenSlug}`
    console.log(`📺 [TV GARDEN EMBED] Generated embed URL for ${network.name}: ${embedUrl}`)
    return embedUrl
  }

  public getStreamsForNetwork(networkId: string): TVGardenStream[] {
    const network = this.getNetwork(networkId)
    if (!network) return []

    const streamUrl = this.getTVGardenStreamUrl(networkId)
    const embedUrl = this.getTVGardenEmbedUrl(networkId)

    const streams: TVGardenStream[] = []
    
    if (streamUrl) {
      streams.push({
        id: `${networkId}_tv_garden`,
        networkId: network.id,
        networkName: network.name,
        title: `${network.name} Live`,
        url: streamUrl,
        quality: 'HD',
        isLive: true,
        isActive: true
      })
    }

    if (embedUrl) {
      streams.push({
        id: `${networkId}_tv_garden_embed`,
        networkId: network.id,
        networkName: network.name,
        title: `${network.name} Embed`,
        url: embedUrl,
        quality: 'HD',
        isLive: true,
        isActive: true
      })
    }

    return streams
  }

  public getPrimaryStreamUrl(networkId: string): string | null {
    const streamUrl = this.getTVGardenStreamUrl(networkId)
    return streamUrl
  }

  // Test TV Garden accessibility
  public async testTVGarden(): Promise<boolean> {
    try {
      console.log(`🔍 [TV GARDEN TEST] Testing accessibility: ${this.baseUrl}`)
      
      const response = await fetch(`${this.baseUrl}/us`, { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      console.log(`✅ [TV GARDEN] Service accessible (${response.status})`)
      return response.ok
    } catch (error) {
      console.log(`❌ [TV GARDEN] Service test failed:`, error)
      return false
    }
  }

  // Get working stream URL (TV Garden integration)
  public async getWorkingStreamUrl(networkId: string): Promise<string | null> {
    const network = this.getNetwork(networkId)
    if (!network) {
      console.log(`❌ No network found for ID: ${networkId}`)
      return null
    }
    
    // Return TV Garden watch URL
    const streamUrl = this.getTVGardenStreamUrl(networkId)
    console.log(`🎯 [TV GARDEN] Using stream URL for ${network.name}: ${streamUrl}`)
    return streamUrl
  }

  // Add a new network
  public addNetwork(network: TVGardenNetwork): void {
    this.networks.push(network)
  }

  // Update network status
  public updateNetworkStatus(networkId: string, isActive: boolean): void {
    const network = this.networks.find(n => n.id === networkId)
    if (network) {
      network.isActive = isActive
    }
  }

  // Get categories
  public getCategories(): string[] {
    const categories = new Set(this.networks.map(network => network.category))
    return Array.from(categories).sort()
  }

  // Get network statistics
  public getNetworkStats(): { 
    totalNetworks: number,
    byCategory: Record<string, number>,
    activeNetworks: number
  } {
    const active = this.getNetworks()
    const categories = this.getCategories()
    
    const byCategory: Record<string, number> = {}
    categories.forEach(category => {
      byCategory[category] = this.getNetworksByCategory(category).length
    })

    return {
      totalNetworks: this.networks.length,
      byCategory,
      activeNetworks: active.length
    }
  }
}
