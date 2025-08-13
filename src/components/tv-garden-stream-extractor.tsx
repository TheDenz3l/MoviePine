'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search, Play, Wifi, WifiOff, Globe, Youtube, Radio, ExternalLink, Copy } from 'lucide-react'
import { TVGardenStreamService, TVGardenStreamData } from '@/lib/services/tv-garden-streams'

export default function TVGardenStreamExtractorPage() {
  const [streams, setStreams] = useState<TVGardenStreamData[]>([])
  const [categorizedStreams, setCategorizedStreams] = useState<Record<string, TVGardenStreamData[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [playingStream, setPlayingStream] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    loadStreams()
  }, [])

  const loadStreams = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching US streams from TV Garden...')
      const allStreams = await TVGardenStreamService.getAllUSStreamData()
      const workingStreams = TVGardenStreamService.filterWorkingStreams(allStreams)
      
      console.log(`Found ${allStreams.length} total streams, ${workingStreams.length} with valid URLs`)
      
      setStreams(workingStreams)
      
      const categorized = TVGardenStreamService.categorizeChannels(workingStreams)
      setCategorizedStreams(categorized)
      
    } catch (err) {
      console.error('Error loading TV Garden streams:', err)
      setError('Failed to load streams. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleStreamPlay = async (stream: TVGardenStreamData) => {
    if (!stream.preferredUrl) {
      setError('No playable stream URL available for this channel')
      return
    }

    setPlayingStream(stream.nanoid)
    
    // Copy URL to clipboard
    try {
      await navigator.clipboard.writeText(stream.preferredUrl)
      setCopiedUrl(stream.preferredUrl)
      
      if (stream.type === 'youtube' || stream.preferredUrl.includes('youtube')) {
        // For YouTube streams, extract video ID and open in YouTube
        const videoId = extractYouTubeVideoId(stream.preferredUrl)
        if (videoId) {
          window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
        } else {
          window.open(stream.preferredUrl, '_blank')
        }
      }
      
      // Clear the copied notification after 3 seconds
      setTimeout(() => setCopiedUrl(null), 3000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      setError('Failed to copy URL to clipboard')
    }
    
    setTimeout(() => setPlayingStream(null), 1000)
  }

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:embed\/|watch\?v=|\/v\/|\.be\/|\/embed\/|\/watch\?.*&v=)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const getFilteredStreams = () => {
    let filtered = selectedCategory === 'all' ? streams : (categorizedStreams[selectedCategory] || [])
    
    if (searchQuery) {
      filtered = TVGardenStreamService.searchChannels(filtered, searchQuery)
    }
    
    return filtered
  }

  const getStreamIcon = (stream: TVGardenStreamData) => {
    switch (stream.type) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />
      case 'iptv':
        return <Radio className="h-4 w-4 text-blue-500" />
      case 'mixed':
        return <Wifi className="h-4 w-4 text-green-500" />
      default:
        return <Play className="h-4 w-4" />
    }
  }

  const getQualityBadge = (stream: TVGardenStreamData) => {
    if (stream.type === 'youtube') {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">YouTube</Badge>
    } else if (stream.type === 'iptv') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">M3U8 Live</Badge>
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Multi-Source</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading live streams from TV Garden...</p>
          <p className="text-sm text-gray-500 mt-2">Extracting direct video URLs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <WifiOff className="h-4 w-4 text-red-500 mr-2" />
            <div className="flex-1 text-red-700">
              {error}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={loadStreams}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const categories = Object.keys(categorizedStreams)
  const filteredStreams = getFilteredStreams()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TV Garden Stream Extractor
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Extract direct video stream URLs from TV Garden. Get M3U8 and YouTube URLs for your own players.
        </p>
        <div className="flex items-center justify-center mt-4 space-x-2 text-sm text-gray-500">
          <Globe className="h-4 w-4" />
          <span>Powered by TV Garden GitHub • {streams.length} US Channels with Direct URLs</span>
        </div>
      </div>

      {/* Success Notification */}
      {copiedUrl && (
        <div className="max-w-md mx-auto mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center text-green-700">
            <Copy className="h-4 w-4 mr-2" />
            <div className="flex-1">
              <div className="font-medium">Stream URL copied to clipboard!</div>
              <div className="text-sm text-green-600 mt-1 font-mono break-all">
                {copiedUrl.length > 60 ? `${copiedUrl.substring(0, 60)}...` : copiedUrl}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs 
          value={selectedCategory} 
          onValueChange={setSelectedCategory}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-8">
            <TabsTrigger value="all">All ({streams.length})</TabsTrigger>
            {categories.slice(0, 7).map(category => (
              <TabsTrigger key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({categorizedStreams[category]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Results Summary */}
      <div className="mb-6 text-center">
        <p className="text-gray-600">
          Showing {filteredStreams.length} channels with direct stream URLs
          {searchQuery && ` matching "${searchQuery}"`}
          {selectedCategory !== 'all' && ` in ${selectedCategory}`}
        </p>
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStreams.map((stream) => (
          <Card key={stream.nanoid} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg leading-6">{stream.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {stream.category.charAt(0).toUpperCase() + stream.category.slice(1)} • {stream.language.toUpperCase()}
                  </CardDescription>
                </div>
                {getStreamIcon(stream)}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* Stream Info */}
                <div className="flex items-center justify-between">
                  {getQualityBadge(stream)}
                  {stream.isGeoBlocked && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Geo-Blocked
                    </Badge>
                  )}
                </div>

                {/* Stream URLs Info */}
                <div className="text-xs text-gray-500">
                  {stream.streamUrls.length > 1 ? 
                    `${stream.streamUrls.length} sources available` : 
                    '1 source available'
                  }
                  {stream.preferredUrl && (
                    <div className="mt-1 font-mono text-xs bg-gray-100 p-1 rounded truncate">
                      {stream.preferredUrl.substring(0, 40)}...
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleStreamPlay(stream)}
                    disabled={!stream.preferredUrl || playingStream === stream.nanoid}
                    className="w-full"
                    variant={playingStream === stream.nanoid ? "secondary" : "default"}
                  >
                    {playingStream === stream.nanoid ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Copying URL...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Get Stream URL
                      </>
                    )}
                  </Button>
                  
                  {stream.preferredUrl && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(stream.preferredUrl!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Direct
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredStreams.length === 0 && (
        <div className="text-center py-12">
          <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No channels found</h3>
          <p className="text-gray-600">
            {searchQuery ? 
              `No channels match "${searchQuery}". Try a different search term.` :
              'No channels available in this category.'
            }
          </p>
          {searchQuery && (
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery('')}
              className="mt-4"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>
          Stream URLs extracted from{' '}
          <a 
            href="https://github.com/TVGarden/tv-garden-channel-list" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            TV Garden GitHub Repository
          </a>
          {' '}• Direct M3U8 and YouTube stream access
        </p>
      </div>
    </div>
  )
}
