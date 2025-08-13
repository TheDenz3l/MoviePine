"use client"

import { useState, useEffect } from "react"
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { LiveTVDirectPlayer } from '@/components/live-tv-direct-player'
import { Zap, Play, Users, Calendar, Clock, Loader2, AlertCircle, Tv, ExternalLink } from "lucide-react"
import { TVGardenService, TVGardenNetwork } from '@/lib/services/tv-garden'

interface TVGardenLiveTVPageProps {
  onNavigate: (category: string) => void
  activeCategory: string
}

export function TVGardenLiveTVPage({
  onNavigate,
  activeCategory
}: TVGardenLiveTVPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [networks, setNetworks] = useState<TVGardenNetwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string | null>(null)
  const [selectedNetworkName, setSelectedNetworkName] = useState<string>('')
  const [selectedNetworkLogo, setSelectedNetworkLogo] = useState<string | undefined>()
  const [loadingNetworkId, setLoadingNetworkId] = useState<string | null>(null)

  const [tvGardenService, setTVGardenService] = useState<TVGardenService | null>(null)

  useEffect(() => {
    // Initialize TV Garden service client-side only
    try {
      const service = TVGardenService.getInstance()
      setTVGardenService(service)
      loadNetworks(service)
    } catch (error) {
      console.error('❌ Error initializing TV Garden service:', error)
      setNetworks([])
      setIsLoading(false)
    }
  }, [])

  const loadNetworks = async (service: TVGardenService) => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading TV Garden networks...')
      
      // Test TV Garden accessibility first
      const isAccessible = await service.testTVGarden()
      if (!isAccessible) {
        console.warn('⚠️ TV Garden may not be accessible')
      }
      
      const networksData = service.getNetworks()
      console.log('📺 Loaded TV Garden networks:', networksData.length, 'networks')
      
      // Log network statistics
      const stats = service.getNetworkStats()
      console.log('📊 Network statistics:', stats)
      
      setNetworks(networksData)
    } catch (error) {
      console.error('❌ Error loading networks:', error)
      setNetworks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleNetworkPlay = async (network: TVGardenNetwork) => {
    if (!tvGardenService) return
    
    console.log(`🎬 [TV GARDEN] Playing network: ${network.name}`)
    setLoadingNetworkId(network.id)
    
    try {
      // Get the TV Garden stream URL
      const streamUrl = await tvGardenService.getWorkingStreamUrl(network.id)
      
      if (!streamUrl) {
        alert(`Unable to find a working stream for ${network.name}. Please try again later.`)
        return
      }

      console.log(`✅ [TV GARDEN] Stream URL found for ${network.name}: ${streamUrl}`)
      
      // For TV Garden, we'll open in a new tab since it's a web-based player
      window.open(streamUrl, '_blank', 'noopener,noreferrer')
      
    } catch (error) {
      console.error(`❌ Error playing ${network.name}:`, error)
      alert(`Error loading ${network.name} stream. Please try again.`)
    } finally {
      setLoadingNetworkId(null)
    }
  }

  const handleClosePlayer = () => {
    setIsPlayerOpen(false)
    setSelectedStreamUrl(null)
    setSelectedNetworkName('')
    setSelectedNetworkLogo(undefined)
  }

  const categories = ['all', 'News', 'Sports', 'Entertainment', 'Documentary', 'Kids']
  
  const filteredNetworks = selectedCategory === 'all' 
    ? networks 
    : networks.filter(network => 
        network.category.toLowerCase() === selectedCategory.toLowerCase()
      )

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
      {/* Navigation - Same as Homepage */}
      <MoviepireNavigation 
        activeCategory={activeCategory}
        onNavigate={onNavigate}
      />
      
      {/* Hero Section with Gradient Background */}
      <div className="relative pt-20 pb-0 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-purple-900/10 to-blue-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/5 via-transparent to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 px-6 md:px-12 pt-16 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Live TV Badge */}
            <div className="inline-flex items-center space-x-2 bg-red-600/10 border border-red-600/20 rounded-full px-4 py-2 mb-6">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">LIVE STREAMING</span>
            </div>
            
            {/* Main Title */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Zap className="w-12 h-12 md:w-16 md:h-16 text-red-600" />
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Live TV
              </h1>
            </div>
            
            {/* Description */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Watch live television from major US networks. Choose from news, sports, entertainment, and documentaries.
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400">Live Streaming</span>
              </div>
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400">Powered by TV Garden</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">{networks.length} US Channels</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Smooth Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[rgb(18,18,18)] to-transparent"></div>
      </div>

      {/* Category Filter - Direct continuation */}
      <div className="px-6 md:px-12 mb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/25'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-700/50'
                }`}
              >
                {category === 'all' ? 'All Channels' : category}
                {category !== 'all' && (
                  <span className="ml-2 text-xs opacity-75">
                    ({networks.filter(n => n.category.toLowerCase().includes(category.toLowerCase())).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 pb-16">
        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-lg text-gray-300">Loading TV Garden networks...</p>
              <p className="text-sm text-gray-500 mt-2">Connecting to live TV streams</p>
            </div>
          </div>
        ) : networks.length === 0 ? (
          // Error State
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <p className="text-lg text-gray-300 mb-2">No networks available</p>
              <p className="text-sm text-gray-500">Unable to load TV Garden channels</p>
            </div>
          </div>
        ) : (
          // Network Grid
          <div>
            <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold">
                {selectedCategory === 'all' ? 'All Networks' : `${selectedCategory} Networks`}
              </h2>
              <p className="text-gray-400">
                {filteredNetworks.length} channel{filteredNetworks.length !== 1 ? 's' : ''} available
              </p>
            </div>
            
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredNetworks.map((network) => (
                <div
                  key={network.id}
                  onClick={() => handleNetworkPlay(network)}
                  className="group relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-0 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-gray-800/60 hover:border-gray-700/50 hover:shadow-xl hover:shadow-red-600/10"
                >
                  {/* Network Logo/Header */}
                  <div className="aspect-video bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-t-xl flex items-center justify-center relative overflow-hidden">
                    {network.logo ? (
                      <img 
                        src={network.logo} 
                        alt={network.name} 
                        className="max-h-10 md:max-h-12 object-contain filter brightness-110"
                      />
                    ) : (
                      <div className="text-center">
                        <Tv className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm md:text-base font-bold text-white line-clamp-1">{network.name}</span>
                      </div>
                    )}
                    
                    {/* Live Badge */}
                    {network.isLive && (
                      <div className="absolute top-2 right-2 flex items-center space-x-1 bg-red-600/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-medium text-white">LIVE</span>
                      </div>
                    )}
                    
                    {/* Loading Overlay */}
                    {loadingNetworkId === network.id && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center rounded-t-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Network Info */}
                  <div className="p-3 md:p-4">
                    <h3 className="text-sm md:text-base font-semibold mb-1 line-clamp-1">{network.name}</h3>
                    <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{network.description}</p>
                    
                    {/* Network Details */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] md:text-xs text-gray-300 bg-gray-800/70 px-2 py-1 rounded-full">
                        {network.category}
                      </span>
                      <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                    </div>
                    
                    {/* Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNetworkPlay(network)
                      }}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 text-xs md:text-sm font-medium group-hover:shadow-lg group-hover:shadow-red-600/25"
                    >
                      <Play className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Watch Live</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal (if needed for embedded streams) */}
      <LiveTVDirectPlayer
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        streamUrl={selectedStreamUrl}
        networkName={selectedNetworkName}
        networkLogo={selectedNetworkLogo}
      />
    </div>
  )
}
