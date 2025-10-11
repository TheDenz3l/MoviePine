'use client'

/**
 * NetflixPlayer - Modern Video Player Component
 * 
 * Built from the ground up with:
 * - Bulletproof cross-browser audio (Chrome, Safari, Firefox, Edge)
 * - Automatic 4K quality selection
 * - Netflix-style UI and controls
 * - Simple, maintainable architecture
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, X, SkipForward, SkipBack, Settings, Subtitles as SubtitlesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HLSLoader } from '@/lib/video/hls-loader'
import { AudioController } from '@/lib/video/audio-controller'
import { useAutoplayPolicy } from '@/hooks/useAutoplayPolicy'
import { NetflixPlayerProps } from '@/lib/video/types'

// ============================================================================
// Main Component
// ============================================================================

export function NetflixPlayer({
  src,
  title,
  onClose,
  autoPlay = true,
  startTime = 0,
  subtitles = [],
  episodeInfo,
  allEpisodes = [],
  onEpisodeChange,
  onError,
  onTimeUpdate,
  onEnded
}: NetflixPlayerProps) {
  
  // ============================================================================
  // Refs
  // ============================================================================
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsLoaderRef = useRef<HLSLoader | null>(null)
  const audioControllerRef = useRef<AudioController | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // Playback State
  // ============================================================================
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(0)

  // ============================================================================
  // Volume State
  // ============================================================================
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  // ============================================================================
  // UI State
  // ============================================================================
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuality, setCurrentQuality] = useState<string>('Loading...')

  // ============================================================================
  // Autoplay Policy
  // ============================================================================
  const { needsUserGesture, enablePlayback } = useAutoplayPolicy(videoRef, autoPlay)

  // ============================================================================
  // Player Initialization
  // ============================================================================
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const initPlayer = async () => {
      try {
        console.log('🎬 Initializing Netflix Player...')
        setIsLoading(true)
        setError(null)

        // Get source URL
        const sourceUrl = typeof src === 'string' ? src : src.url

        // Initialize Audio Controller
        const audioCtrl = new AudioController(video)
        audioControllerRef.current = audioCtrl

        // Set up audio callback
        audioCtrl.onVolumeChange((vol, muted) => {
          setVolume(vol)
          setIsMuted(muted)
        })

        // Ensure audio is enabled (unmute if needed)
        console.log('🔊 Initial audio state:', {
          muted: video.muted,
          volume: video.volume
        })
        
        // Explicitly unmute and set volume
        video.muted = false
        video.volume = 0.8
        console.log('🔊 Audio explicitly enabled')

        // Initialize HLS Loader
        const hlsLoader = new HLSLoader()
        hlsLoaderRef.current = hlsLoader

        // Set up HLS callbacks
        hlsLoader.onError((code, message) => {
          console.error('❌ HLS Error:', code, message)
          setError(message)
          if (onError) {
            onError({ code, message, recoverable: false })
          }
        })

        hlsLoader.onQualityChange((quality) => {
          setCurrentQuality(quality)
          console.log('📊 Quality changed to:', quality)
        })

        hlsLoader.onProgress((percent) => {
          setBufferedPercent(percent)
        })

        // Load stream
        console.log('🔄 Loading stream...')
        const streamInfo = await hlsLoader.loadStream(sourceUrl, video)
        setCurrentQuality(streamInfo.quality)
        console.log('✅ Stream loaded:', streamInfo)

        // Set start time
        if (startTime > 0) {
          video.currentTime = startTime
          console.log('⏩ Set start time to:', startTime)
        }

        setIsLoading(false)
        console.log('✅ Player initialized successfully')

        // Auto-play if enabled
        if (autoPlay) {
          try {
            console.log('▶️ Attempting autoplay...')
            await video.play()
            setIsPlaying(true)
            console.log('✅ Autoplay successful')
          } catch (err) {
            console.log('⚠️ Autoplay prevented, waiting for user gesture:', err)
          }
        }
      } catch (err: any) {
        console.error('❌ Player initialization error:', err)
        setError(err.message || 'Failed to load video')
        setIsLoading(false)
        if (onError) {
          onError({
            code: 'INIT_ERROR',
            message: err.message || 'Failed to load video',
            recoverable: false
          })
        }
      }
    }

    initPlayer()

    // Cleanup
    return () => {
      hlsLoaderRef.current?.destroy()
      audioControllerRef.current?.destroy()
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [src, startTime, autoPlay, onError])

  // ============================================================================
  // Video Event Handlers
  // ============================================================================
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const time = video.currentTime
      setCurrentTime(time)
      if (onTimeUpdate) {
        onTimeUpdate(time)
      }
    }

    const handleDurationChange = () => {
      setDuration(video.duration)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      if (onEnded) {
        onEnded()
      }
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const percent = (bufferedEnd / video.duration) * 100
        setBufferedPercent(percent)
      }
    }

    const handleWaiting = () => {
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    const handleError = (e: Event) => {
      console.error('❌ Video element error:', e)
      const videoError = video.error
      
      if (videoError) {
        let errorMessage = 'Network error loading video'
        
        switch (videoError.code) {
          case videoError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted'
            break
          case videoError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error loading video'
            break
          case videoError.MEDIA_ERR_DECODE:
            errorMessage = 'Video decoding failed'
            break
          case videoError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported'
            break
        }
        
        console.error('❌ Video error details:', {
          code: videoError.code,
          message: videoError.message,
          interpreted: errorMessage
        })
        
        setError(errorMessage)
        setIsLoading(false)
        
        if (onError) {
          onError({
            code: 'VIDEO_ERROR',
            message: errorMessage,
            recoverable: false
          })
        }
      }
    }

    const handleStalled = () => {
      console.warn('⚠️ Video stalled, network might be slow')
      setIsLoading(true)
    }

    const handleLoadedMetadata = () => {
      console.log('✅ Video metadata loaded')
    }

    const handleLoadedData = () => {
      console.log('✅ Video data loaded')
      setIsLoading(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('stalled', handleStalled)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('stalled', handleStalled)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [onTimeUpdate, onEnded])

  // ============================================================================
  // Playback Controls
  // ============================================================================
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(err => {
        console.error('Play error:', err)
      })
    }
  }, [isPlaying])

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = time
    setCurrentTime(time)
  }, [])

  const skipForward = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    video.currentTime = Math.min(video.duration, video.currentTime + 10)
  }, [])

  const skipBackward = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    video.currentTime = Math.max(0, video.currentTime - 10)
  }, [])

  // ============================================================================
  // Volume Controls
  // ============================================================================
  const handleVolumeChange = useCallback((newVolume: number) => {
    audioControllerRef.current?.setVolume(newVolume)
  }, [])

  const toggleMute = useCallback(() => {
    audioControllerRef.current?.toggleMute()
  }, [])

  const increaseVolume = useCallback(() => {
    audioControllerRef.current?.increaseVolume(0.1)
  }, [])

  const decreaseVolume = useCallback(() => {
    audioControllerRef.current?.decreaseVolume(0.1)
  }, [])

  // ============================================================================
  // Fullscreen Controls
  // ============================================================================
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // ============================================================================
  // Auto-Hide Controls
  // ============================================================================
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  const handleMouseMove = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'arrowleft':
          e.preventDefault()
          skipBackward()
          break
        case 'arrowright':
          e.preventDefault()
          skipForward()
          break
        case 'arrowup':
          e.preventDefault()
          increaseVolume()
          break
        case 'arrowdown':
          e.preventDefault()
          decreaseVolume()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'escape':
          if (document.fullscreenElement) {
            document.exitFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, skipForward, skipBackward, increaseVolume, decreaseVolume, toggleMute, toggleFullscreen])

  // ============================================================================
  // Helper Functions
  // ============================================================================
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00'
    
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onClick={resetControlsTimeout}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
        preload="auto"
        controls={false}
      />

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg">Loading {currentQuality}...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center px-8 max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-white text-2xl font-bold mb-2">Playback Error</h2>
            <p className="text-white/80 mb-6">{error}</p>
            <Button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
            >
              Close Player
            </Button>
          </div>
        </div>
      )}

      {/* User Gesture Required Overlay */}
      {needsUserGesture && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/80 cursor-pointer z-40"
          onClick={(e) => {
            e.stopPropagation()
            enablePlayback()
          }}
        >
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
              <Play className="w-12 h-12 text-white ml-1" fill="white" />
            </div>
            <p className="text-white text-xl font-semibold mb-2">Click to Play</p>
            <p className="text-white/60 text-sm">Audio requires your permission</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-start justify-between pointer-events-auto">
          <div className="flex-1">
            <h1 className="text-white text-2xl font-bold drop-shadow-lg">{title}</h1>
            {episodeInfo && (
              <p className="text-white/80 text-sm mt-1">
                Season {episodeInfo.seasonNumber} · Episode {episodeInfo.episodeNumber}
              </p>
            )}
          </div>
          
          {/* Quality Badge */}
          {currentQuality && currentQuality !== 'Loading...' && (
            <div className="bg-black/60 text-white px-3 py-1 rounded text-xs font-bold mr-4">
              {currentQuality}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-8 h-8" />
          </Button>
        </div>

        {/* Center Play/Pause (when paused) */}
        {!isPlaying && !isLoading && !error && !needsUserGesture && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
            >
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3 pointer-events-auto">
          {/* Progress Bar */}
          <div className="relative group">
            {/* Progress Bar Container */}
            <div
              className="relative h-1 group-hover:h-2 transition-all duration-150 bg-white/20 rounded-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                handleSeek(percent * duration)
              }}
            >
              {/* Buffered Progress */}
              <div
                className="absolute h-full bg-white/30 rounded-full"
                style={{ width: `${bufferedPercent}%` }}
              />
              
              {/* Played Progress */}
              <div
                className="absolute h-full bg-red-600 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Scrubber Handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                style={{ left: `${progressPercent}%`, marginLeft: '-6px' }}
              />
            </div>

            {/* Time Display */}
            <div className="flex justify-between text-xs text-white/80 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 w-12 h-12"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" fill="white" />
                ) : (
                  <Play className="w-8 h-8 ml-0.5" fill="white" />
                )}
              </Button>

              {/* Skip Backward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={skipBackward}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-6 h-6" />
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={skipForward}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-6 h-6" />
              </Button>

              {/* Volume Controls */}
              <div className="flex items-center gap-2 group/volume">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </Button>

                {/* Volume Slider */}
                <div className="relative w-0 group-hover/volume:w-24 transition-all duration-200 overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume * 100}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value) / 100)}
                    className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                             [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                             [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.2) ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                </div>

                {/* Volume Percentage */}
                <span className="text-white text-sm w-0 group-hover/volume:w-10 transition-all duration-200 overflow-hidden">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Subtitles Button (placeholder) */}
              {subtitles && subtitles.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  title="Subtitles (Coming Soon)"
                >
                  <SubtitlesIcon className="w-6 h-6" />
                </Button>
              )}

              {/* Settings Button (placeholder) */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                title="Settings"
              >
                <Settings className="w-6 h-6" />
              </Button>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
