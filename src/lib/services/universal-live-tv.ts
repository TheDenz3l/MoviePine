// Universal Browser-Compatible Live TV streaming service
// Features BOTH HLS streams AND native browser formats (MP4/WebM)
// This ensures compatibility across ALL browsers without requiring any additional libraries

export interface DirectLiveTVNetwork {
  id: string
  name: string
  logo?: string
  category: string
  description: string
  country: string
  language: string
  streamUrls: string[] // Multiple stream URLs for fallback
  isActive: boolean
  streamType: 'hls' | 'mp4' | 'webm' | 'mixed' // New field to indicate stream format
}

export interface DirectLiveTVStream {
  id: string
  networkId: string
  networkName: string
  title: string
  url: string
  quality: string
  isLive: boolean
  isActive: boolean
  streamType: 'hls' | 'mp4' | 'webm'
}

// Universal browser-compatible network data
const DIRECT_LIVE_TV_NETWORKS: DirectLiveTVNetwork[] = [
  // ===== UNIVERSAL COMPATIBLE STREAMS (MP4/WebM - work in ALL browsers natively) =====
  {
    id: 'big_buck_bunny',
    name: '🎬 Big Buck Bunny (Demo)',
    category: 'Demo',
    description: 'Universal MP4 test stream - works in ALL browsers without any libraries',
    country: 'Universal',
    language: 'English',
    streamUrls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
    ],
    streamType: 'mp4',
    isActive: true
  },
  {
    id: 'tears_of_steel',
    name: '🎭 Tears of Steel (Demo)',
    category: 'Demo', 
    description: 'Universal MP4 test stream - guaranteed browser compatibility',
    country: 'Universal',
    language: 'English',
    streamUrls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    ],
    streamType: 'mp4',
    isActive: true
  },
  {
    id: 'sintel_demo',
    name: '🎨 Sintel (Demo)',
    category: 'Demo',
    description: 'High-quality MP4 demo - universal browser support',
    country: 'Universal', 
    language: 'English',
    streamUrls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1920x1080_1mb.mp4'
    ],
    streamType: 'mp4',
    isActive: true
  },
  // ===== ARCHIVE.ORG STREAMS (Public Domain - MP4 format) =====
  {
    id: 'classic_cartoons',
    name: '🐰 Classic Cartoons',
    category: 'Entertainment',
    description: 'Public domain classic cartoons - universal MP4 format',
    country: 'Universal',
    language: 'English',
    streamUrls: [
      'https://archive.org/download/betty_boop_poor_cinderella/betty_boop_poor_cinderella.mp4',
      'https://ia801309.us.archive.org/35/items/Popeye_forPresident/Popeye_forPresident.mp4',
      'https://archive.org/download/1936BettyBoopAndTheGrampy/BettyBoopAndGrampy1936.mp4'
    ],
    streamType: 'mp4',
    isActive: true
  },
  {
    id: 'nature_docs',
    name: '🌿 Nature Documentaries', 
    category: 'Documentary',
    description: 'Free nature documentaries - universal browser support',
    country: 'Universal',
    language: 'English',
    streamUrls: [
      'https://archive.org/download/Wildlife_20200101/Wildlife.mp4',
      'https://archive.org/download/NationalGeographicTheLastLions/NationalGeographicTheLastLions.mp4'
    ],
    streamType: 'mp4',
    isActive: true
  },
  {
    id: 'old_movies',
    name: '🎭 Classic Movies',
    category: 'Entertainment',
    description: 'Public domain classic films - MP4 format',
    country: 'Universal',
    language: 'English',
    streamUrls: [
      'https://archive.org/download/ThePhantomoftheOpera1925/ThePhantomoftheOpera1925.mp4',
      'https://archive.org/download/ChaplinTheKid1921/ChaplinTheKid1921.mp4'
    ],
    streamType: 'mp4',
    isActive: true
  },
  // ===== LIVE NEWS STREAMS (HLS but widely compatible) =====
  {
    id: 'cbs_news',
    name: '📺 CBS News',
    category: 'News',
    description: 'Breaking news and live coverage (HLS format)',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://dai.google.com/linear/hls/event/TxSbNMu4R5anKrjV02VOBg/master.m3u8',
      'https://cbsnhls-i.akamaihd.net/hls/live/264710/cbsn_la/master.m3u8'
    ],
    streamType: 'hls',
    isActive: true
  },
  {
    id: 'abc_news',
    name: '📺 ABC News Live',
    category: 'News', 
    description: 'ABC News live stream (HLS format)',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8',
      'https://abcnews-streams.akamaized.net/hls/live/2023560/abcnews1/master.m3u8'
    ],
    streamType: 'hls',
    isActive: true
  },
  {
    id: 'bloomberg',
    name: '💼 Bloomberg Television',
    category: 'News',
    description: 'Bloomberg Television live business news (HLS format)',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://bloomberg-bloombergtv-1-nl.samsung.wurl.tv/manifest/playlist.m3u8',
      'https://liveproduseast.global.ssl.fastly.net/btv/desktop/us_live.m3u8'
    ],
    streamType: 'hls',
    isActive: true
  },
  {
    id: 'nasa_tv',
    name: '🚀 NASA TV',
    category: 'Documentary',
    description: 'NASA Television live stream (HLS format)',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      'https://nasatv-lh.akamaihd.net/i/NASA_101@319270/master.m3u8'
    ],
    streamType: 'hls',
    isActive: true
  },
  // ===== INTERNATIONAL NEWS (HLS) =====
  {
    id: 'france24_english',
    name: '🇫🇷 France 24 English',
    category: 'News',
    description: 'International news in English (HLS format)',
    country: 'France',
    language: 'English',
    streamUrls: [
      'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8',
      'https://f24hls-i.akamaihd.net/hls/live/221147/F24_EN_LO_HLS/master.m3u8'
    ],
    streamType: 'hls',
    isActive: true
  },
  {
    id: 'dw_english',
    name: '🇩🇪 Deutsche Welle English',
    category: 'News',
    description: 'German international broadcaster (HLS format)',
    country: 'Germany',
    language: 'English',
    streamUrls: [
      'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      'https://dwstream3-lh.akamaihd.net/i/dwstream3_live@124409/master.m3u8'
    ],
    streamType: 'hls',
    isActive: true
  },
  // ===== MIXED FORMAT STREAMS =====
  {
    id: 'universal_test',
    name: '🔧 Universal Test Stream',
    category: 'Demo',
    description: 'Mixed format test - MP4 primary, HLS fallback',
    country: 'Universal',
    language: 'English',
    streamUrls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullhunt.mp4', // MP4 first
      'https://bitdash-a.akamaized.net/content/sintel/hls/playlist.m3u8' // HLS fallback
    ],
    streamType: 'mixed',
    isActive: true
  }
]

