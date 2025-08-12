"use client"

import { useState, useEffect } from "react"
import { RealTimeSearchPage } from '@/components/real-time-search-page'
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { Zap, Play, Users, Calendar, Clock, Loader2, AlertCircle, Activity, Wifi, WifiOff } from "lucide-react"
import { createStremioUSATVService, USATVNetwork, USATVStream } from '@/lib/services/stremio-usa-tv-health'
import { streamHealthMonitor } from '@/lib/services/stream-health-monitor'
import { getConfigOrDefault } from '@/lib/config'

interface LiveTVPageProps {
  onPlay: (streamId: string, title: string) => void
  onAddToList: (streamId: string) => void
  onMoreInfo: (streamId: string) => void
  onNavigate: (category: string) => void
  onSearch: (query: string) => void
  activeCategory: string
}

interface SearchResult {
  id: string
  title: string
  year?: number
  poster: string
  type: 'movie' | 'tv'
}

export function LiveTVPage({
  onPlay,
  onAddToList,
  onMoreInfo,
  onNavigate,
  onSearch,
  activeCategory
}: LiveTVPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedNetwork, setSelectedNetwork] = useState<USATVNetwork | null>(null)
  const [networks, setNetworks] = useState<USATVNetwork[]>([])
  const [streams, setStreams] = useState<USATVStream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStreams, setIsLoadingStreams] = useState(false)
  const [showRealTimeSearch, setShowRealTimeSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [stremioService, setStremioService] = useState<ReturnType<typeof createStremioUSATVService> | null>(null)
  const [healthStats, setHealthStats] = useState<{
    healthyNetworks: number
    totalNetworks: number
    healthyStreams: number
    totalStreams: number
  }>({ healthyNetworks: 0, totalNetworks: 0, healthyStreams: 0, totalStreams: 0 })
  const [showHealthyOnly, setShowHealthyOnly] = useState(false)

  useEffect(() => {
    // Initialize Stremio service with the same Real-Debrid config used for movies/TV
    const initializeService = async () => {
      try {
        console.log('🚀 Initializing Live TV service...')
        
        // Use the same config pattern as movies and TV series
        const config = getConfigOrDefault()
        console.log('🔧 Config loaded:', config)
        
        const service = createStremioUSATVService({
          realDebridApiKey: config.debridService === 'realdebrid' ? config.debridApiKey : undefined,
          useCache: true,
          cacheTimeout: 60000, // Reduced to 1 minute for faster updates
          enableHealthMonitoring: true // Health monitoring will run in background
        })
        
        console.log('✅ Service created, setting state...')
        setStremioService(service)
        console.log('🎯 Live TV service initialized with existing Real-Debrid config')
        
        // Load networks with health filtering
        console.log('📺 About to load networks...')
        await loadNetworks(service)
        console.log('✅ Networks loading completed')
      } catch (error) {
        console.error('❌ Error initializing Live TV service:', error)
        setNetworks([])
        setIsLoading(false)
      }
    }

    console.log('🎬 Live TV page component mounted, starting initialization...')
    initializeService()

    // Listen for search overlay events and health updates
    const handleOpenSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail?.query || "")
      setShowRealTimeSearch(true)
    }
    
    const handleCloseSearch = () => {
      setShowRealTimeSearch(false)
      setSearchQuery("")
    }

    const updateHealthStats = () => {
      if (stremioService) {
        const stats = stremioService.getHealthStats()
        console.log('🎯 Current health stats from service:', stats)
        setHealthStats({
          healthyNetworks: stats.healthyNetworks,
          totalNetworks: stats.totalNetworks,
          healthyStreams: stats.healthyStreams,
          totalStreams: stats.totalStreams
        })
      }
    }

    window.addEventListener('app:openRealTimeSearch', handleOpenSearch as EventListener)
    window.addEventListener('app:closeRealTimeSearch', handleCloseSearch)

    // Update health stats more frequently
    const healthInterval = setInterval(updateHealthStats, 10000) // Every 10 seconds

    return () => {
      window.removeEventListener('app:openRealTimeSearch', handleOpenSearch as EventListener)
      window.removeEventListener('app:closeRealTimeSearch', handleCloseSearch)
      clearInterval(healthInterval)
    }
  }, [])

  // Reload networks when health filtering preference changes
  useEffect(() => {
    if (stremioService) {
      console.log('🔄 Health filter changed, reloading networks. showHealthyOnly:', showHealthyOnly)
      loadNetworks(stremioService)
    }
  }, [showHealthyOnly, stremioService])

  const loadNetworks = async (service: ReturnType<typeof createStremioUSATVService>) => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading TV networks from Stremio USA TV addon...')
      console.log('🔍 showHealthyOnly:', showHealthyOnly)
      
      let networksData: USATVNetwork[]
      
      if (showHealthyOnly) {
        // Get only healthy networks
        console.log('🩺 Getting healthy networks only...')
        networksData = await service.getHealthyNetworksByCategory()
        console.log('📺 Loaded healthy networks:', networksData.length, networksData)
      } else {
        // Get all networks with background health monitoring (faster loading)
        console.log('📺 Getting all networks with background health monitoring...')
        networksData = await service.getNetworksByCategory(undefined, true)
        console.log('📺 Loaded all networks (health check in background):', networksData.length, networksData)
      }
      
      console.log('🔍 Network data sample:', networksData.slice(0, 3))
      
      console.log('📊 Setting networks state with:', networksData)
      setNetworks(networksData)
      
      // Update health stats
      const stats = service.getHealthStats()
      console.log('🩺 Health stats:', stats)
      setHealthStats({
        healthyNetworks: stats.healthyNetworks,
        totalNetworks: stats.totalNetworks,
        healthyStreams: stats.healthyStreams,
        totalStreams: stats.totalStreams
      })
      
      console.log('✅ Networks loaded successfully. Final state:', {
        networksCount: networksData.length,
        isLoading: false,
        showHealthyOnly
      })
    } catch (error) {
      console.error('❌ Error loading networks:', error)
      // Set empty array on error
      setNetworks([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadStreamsForNetwork = async (network: USATVNetwork) => {
    if (!stremioService) return

    try {
      setIsLoadingStreams(true)
      console.log(`🔍 Loading streams for network: ${network.name}`, network)
      
      // Check if network already has embedded streams
      if (network.meta && (network.meta as any).streams) {
        console.log('📡 Found embedded streams in network meta:', (network.meta as any).streams)
        
        // Convert embedded streams to USATVStream format
        const embeddedStreams = (network.meta as any).streams
        const usaTVStreams: USATVStream[] = embeddedStreams.map((stream: any, index: number) => ({
          id: `${network.id}_stream_${index}`,
          title: `${network.name} - ${stream.name || stream.description || 'Live'}`,
          networkId: network.id,
          networkName: network.name,
          category: network.category,
          url: stream.url,
          quality: stream.quality || stream.name || 'HD',
          description: stream.description || `Live stream from ${network.name}`,
          isLive: true,
          thumbnail: undefined,
          infoHash: stream.infoHash
        }))
        
        console.log('📡 Converted embedded streams:', usaTVStreams)
        setStreams(usaTVStreams)
        return
      }
      
      // Fallback: Use getStreamsForNetwork method to get available streams
      const networkStreams = await stremioService.getStreamsForNetwork(network.id)
      console.log('📡 Network streams from service:', networkStreams)
      
      // Convert StremioStream[] to USATVStream[]
      const usaTVStreams: USATVStream[] = networkStreams.map((stremioStream, index) => ({
        id: `${network.id}_stream_${index}`,
        title: stremioStream.title || `${network.name} Live`,
        networkId: network.id,
        networkName: network.name,
        category: network.category,
        url: stremioStream.url,
        quality: stremioStream.quality || 'HD',
        description: stremioStream.description || `Live stream from ${network.name}`,
        isLive: true,
        thumbnail: stremioStream.url, // Use stream URL as thumbnail placeholder
        infoHash: stremioStream.infoHash
      }))
      
      console.log('📡 Converted streams:', usaTVStreams)
      setStreams(usaTVStreams)
    } catch (error) {
      console.error('❌ Error loading streams:', error)
      setStreams([])
    } finally {
      setIsLoadingStreams(false)
    }
  }

  const handleSearchResultSelect = (result: SearchResult) => {
    setShowRealTimeSearch(false)
    setSearchQuery("")
  }

  const handlePlay = async (streamId: string, title: string) => {
    console.log('🎬 [DEBUG LIVE TV] handlePlay called with:', { streamId, title })
    
    if (!stremioService || !selectedNetwork) {
      console.warn('⚠️ [DEBUG LIVE TV] Cannot play stream: service or network not selected')
      return
    }

    try {
      console.log(`▶️ [DEBUG LIVE TV] Playing stream: ${title} (${streamId})`)
      
      // Find the original stream for fallback
      const originalStream = streams.find(s => s.id === streamId)
      console.log('🎬 [DEBUG LIVE TV] Original stream:', originalStream)
      
      if (!originalStream?.url) {
        console.error('❌ [DEBUG LIVE TV] Stream URL not available')
        alert('Stream URL not available. Please try another stream.')
        return
      }

      // Try to get Real-Debrid enhanced stream first
      try {
        console.log('🔄 [DEBUG LIVE TV] Attempting Real-Debrid enhancement...')
        const rdStream = await stremioService.getStreamWithRealDebrid(selectedNetwork.id, streamId)
        
        if (rdStream && typeof rdStream === 'string' && rdStream !== originalStream.url) {
          console.log('✅ [DEBUG LIVE TV] Using Real-Debrid unrestricted stream:', rdStream.substring(0, 50) + '...')
          onPlay(rdStream, title + ' (Premium)')
          return
        }
      } catch (rdError: any) {
        // Silently handle expected Real-Debrid errors
        if (rdError.isExpectedError) {
          // Expected limitation - no logging needed
        } else {
          console.log('🔄 [DEBUG LIVE TV] Real-Debrid unavailable:', rdError.message || rdError)
        }
      }

      // Fallback to original stream URL
      console.log('🎯 [DEBUG LIVE TV] Using direct stream URL:', originalStream.url.substring(0, 50) + '...')
      console.log('🎯 [DEBUG LIVE TV] Calling onPlay with URL and title')
      onPlay(originalStream.url, title)
      
    } catch (error) {
      console.error('❌ [DEBUG LIVE TV] Error playing stream:', error)
      
      // Last resort: try original stream URL
      const stream = streams.find(s => s.id === streamId)
      if (stream?.url) {
        console.log('🆘 [DEBUG LIVE TV] Last resort: trying original stream URL')
        onPlay(stream.url, title)
      } else {
        alert('Unable to play stream. Please try another stream.')
      }
    }
  }

  const handleNetworkSelect = async (network: USATVNetwork) => {
    setSelectedNetwork(network)
    await loadStreamsForNetwork(network)
  }

  const handleBackToNetworks = () => {
    setSelectedNetwork(null)
    setStreams([])
  }

  const categories = ['all', 'News', 'Sports', 'Entertainment', 'Documentary']
  
  const filteredNetworks = selectedCategory === 'all' 
    ? networks 
    : networks.filter(network => 
        network.category.toLowerCase().includes(selectedCategory.toLowerCase())
      )

  // Debug logging
  console.log('🧪 Current state:', {
    networks: networks.length,
    selectedCategory,
    filteredNetworks: filteredNetworks.length,
    isLoading,
    healthStats,
    showHealthyOnly
  })

  // Add debugging to help with troubleshooting
  console.log('🔍 Networks sample:', networks.slice(0, 2))

  // Show real-time search overlay
  if (showRealTimeSearch) {
    return (
      <RealTimeSearchPage
        initialQuery={searchQuery}
        onMovieSelect={(movie) => handleSearchResultSelect({
          id: movie.id,
          title: movie.title,
          year: movie.year || new Date().getFullYear(),
          poster: movie.poster || '',
          type: movie.type
        })}
        onPlay={(movieId, title) => onPlay(movieId, title)}
        onAddToList={(movie) => onAddToList(movie.id)}
        onMoreInfo={(movie) => onMoreInfo(movie.id)}
        onClose={() => setShowRealTimeSearch(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
      <MoviepireNavigation 
        onNavigate={onNavigate}
        activeCategory="live-tv"
      />
      
      {/* Live TV Content */}
      <div className="pt-20">
        <div className="px-6 md:px-12">
          {/* Live TV Header */}
          <div className="flex items-center space-x-3 mb-6">
            <Zap className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold">Live TV</h1>
          </div>
          
          <div className="mb-6">
            <p className="text-xl text-gray-300 max-w-2xl">
              Watch live television from major networks. Choose your network and enjoy live streaming content.
            </p>
            {healthStats.totalNetworks > 0 && healthStats.healthyNetworks === 0 && (
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-800/50 rounded-lg">
                <p className="text-yellow-200 text-sm">
                  ⚠️ No streams are currently active. This is normal - many live TV streams have temporary availability. 
                  Try unchecking "Show only active networks" below to see all available networks, or check back later.
                </p>
              </div>
            )}
          </div>

          {/* Health Monitoring Status */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Stream Health:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-300">
                {healthStats.healthyNetworks}/{healthStats.totalNetworks} Networks Active
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">
                {healthStats.healthyStreams}/{healthStats.totalStreams} Streams Active
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showHealthyOnly}
                  onChange={(e) => {
                    setShowHealthyOnly(e.target.checked)
                    if (stremioService) {
                      loadNetworks(stremioService)
                    }
                  }}
                  className="rounded"
                />
                <span className="text-gray-300">Show only active networks</span>
              </label>
            </div>

            <button
              onClick={() => {
                if (stremioService) {
                  loadNetworks(stremioService)
                }
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mt-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 md:px-12 pb-16">
          {!selectedNetwork ? (
          // Network Selection View
          <div>
            <h2 className="text-2xl font-bold mb-8">Choose a Network</h2>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
                <p className="text-gray-400 text-lg">Loading live TV networks...</p>
                <p className="text-gray-500 text-sm mt-2">This may take a moment while we check stream availability</p>
              </div>
            ) : filteredNetworks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-8 h-8 text-yellow-500 mb-4" />
                <p className="text-gray-400 text-lg">No networks available</p>
                <p className="text-gray-500 text-sm mt-2">
                  Try unchecking "Show only active networks" or refresh the page
                </p>
                <button
                  onClick={() => {
                    if (stremioService) {
                      loadNetworks(stremioService)
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNetworks.map((network) => {
                const networkHealth = stremioService?.getNetworkHealthStatus(network.id)
                
                return (
                  <div
                    key={network.id}
                    onClick={() => handleNetworkSelect(network)}
                    className="bg-gray-900 rounded-lg p-6 cursor-pointer hover:bg-gray-800 transition-all duration-200 hover:scale-105 relative"
                  >
                    {/* Health Status Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      {networkHealth?.isHealthy ? (
                        <div className="flex items-center gap-1">
                          <Wifi className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-500 font-medium">
                            {networkHealth.activeStreams} active
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <WifiOff className="w-4 h-4 text-red-500" />
                          <span className="text-xs text-red-500 font-medium">No streams</span>
                        </div>
                      )}
                    </div>

                    <div className="aspect-video bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                      {network.logo ? (
                        <img src={network.logo} alt={network.name} className="max-h-12" />
                      ) : (
                        <span className="text-2xl font-bold text-white">{network.name}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{network.name}</h3>
                    <p className="text-sm text-gray-400 mb-3">{network.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{network.category}</span>
                      <div className="flex items-center space-x-2">
                        {network.isLive && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-red-500">LIVE</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-4 mb-8">
              <button
                onClick={handleBackToNetworks}
                className="text-red-600 hover:text-red-500 transition-colors"
              >
                ← Back to Networks
              </button>
              <h2 className="text-2xl font-bold">{selectedNetwork.name} Live Streams</h2>
            </div>
            
            {isLoadingStreams ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                <span className="ml-3 text-lg">Loading streams...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.map((stream) => {
                  const streamHealth = stremioService?.getStreamHealthStatus(stream.url)
                  
                  return (
                    <div
                      key={stream.id}
                      className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-all duration-200 hover:scale-105 relative"
                    >
                      {/* Stream Health Indicator */}
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/70 px-2 py-1 rounded">
                        {streamHealth?.isActive !== false ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-500 font-medium">Active</span>
                            {streamHealth?.responseTime && (
                              <span className="text-xs text-gray-400">({streamHealth.responseTime}ms)</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-red-500 font-medium">Offline</span>
                          </div>
                        )}
                      </div>

                      <div className="aspect-video bg-gray-800 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-16 h-16 text-white opacity-70" />
                        </div>
                        {stream.isLive && (
                          <div className="absolute top-4 left-4 flex items-center space-x-1 bg-red-600 px-2 py-1 rounded">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium">LIVE</span>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-black/70 px-2 py-1 rounded">
                          <span className="text-xs">{stream.quality || 'HD'}</span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">{stream.title}</h3>
                        <p className="text-sm text-gray-400 mb-4">{stream.description}</p>
                        
                        <button
                          onClick={() => handlePlay(stream.id, stream.title)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={streamHealth?.isActive === false}
                        >
                          <Play className="w-4 h-4" />
                          <span>{streamHealth?.isActive === false ? 'Stream Offline' : 'Watch Live'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!isLoadingStreams && streams.length === 0 && (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Live Streams Available</h3>
                <p className="text-gray-500">Check back later for live content from {selectedNetwork.name}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Integration Info */}
      <div className="px-6 md:px-12 pb-16">
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Powered by Stremio USA TV Addon</h3>
          <p className="text-sm text-gray-400 mb-4">
            This Live TV feature integrates with the Stremio USA TV addon to provide access to live television streams.
          </p>
          <a
            href="https://stremio-addons.com/usa-tv.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-500 text-sm transition-colors"
          >
            Learn more about the USA TV addon →
          </a>
        </div>
      </div>
      </div>
    </div>
  )
}
