"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX, Maximize, X, AlertCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react"

interface LiveTVDirectPlayerProps {
  isOpen: boolean
  onClose: () => void
  streamUrl: string | null
  networkName: string
  networkLogo?: string
}

export function LiveTVDirectPlayer({
  isOpen,
  onClose,
  streamUrl,
  networkName,
  networkLogo
}: LiveTVDirectPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackMethod, setPlaybackMethod] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [hlsInstance, setHlsInstance] = useState<any>(null)
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => `${prev}\n[${timestamp}] ${message}`)
    console.log(`[UNIVERSAL PLAYER] ${message}`)
  }

  const cleanupHLS = () => {
    if (hlsInstance) {
      try {
        hlsInstance.destroy()
        addDebugInfo('🧹 HLS instance destroyed')
      } catch (e) {
        addDebugInfo('⚠️ Error destroying HLS instance')
      }
      setHlsInstance(null)
    }
  }

  // Universal loading method that tries multiple approaches
  const loadVideoUniversal = async () => {
    if (!videoRef.current || !streamUrl) {
      addDebugInfo('❌ No video element or stream URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setPlaybackMethod('')
    cleanupHLS()
    
    const video = videoRef.current
    addDebugInfo(`🔄 Starting universal load for: ${streamUrl}`)

    try {
      let success = false
      const isHLS = streamUrl.includes('.m3u8')

      // Method 1: Native HLS (Safari, iOS, some Android)
      if (isHLS) {
        addDebugInfo('📺 HLS stream detected - trying native support first')
        const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl')
        
        if (canPlayHLS) {
          try {
            video.src = streamUrl
            video.load()
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Native HLS timeout')), 8000)
              
              video.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout)
                addDebugInfo('✅ Native HLS loaded metadata')
                setPlaybackMethod('Native HLS (Safari/iOS)')
                resolve(true)
              }, { once: true })
              
              video.addEventListener('error', () => {
                clearTimeout(timeout)
                reject(new Error('Native HLS failed'))
              }, { once: true })
            })
            
            success = true
          } catch (e) {
            addDebugInfo(`❌ Native HLS failed: ${e}`)
          }
        } else {
          addDebugInfo('❌ Native HLS not supported')
        }
      }

      // Method 2: HLS.js (Chrome, Firefox, Edge)
      if (!success && isHLS) {
        addDebugInfo('🔧 Trying HLS.js fallback')
        try {
          // Dynamic import to handle missing library gracefully
          const { default: Hls } = await import('hls.js')
          
          if (Hls.isSupported()) {
            addDebugInfo('✅ HLS.js is supported')
            
            const hls = new Hls({
              enableWorker: false,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              startLevel: -1,
              capLevelToPlayerSize: true,
              debug: false
            })

            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('HLS.js timeout')), 10000)
              
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                clearTimeout(timeout)
                addDebugInfo('✅ HLS.js manifest parsed')
                setPlaybackMethod('HLS.js (Universal)')
                setHlsInstance(hls)
                resolve(true)
              })

              hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                addDebugInfo(`❌ HLS.js error: ${data.type} - ${data.details}`)
                if (data.fatal) {
                  clearTimeout(timeout)
                  hls.destroy()
                  reject(new Error(`HLS.js fatal error: ${data.details}`))
                }
              })

              hls.loadSource(streamUrl)
              hls.attachMedia(video)
            })
            
            success = true
          } else {
            addDebugInfo('❌ HLS.js not supported in this browser')
          }
        } catch (hlsError) {
          addDebugInfo(`❌ HLS.js failed: ${hlsError}`)
        }
      }

      // Method 3: Direct stream (MP4, WebM, fallback)
      if (!success) {
        addDebugInfo('📱 Trying direct stream fallback')
        try {
          video.src = streamUrl
          video.load()
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Direct stream timeout')), 8000)
            
            video.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout)
              addDebugInfo('✅ Direct stream loaded metadata')
              setPlaybackMethod('Direct Stream')
              resolve(true)
            }, { once: true })
            
            video.addEventListener('error', (e) => {
              clearTimeout(timeout)
              const errorMsg = (e.target as HTMLVideoElement)?.error?.message || 'Unknown error'
              reject(new Error(`Direct stream failed: ${errorMsg}`))
            }, { once: true })
          })
          
          success = true
        } catch (directError) {
          addDebugInfo(`❌ Direct stream failed: ${directError}`)
        }
      }

      if (success) {
        addDebugInfo(`✅ Stream loaded successfully using: ${playbackMethod}`)
        
        // Attempt autoplay (will fail in many browsers due to policy)
        try {
          await video.play()
          setIsPlaying(true)
          addDebugInfo('✅ Autoplay successful')
        } catch (playError: any) {
          addDebugInfo(`⚠️ Autoplay blocked (normal): ${playError.message}`)
          // This is expected - user must click play
        }
      } else {
        throw new Error('All playback methods failed - stream may be unavailable')
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Universal loading failed'
      addDebugInfo(`❌ Universal load failed: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (streamUrl && isOpen) {
      addDebugInfo(`🎬 New stream: ${networkName} - ${streamUrl}`)
      loadVideoUniversal()
    }
    
    return () => {
      cleanupHLS()
    }
  }, [streamUrl, isOpen])

  const handlePlay = async () => {
    if (!videoRef.current) return
    
    try {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
        addDebugInfo('⏸️ Video paused')
      } else {
        await videoRef.current.play()
        setIsPlaying(true)
        addDebugInfo('▶️ Video playing')
      }
    } catch (error: any) {
      addDebugInfo(`❌ Play/pause failed: ${error.message}`)
      setError(`Playback failed: ${error.message}`)
    }
  }

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
      addDebugInfo(`🔊 Mute: ${!isMuted}`)
    }
  }

  const handleFullscreen = () => {
    if (!videoRef.current) return
    
    if (!isFullscreen) {
      videoRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  const handleReload = () => {
    addDebugInfo('🔄 Manual reload requested')
    loadVideoUniversal()
  }

  const handleOpenDirect = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank')
      addDebugInfo('🔗 Opened direct link in new tab')
    }
  }

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => setIsMuted(video.muted)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogTitle className="sr-only">Live TV Player - {networkName}</DialogTitle>
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            {networkLogo && (
              <img src={networkLogo} alt={networkName} className="w-8 h-8 object-contain" />
            )}
            <div>
              <h2 className="text-xl font-bold">🔴 Live TV - {networkName}</h2>
              {playbackMethod && (
                <div className="text-sm text-green-600">📺 Using: {playbackMethod}</div>
              )}
            </div>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Container */}
        <div 
          className="relative bg-black"
          onMouseMove={resetControlsTimeout}
          onMouseEnter={resetControlsTimeout}
        >
          <video
            ref={videoRef}
            className="w-full h-[60vh] object-contain"
            playsInline
            muted={isMuted}
            preload="metadata"
            onClick={handlePlay}
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <div className="text-white text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <div className="text-lg">Loading universal stream...</div>
                <div className="text-sm text-gray-300 mt-1">Trying multiple methods...</div>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90">
              <div className="text-center text-white p-6 max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <div className="text-xl mb-2">Stream Unavailable</div>
                <div className="text-sm text-gray-300 mb-6">{error}</div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button onClick={handleReload} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Try Again
                  </Button>
                  <Button onClick={handlePlay} variant="outline" size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    Force Play
                  </Button>
                  <Button onClick={handleOpenDirect} variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open Direct
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Video Controls */}
          {showControls && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
              <div className="flex items-center gap-2 text-white">
                <Button
                  onClick={handlePlay}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={handleMute}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                
                <div className="flex-1 text-center text-sm">
                  🔴 LIVE • {networkName}
                </div>
                
                <Button
                  onClick={handleFullscreen}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button onClick={handlePlay} disabled={isLoading} size="sm">
              {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isPlaying ? 'Pause' : 'Play'} Stream
            </Button>
            <Button onClick={handleReload} variant="outline" disabled={isLoading} size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Reload
            </Button>
            <Button onClick={handleOpenDirect} variant="outline" size="sm" disabled={!streamUrl}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Direct
            </Button>
          </div>
          
          {debugInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 mb-2">
                🔍 Universal Player Debug Info
              </summary>
              <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto border">
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