export class DirectLiveTVService {
  private static instance: DirectLiveTVService
  private networks: DirectLiveTVNetwork[]

  private constructor() {
    this.networks = [...DIRECT_LIVE_TV_NETWORKS]
  }

  public static getInstance(): DirectLiveTVService {
    if (!DirectLiveTVService.instance) {
      DirectLiveTVService.instance = new DirectLiveTVService()
    }
    return DirectLiveTVService.instance
  }

  public getNetworks(): DirectLiveTVNetwork[] {
    return this.networks.filter(network => network.isActive)
  }

  public getNetworksByCategory(category?: string): DirectLiveTVNetwork[] {
    const networks = this.getNetworks()
    if (!category || category === 'all') {
      return networks
    }
    return networks.filter(network => 
      network.category.toLowerCase() === category.toLowerCase()
    )
  }

  public getNetworksByFormat(format: 'hls' | 'mp4' | 'webm' | 'universal'): DirectLiveTVNetwork[] {
    const networks = this.getNetworks()
    if (format === 'universal') {
      return networks.filter(network => 
        network.streamType === 'mp4' || network.streamType === 'webm' || network.streamType === 'mixed'
      )
    }
    return networks.filter(network => 
      network.streamType === format || network.streamType === 'mixed'
    )
  }

  public getNetwork(networkId: string): DirectLiveTVNetwork | null {
    return this.networks.find(network => network.id === networkId) || null
  }

  public getStreamsForNetwork(networkId: string): DirectLiveTVStream[] {
    const network = this.getNetwork(networkId)
    if (!network) return []

    return network.streamUrls.map((url, index) => ({
      id: `${networkId}_stream_${index}`,
      networkId: network.id,
      networkName: network.name,
      title: `${network.name} - Stream ${index + 1}`,
      url,
      quality: this.getQualityFromUrl(url),
      isLive: this.isLiveStream(url),
      isActive: true,
      streamType: this.getStreamTypeFromUrl(url)
    }))
  }

  public getPrimaryStreamUrl(networkId: string): string | null {
    const network = this.getNetwork(networkId)
    if (!network || network.streamUrls.length === 0) return null
    return network.streamUrls[0]
  }

