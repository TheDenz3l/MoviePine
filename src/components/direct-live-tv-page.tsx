"use client"

import { useState, useEffect } from "react"
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { LiveTVDirectPlayer } from '@/components/live-tv-direct-player'
import { Zap, Play, Users, Calendar, Clock, Loader2, AlertCircle, Tv } from "lucide-react"
import { DirectLiveTVService, DirectLiveTVNetwork } from '@/lib/services/universal-live-tv'

interface DirectLiveTVPageProps {
  onNavigate: (category: string) => void
  activeCategory: string
}

export function DirectLiveTVPage({
  onNavigate,
  activeCategory
}: DirectLiveTVPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [networks, setNetworks] = useState<DirectLiveTVNetwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string | null>(null)
  const [selectedNetworkName, setSelectedNetworkName] = useState<string>('')
  const [selectedNetworkLogo, setSelectedNetworkLogo] = useState<string | undefined>()
  const [loadingNetworkId, setLoadingNetworkId] = useState<string | null>(null)

  const [liveTVService, setLiveTVService] = useState<DirectLiveTVService | null>(null)

  useEffect(() => {
    // Initialize service client-side only
    try {
      const service = DirectLiveTVService.getInstance()
      setLiveTVService(service)
      loadNetworks(service)
    } catch (error) {
      console.error('❌ Error initializing Live TV service:', error)
      setNetworks([])
      setIsLoading(false)
    }
  }, [])

  const loadNetworks = async (service: DirectLiveTVService) => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading Live TV networks...')
      
      const networksData = service.getNetworks()
      console.log('📺 Loaded direct networks:', networksData.length, 'networks')
      
      setNetworks(networksData)
    } catch (error) {
      console.error('❌ Error loading networks:', error)
      setNetworks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleNetworkPlay = async (network: DirectLiveTVNetwork) => {
    if (!liveTVService) return
    
    console.log(`🎬 [DIRECT LIVE TV] Playing network: ${network.name}`)
    setLoadingNetworkId(network.id)

    try {
      // Get the best working stream URL
      const streamUrl = await liveTVService.getWorkingStreamUrl(network.id)
      
      if (!streamUrl) {
        alert(`Unable to find a working stream for ${network.name}. Please try again later.`)
        return
      }

      console.log(`✅ [DIRECT LIVE TV] Stream URL found for ${network.name}: ${streamUrl.substring(0, 50)}...`)
      
      // Set player state
      setSelectedStreamUrl(streamUrl)
      setSelectedNetworkName(network.name)
      setSelectedNetworkLogo(network.logo)
      setIsPlayerOpen(true)
      
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

  const categories = ['all', ...(liveTVService?.getCategories() || [])]
  
  const filteredNetworks = selectedCategory === 'all' 
    ? networks 
    : networks.filter(network => 
        network.category.toLowerCase() === selectedCategory.toLowerCase()
      )

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
      {/* Navigation */}
      <MoviepireNavigation
        onNavigate={onNavigate}
        activeCategory={activeCategory}
      />

      {/* Hero Section */}
      <div className="relative pt-20 pb-16">
        <div className="px-6 md:px-12">
          <div className="flex items-center space-x-3 mb-6">
            <Zap className="w-8 h-8 text-red-600" />
            <h1 className="text-4xl md:text-5xl font-bold">Live TV</h1>
            <div className="flex items-center space-x-2 ml-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 font-medium">DIRECT STREAMING</span>
            </div>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl">
            Watch live television from major networks with direct streaming - no complex setup required. 
            Powered by our new optimized streaming engine for reliable Live TV access.
          </p>
          
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

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-8 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Tv className="w-4 h-4" />
              <span>{networks.length} Networks Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>No Registration Required</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>24/7 Live Streaming</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-12 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <span className="ml-3 text-lg">Loading networks...</span>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-8">
              {selectedCategory === 'all' ? 'All Networks' : `${selectedCategory} Networks`}
              <span className="text-gray-400 text-lg ml-3">({filteredNetworks.length})</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNetworks.map((network) => (
                <div
                  key={network.id}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-all duration-200 hover:scale-105 group"
                >
                  {/* Network Logo/Banner */}
                  <div className="aspect-video bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden">
                    {network.logo ? (
                      <img 
                        src={network.logo} 
                        alt={network.name} 
                        className="w-full h-full object-contain p-4" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-2xl font-bold text-white text-center px-4">
                          {network.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Live Indicator */}
                    <div className="absolute top-3 left-3 flex items-center space-x-1 bg-red-600 px-2 py-1 rounded">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-white">LIVE</span>
                    </div>

                    {/* Quality Badge */}
                    <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      HD
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      {loadingNetworkId === network.id ? (
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                      ) : (
                        <Play className="w-16 h-16 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Network Info */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{network.name}</h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{network.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span className="bg-gray-800 px-2 py-1 rounded">{network.category}</span>
                      <span>{network.country} • {network.language}</span>
                    </div>
                    
                    <button
                      onClick={() => handleNetworkPlay(network)}
                      disabled={loadingNetworkId === network.id}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {loadingNetworkId === network.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Watch Live</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredNetworks.length === 0 && (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Networks Found</h3>
                <p className="text-gray-500">
                  No networks available in the {selectedCategory} category.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Direct Player Modal */}
      <LiveTVDirectPlayer
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        streamUrl={selectedStreamUrl}
        networkName={selectedNetworkName}
        networkLogo={selectedNetworkLogo}
      />

      {/* Footer */}
      <MoviepireFooter />
    </div>
  )
}
