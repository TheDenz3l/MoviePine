// Direct Live TV streaming service - bypasses Real-Debrid and complex middleware
// This is a radically simplified approach for reliable Live TV streaming

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
}

// Simplified network data with working stream URLs
const DIRECT_LIVE_TV_NETWORKS: DirectLiveTVNetwork[] = [
  // Major US News Networks
  {
    id: 'cbs_news',
    name: 'CBS News',
    category: 'News',
    description: 'Breaking news and live coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://dai.google.com/linear/hls/event/TxSbNMu4R5anKrjV02VOBg/master.m3u8',
      'https://cbsnhls-i.akamaihd.net/hls/live/264710/cbsn_la/master.m3u8',
      'https://cbsn-chi.cbsnstream.cbsnews.com/out/v1/b748b23ce83044829dd27c4d0c0635a3/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'abc_news',
    name: 'ABC News Live',
    category: 'News', 
    description: 'ABC News live stream',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8',
      'https://abcnews-streams.akamaized.net/hls/live/2023560/abcnews1/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'fox_news',
    name: 'Fox News',
    category: 'News',
    description: 'Fox News Channel live stream',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://fox-foxnewsnow-samsungus.amagi.tv/playlist.m3u8',
      'https://247preview-foxnews-foxnewsnow.amagi.tv/playlist.m3u8',
      'https://radiovid.foxnews.com/hls/live/661547/RADIOVID/index.m3u8'
    ],
    isActive: true
  },
  {
    id: 'cnn_international',
    name: 'CNN International',
    category: 'News',
    description: 'CNN International live stream',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://cnn-cnninternational-1-eu.rakuten.wurl.tv/playlist.m3u8',
      'https://turnerlive.warnermediacdn.com/hls/live/586495/cnngo/cnn_slate/VIDEO_0_3564000.m3u8'
    ],
    isActive: true
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg Television',
    category: 'News',
    description: 'Bloomberg Television live business news',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://bloomberg.com/media-manifest/streams/us.m3u8',
      'https://bloomberg-bloombergtv-1-nl.samsung.wurl.tv/manifest/playlist.m3u8',
      'https://liveproduseast.global.ssl.fastly.net/btv/desktop/us_live.m3u8'
    ],
    isActive: true
  },
  {
    id: 'nasa_tv',
    name: 'NASA TV',
    category: 'Science',
    description: 'NASA Television live stream',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      'https://nasatv-lh.akamaihd.net/i/NASA_101@319270/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'weather_channel',
    name: 'The Weather Channel',
    category: 'News',
    description: 'Weather forecasts and coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://weather-lh.akamaihd.net/i/twc_1@92006/master.m3u8',
      'https://twc-twtv.amagi.tv/playlist.m3u8'
    ],
    isActive: true
  },
  {
    id: 'newsmax',
    name: 'Newsmax',
    category: 'News',
    description: 'Newsmax live news coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8',
      'https://newsmax-newsmax.amagi.tv/playlist.m3u8'
    ],
    isActive: true
  },
  {
    id: 'cspan',
    name: 'C-SPAN',
    category: 'News',
    description: 'C-SPAN government coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://skystreams-lh.akamaihd.net/i/SkyC1_1@500806/master.m3u8',
      'https://cspan1-lh.akamaihd.net/i/cspan1_1@304727/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'pbs_newshour',
    name: 'PBS NewsHour',
    category: 'News',
    description: 'PBS NewsHour live coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://ythls.onrender.com/channel/UC6ZFN9Tx6xh-skXCuRHCDpQ.m3u8',
      'https://newshour-prod.s3.amazonaws.com/newshour_live/index.m3u8'
    ],
    isActive: true
  },

  // Entertainment & International
  {
    id: 'classic_arts',
    name: 'Classic Arts Showcase',
    category: 'Arts',
    description: 'Classic arts and culture programming',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://classicarts.akamaized.net/hls/live/1024257/CAS/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'court_tv',
    name: 'Court TV',
    category: 'Legal',
    description: 'Live court proceedings and legal programming',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://content.uplynk.com/channel/6c0bd0f94b1d4526a98676e9699a10ef.m3u8'
    ],
    isActive: true
  },
  {
    id: 'tbn',
    name: 'Trinity Broadcasting Network',
    category: 'Religious',
    description: 'Christian television network',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://d7ge95bb03xsu.cloudfront.net/out/v1/0c95a89614194912834019fc37d741ef/tbn-freecast.m3u8'
    ],
    isActive: true
  },
  {
    id: 'cbn_news',
    name: 'CBN News',
    category: 'News',
    description: 'Christian Broadcasting Network news',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://bcovlive-a.akamaihd.net/re8d9f611ee4a490a9bb59e52db91414d/us-east-1/734546207001/playlist.m3u8'
    ],
    isActive: true
  },
  {
    id: 'newsy',
    name: 'Newsy',
    category: 'News',
    description: 'Next-generation news network',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://547f72e665237c3.mediapackage.us-east-1.amazonaws.com/out/v1/e3e6e29095844c4ba7d887f01e44a5ef/index.m3u8',
      'https://content.uplynk.com/channel/1f93c13275024afb9e0ead299624073d.m3u8'
    ],
    isActive: true
  },

  // International & Specialty
  {
    id: 'real_americas_voice',
    name: "Real America's Voice",
    category: 'News',
    description: 'Independent news and commentary',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://d2jiqiw4g5lj5k.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/AmericasVoiceChannel-prod/AVSamsung/AVSamsung.m3u8'
    ],
    isActive: true
  },
  {
    id: 'cloudflare_tv',
    name: 'Cloudflare TV',
    category: 'Technology',
    description: 'Technology and internet programming',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://cloudflare.tv/hls/live.m3u8'
    ],
    isActive: true
  },
  {
    id: 'wild_earth',
    name: 'WildEarth',
    category: 'Nature',
    description: 'Live wildlife and nature programming',
    country: 'Global',
    language: 'English',
    streamUrls: [
      'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01290-wildearth-oando/playlist.m3u8'
    ],
    isActive: true
  },
  {
    id: 'loupe_4k',
    name: 'Loupe 4K',
    category: 'Documentary',
    description: 'Ultra high definition nature and documentary content',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://d2dw21aq0j0l5c.cloudfront.net/playlist.m3u8'
    ],
    isActive: true
  },

  // Test Streams
  {
    id: 'test_stream',
    name: 'Test Stream',
    category: 'Test',
    description: 'Test HLS stream for debugging',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
      'https://demo-spbtv.hexaglobe.net/json_api/get_stream/1469/320.m3u8',
      'https://bitdash-a.akamaized.net/content/sintel/hls/playlist.m3u8'
    ],
    isActive: true
  }
]
    category: 'News',
    description: 'Bloomberg Television live business news',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://bloomberg-bloombergtv-1-nl.samsung.wurl.tv/manifest/playlist.m3u8',
      'https://liveproduseast.global.ssl.fastly.net/btv/desktop/us_live.m3u8'
    ],
    isActive: true
  },
  {
    id: 'nasa_tv',
    name: 'NASA TV',
    category: 'Documentary',
    description: 'NASA Television live stream',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      'https://nasatv-lh.akamaihd.net/i/NASA_101@319270/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'weather_channel',
    name: 'The Weather Channel',
    category: 'News',
    description: 'Weather forecasts and coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://weather-lh.akamaihd.net/i/twc_1@92006/master.m3u8',
      'https://twc-twtv.amagi.tv/playlist.m3u8'
    ],
    isActive: true
  },
  {
    id: 'newsmax',
    name: 'Newsmax',
    category: 'News',
    description: 'Newsmax live news coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8',
      'https://newsmax-newsmax.amagi.tv/playlist.m3u8'
    ],
    isActive: true
  },
  {
    id: 'cspan',
    name: 'C-SPAN',
    category: 'News',
    description: 'C-SPAN government coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://skystreams-lh.akamaihd.net/i/SkyC1_1@500806/master.m3u8',
      'https://cspan1-lh.akamaihd.net/i/cspan1_1@304727/master.m3u8'
    ],
    isActive: true
  },
  {
    id: 'pbs_newshour',
    name: 'PBS NewsHour',
    category: 'News',
    description: 'PBS NewsHour live coverage',
    country: 'US',
    language: 'English',
    streamUrls: [
      'https://ythls.onrender.com/channel/UC6ZFN9Tx6xh-skXCuRHCDpQ.m3u8',
      'https://newshour-prod.s3.amazonaws.com/newshour_live/index.m3u8'
    ],
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
      isLive: true,
      isActive: true
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
    if (url.includes('720p')) return '720p HD'
    if (url.includes('480p')) return '480p'
    if (url.includes('1080p')) return '1080p HD'
    return 'Live'
  }

  // Test stream connectivity with better error handling
  public async testStream(url: string): Promise<boolean> {
    try {
      console.log(`🔍 [STREAM TEST] Testing: ${url.substring(0, 60)}...`)
      
      // For HLS streams, just test if the URL is reachable
      if (url.includes('.m3u8')) {
        const response = await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        })
        console.log(`✅ [STREAM TEST] HLS stream accessible`)
        return true
      }
      
      // For other streams, try a basic connectivity test
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      console.log(`✅ [STREAM TEST] Stream accessible`)
      return true
    } catch (error) {
      console.log(`❌ [STREAM TEST] Failed for ${url.substring(0, 60)}...:`, error)
      return false
    }
  }

  // Get working stream URL with fallback (simplified approach)
  public async getWorkingStreamUrl(networkId: string): Promise<string | null> {
    const streamUrls = this.getAllStreamUrls(networkId)
    
    if (streamUrls.length === 0) {
      console.log(`❌ No stream URLs found for network: ${networkId}`)
      return null
    }
    
    // For live TV streams, just return the first URL since CORS testing often fails
    // The video player will handle fallbacks if the stream doesn't work
    const primaryUrl = streamUrls[0]
    console.log(`🎯 [DIRECT STREAM] Using primary URL for ${networkId}: ${primaryUrl.substring(0, 60)}...`)
    return primaryUrl
  }

  // Add a new network (for future extensibility)
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
}