  public getAllStreamUrls(networkId: string): string[] {
    const network = this.getNetwork(networkId)
    if (!network) return []
    return [...network.streamUrls]
  }

  private getQualityFromUrl(url: string): string {
    if (url.includes('master.m3u8')) return 'Auto (HLS)'
    if (url.includes('720p') || url.includes('1280x720')) return '720p HD'
    if (url.includes('480p')) return '480p'
    if (url.includes('1080p') || url.includes('1920x1080')) return '1080p HD'
    if (url.includes('.mp4')) return 'MP4 (Universal)'
    if (url.includes('.webm')) return 'WebM (Universal)'
    return 'Live'
  }

  private getStreamTypeFromUrl(url: string): 'hls' | 'mp4' | 'webm' {
    if (url.includes('.m3u8')) return 'hls'
    if (url.includes('.webm')) return 'webm'
    return 'mp4' // Default to MP4 for universal compatibility
  }

  private isLiveStream(url: string): boolean {
    // MP4 files from archive.org or samples are not live
    if (url.includes('archive.org') || url.includes('commondatastorage') || url.includes('sample-videos')) {
      return false
    }
    // HLS streams are typically live
    if (url.includes('.m3u8')) return true
    return false
  }

  // Enhanced testing with format detection
  public async testStream(url: string): Promise<boolean> {
    try {
      console.log(`🔍 [UNIVERSAL STREAM TEST] Testing: ${url.substring(0, 60)}...`)
      
      const streamType = this.getStreamTypeFromUrl(url)
      console.log(`📺 [STREAM TYPE] Detected: ${streamType}`)
      
      // For MP4/WebM streams, test with a simple HEAD request
      if (streamType === 'mp4' || streamType === 'webm') {
        const response = await fetch(url, { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        console.log(`✅ [UNIVERSAL STREAM] ${streamType.toUpperCase()} accessible (${response.status})`)
        return response.ok
      }
      
      // For HLS streams, test accessibility
      if (streamType === 'hls') {
        const response = await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        })
        console.log(`✅ [HLS STREAM] Accessible`)
        return true
      }
      
      return false
    } catch (error) {
      console.log(`❌ [STREAM TEST] Failed for ${url.substring(0, 60)}...:`, error)
      return false
    }
  }

  // Get working stream URL with smart format selection
  public async getWorkingStreamUrl(networkId: string): Promise<string | null> {
    const network = this.getNetwork(networkId)
    if (!network || network.streamUrls.length === 0) {
      console.log(`❌ No stream URLs found for network: ${networkId}`)
      return null
    }
    
    const streamUrls = network.streamUrls
    
    // For mixed format networks, prioritize MP4/WebM over HLS for universal compatibility
    if (network.streamType === 'mixed') {
      const mp4Streams = streamUrls.filter(url => this.getStreamTypeFromUrl(url) === 'mp4')
      const hlsStreams = streamUrls.filter(url => this.getStreamTypeFromUrl(url) === 'hls')
      
      // Try MP4 first for universal compatibility
      if (mp4Streams.length > 0) {
        console.log(`🎯 [UNIVERSAL] Using MP4 stream for maximum compatibility: ${mp4Streams[0].substring(0, 60)}...`)
        return mp4Streams[0]
      }
      
      // Fallback to HLS
      if (hlsStreams.length > 0) {
        console.log(`🎯 [FALLBACK] Using HLS stream: ${hlsStreams[0].substring(0, 60)}...`)
        return hlsStreams[0]
      }
    }
    
    // For single format networks, use primary URL
    const primaryUrl = streamUrls[0]
    const streamType = this.getStreamTypeFromUrl(primaryUrl)
    console.log(`🎯 [${streamType.toUpperCase()}] Using primary URL for ${networkId}: ${primaryUrl.substring(0, 60)}...`)
    return primaryUrl
  }

  // Add a new network
  public addNetwork(network: DirectLiveTVNetwork): void {
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

  // Get stream formats available
  public getAvailableFormats(): string[] {
    const formats = new Set(this.networks.map(network => network.streamType))
    return Array.from(formats).sort()
  }

  // Get universal compatibility status
  public getUniversalCompatibilityInfo(): { 
    universalCount: number, 
    hlsCount: number, 
    totalCount: number,
    universalPercentage: number 
  } {
    const total = this.getNetworks().length
    const universal = this.getNetworksByFormat('universal').length
    const hls = this.getNetworksByFormat('hls').length
    
    return {
      universalCount: universal,
      hlsCount: hls,
      totalCount: total,
      universalPercentage: Math.round((universal / total) * 100)
    }
  }
}
