"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, X, Languages, Subtitles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { RecentlyPlayedService } from "@/lib/services/recently-played-service"
import { saveEpisodeProgress } from '@/lib/services/episode-progress'

// Extend HTMLVideoElement with vendor specific / non-standard fields we probe defensively
declare global {
  interface HTMLVideoElement {
    audioTracks?: any
    mozHasAudio?: boolean
    webkitAudioDecodedByteCount?: number
    videoTracks?: any
  }
}

interface VideoPlayerProps {
  src: string
  title: string
  onClose: () => void
  autoPlay?: boolean
  onError?: (error: string) => void
  availableSubtitles?: string[] // Subtitle languages available from the stream (fake metadata)
  realSubtitles?: Array<{
    language: string
    label: string
    url: string
    isExternal: boolean
  }> // Real subtitle files from SubDL API
  movieId?: string // For recently played tracking
  movieData?: {
    id: string
    title: string
    poster: string
    year?: number
    genre?: string[]
  } // Movie data for recently played
  startTime?: number // Resume from specific time
}

export function VideoPlayer({
  src,
  title,
  onClose,
  autoPlay = true,
  onError,
  availableSubtitles = [],
  realSubtitles = [],
  movieId,
  movieData,
  startTime = 0
}: VideoPlayerProps) {
  // Validate source URL
  if (!src || typeof src !== 'string' || src.trim() === '') {
    console.error('❌ Invalid video source provided:', src)
    if (onError) {
      onError('Invalid video source. Please try a different stream.')
    }
    return null
  }

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8) // Start at 80% volume
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const [audioTracks, setAudioTracks] = useState<{ id: string; label: string; language: string }[]>([])
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: string; label: string; language: string; src?: string }[]>([])
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>('')
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<string>('off')
  const [customSubtitles, setCustomSubtitles] = useState<{ text: string; startTime: number; endTime: number }[]>([])
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('')
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Enhanced audio context activation function
  const activateAudioContext = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) {
        console.log('🔊 AudioContext not supported')
        return
      }

      const audioContext = new AudioContext()
      console.log(`🔊 AudioContext state: ${audioContext.state}`)

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('🔊 AudioContext activated successfully')
        }).catch((error) => {
          console.log('🔊 AudioContext activation failed:', error)
        })
      }

      // Create a brief audio buffer to ensure audio is working
      const buffer = audioContext.createBuffer(1, 1, 22050)
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start(0)

      console.log('🔊 Audio test buffer created and played')
    } catch (error) {
      console.log('🔊 Audio context setup failed:', error)
    }
  }

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Function to check if audio is actually playing
    const checkAudioPlayback = () => {
      if (!videoRef.current?.isConnected) return
      const video = videoRef.current

      console.log(`🔊 Audio playback check: volume=${video.volume}, muted=${video.muted}, paused=${video.paused}`)
      console.log(`🔊 Audio tracks: ${video.audioTracks ? video.audioTracks.length : 'not supported'}`)

      // Check if we can detect audio activity
      if (video.mozHasAudio !== undefined) {
        console.log(`🔊 Mozilla audio detection: ${video.mozHasAudio}`)
      }
      if (video.webkitAudioDecodedByteCount !== undefined) {
        console.log(`🔊 WebKit audio bytes: ${video.webkitAudioDecodedByteCount}`)
      }
    }

    // Set up a timeout to detect if video takes too long to load
    const loadTimeout = setTimeout(() => {
      if (isLoading && onError) {
        onError('Video is taking too long to load. The stream may be unavailable or your connection is slow.')
      }
    }, 30000) // 30 second timeout

    const handleLoadedMetadata = () => {
      // Check if video element is still in the DOM before proceeding
      if (!video.isConnected) return

      clearTimeout(loadTimeout)
      setDuration(video.duration)
      setIsLoading(false)

      // Enhanced audio configuration and codec detection
      video.volume = volume
      video.muted = false

      // Force audio context activation for better browser compatibility
      if (video.volume === 0) {
        video.volume = 0.8
        setVolume(0.8)
      }

      // Detect audio capabilities and codec support
      const hasAudioTracks = video.audioTracks && video.audioTracks.length > 0
      const hasAudioData = video.mozHasAudio !== false && video.webkitAudioDecodedByteCount !== 0
      const audioSupported = video.canPlayType && (
        video.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '' ||
        video.canPlayType('audio/mpeg') !== '' ||
        video.canPlayType('audio/ogg; codecs="vorbis"') !== '' ||
        video.canPlayType('audio/webm; codecs="opus"') !== ''
      )

      console.log(`🔊 Audio configured: volume=${video.volume}, muted=${video.muted}, hasAudio=${!video.muted && video.volume > 0}`)
      console.log(`🔊 Video element audio properties: readyState=${video.readyState}, networkState=${video.networkState}`)
      console.log(`🔊 Audio detection: hasAudioTracks=${hasAudioTracks}, hasAudioData=${hasAudioData}, audioSupported=${audioSupported}`)
  console.log(`🔊 Audio codec support check: ${video.canPlayType('video/mp4') ? 'supported' : 'not supported'}`)

      // Try to activate audio context immediately
      activateAudioContext()

      // Discover available audio and subtitle tracks
      discoverTracks()

      // Set start time if resuming playback
      if (startTime > 0 && startTime < video.duration) {
        video.currentTime = startTime
        setCurrentTime(startTime)
        console.log(`📺 Resuming playback from ${startTime}s`)
      }

      if (autoPlay) {
        // Use a promise-based approach to handle play() properly
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Only update state if video is still connected
              if (video.isConnected) {
                setIsPlaying(true)
                console.log('🔊 Video and audio playback started successfully')
                // Double-check audio after playback starts
                // Internal audio playback check (scoped) will run after start
              }
            })
            .catch((error) => {
              console.log('Video play was interrupted:', error)
              // Don't treat this as a fatal error
              setIsPlaying(false)
            })
        }
      }
    }

  const handleTimeUpdate = () => {
      const currentVideoTime = video.currentTime
      setCurrentTime(currentVideoTime)

      // Update recently played progress every 10 seconds
      if (movieId && movieData && duration > 0) {
        const progressUpdateInterval = 10 // seconds
        if (Math.floor(currentVideoTime) % progressUpdateInterval === 0 &&
            Math.floor(currentVideoTime) !== Math.floor(currentVideoTime - 0.1)) {
          RecentlyPlayedService.updateProgress(movieId, currentVideoTime, duration)
        }
      }

      // Persist per-episode progress locally if this is a series episode composite id
  if (movieId && /:S\d+E\d+/.test(movieId) && duration > 0) {
        const match = movieId.match(/^(.*):S(\d+)E(\d+)/)
        if (match) {
          const seriesBase = match[1]
          const season = match[2]
            const episode = match[3]
            const fraction = currentVideoTime / duration
            // Only write every 5s to reduce churn
            if (Math.floor(currentVideoTime) % 5 === 0 && Math.floor(currentVideoTime) !== Math.floor(currentVideoTime - 0.1)) {
              try {
                localStorage.setItem(`series-episode-progress:${seriesBase}:S${season}E${episode}`, JSON.stringify({ fraction, seconds: currentVideoTime }))
        saveEpisodeProgress({ seriesId: seriesBase, season: parseInt(season, 10), episode: parseInt(episode, 10), seconds: currentVideoTime, duration })
              } catch {}
            }
        }
      }

      // Update custom subtitles with enhanced debugging
      if (customSubtitles.length > 0 && selectedSubtitleTrack !== 'off') {
        const activeSubtitle = customSubtitles.find(
          sub => currentVideoTime >= sub.startTime && currentVideoTime <= sub.endTime
        )

        // Enhanced debug logging every 5 seconds
        if (Math.floor(currentVideoTime) % 5 === 0 && Math.floor(currentVideoTime) !== Math.floor(currentVideoTime - 0.1)) {
          console.log(`📝 Subtitle check at ${currentVideoTime.toFixed(1)}s:`)
          console.log(`📝 - Custom subtitles: ${customSubtitles.length}`)
          console.log(`📝 - Selected track: ${selectedSubtitleTrack}`)
          console.log(`📝 - Active subtitle: ${activeSubtitle ? `"${activeSubtitle.text.substring(0, 30)}..."` : 'None'}`)
          if (customSubtitles.length > 0) {
            console.log(`📝 - First subtitle timing: ${customSubtitles[0].startTime}-${customSubtitles[0].endTime}`)
          }
        }

        setCurrentSubtitle(activeSubtitle?.text || '')
      } else {
        setCurrentSubtitle('')
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)

      // Add to recently played when playback starts
      if (movieId && movieData) {
        RecentlyPlayedService.add(movieData)
      }

      // Start auto-hide controls when playback begins
      startAutoHideControls()
    }

    const handlePause = () => {
      setIsPlaying(false)

      // Update progress when paused
      if (movieId && movieData && duration > 0) {
        RecentlyPlayedService.updateProgress(movieId, currentTime, duration)
      }
    }
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    const handleFullscreenChange = () => {
      // Check for fullscreen element with browser compatibility
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFullscreen)
      console.log(`📺 Fullscreen state changed: ${isFullscreen}`)
    }

    const handleTextTrackChange = () => {
      console.log(`📝 🎯 TEXT TRACK CHANGE EVENT FIRED!`)
      if (video.textTracks) {
        console.log(`📝 Text tracks after change: ${video.textTracks.length}`)
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i]
          console.log(`📝 Track ${i}: ${track.kind} - ${track.label} (${track.language}) - Mode: ${track.mode}`)
        }
      }
    }

    const handleLoadedData = () => {
      console.log(`📝 🎯 LOADED DATA EVENT - Video fully loaded!`)
      console.log(`📝 Checking for text tracks after loadeddata...`)
      if (video.textTracks && video.textTracks.length > 0) {
        console.log(`📝 ✅ Found ${video.textTracks.length} text tracks after loadeddata`)
        discoverTracks()
      }
    }

    const handleError = (error: Event) => {
      console.error('Video error:', error)
      setIsLoading(false)
      setIsPlaying(false)

      // Notify parent component about the error
      if (onError) {
        const videoElement = error.target as HTMLVideoElement
        const errorCode = videoElement?.error?.code
        let errorMessage = 'Video playback failed'

        switch (errorCode) {
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video. The stream may be temporarily unavailable.'
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video format not supported or corrupted stream.'
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video source not supported. Try a different stream.'
            break
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted.'
            break
          default:
            errorMessage = 'Video playback failed. The stream may be temporarily unavailable.'
        }

        onError(errorMessage)
      }
    }

    const handleAbort = () => {
      console.log('Video loading aborted')
      setIsLoading(false)
      setIsPlaying(false)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('error', handleError)
    video.addEventListener('abort', handleAbort)

    // Listen for text track changes
    if (video.textTracks) {
      video.textTracks.addEventListener('addtrack', handleTextTrackChange)
      video.textTracks.addEventListener('change', handleTextTrackChange)
      video.textTracks.addEventListener('removetrack', handleTextTrackChange)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      // Clear the timeout
      clearTimeout(loadTimeout)

      // Pause video before cleanup to prevent play() interruption errors
      if (video.isConnected && !video.paused) {
        video.pause()
      }

      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('error', handleError)
      video.removeEventListener('abort', handleAbort)

      // Remove text track listeners
      if (video.textTracks) {
        video.textTracks.removeEventListener('addtrack', handleTextTrackChange)
        video.textTracks.removeEventListener('change', handleTextTrackChange)
        video.textTracks.removeEventListener('removetrack', handleTextTrackChange)
      }

      // Add fullscreen event listeners with browser compatibility
      // Remove fullscreen event listeners with browser compatibility
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.addEventListener('mozfullscreenchange', handleFullscreenChange)
      document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [autoPlay, volume])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || !video.isConnected) return

    if (isPlaying) {
      video.pause()
      // Show controls when paused
      setShowControls(true)
    } else {
      // Ensure audio is enabled before playing
      video.muted = false
      video.volume = volume > 0 ? volume : 0.8
      console.log(`🔊 Play initiated: volume=${video.volume}, muted=${video.muted}`)

      // Enhanced audio context activation
      activateAudioContext()

      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('🔊 Video and audio playback started successfully')
          // Check audio after a short delay
          // Removed external audio check (scoped helper)
          // Auto-hide controls after starting playback
          startAutoHideControls()
        }).catch((error) => {
          console.log('Video play was interrupted:', error)
          // Don't treat this as a fatal error, just update state
          setIsPlaying(false)
        })
      }
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted

    // If unmuting, ensure volume is set and try to activate audio context
    if (!video.muted) {
      if (video.volume === 0) {
        video.volume = 0.8
        setVolume(0.8)
      }

      // Enhanced audio context activation
      activateAudioContext()

      console.log(`🔊 Unmuted: volume=${video.volume}, muted=${video.muted}`)

      // Check audio after unmuting
  // Removed external audio check (scoped helper)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return

    video.volume = newVolume
    setVolume(newVolume)
  }

  const handleSeek = (newTime: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        // Try different fullscreen methods for better browser compatibility
        if (container.requestFullscreen) {
          await container.requestFullscreen()
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen()
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen()
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen()
        } else {
          console.warn('Fullscreen API not supported')
          return
        }
        console.log('✅ Fullscreen activated')
      } else {
        // Exit fullscreen with browser compatibility
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
        console.log('✅ Fullscreen exited')
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
      // Provide user feedback about the error
      if (error instanceof Error && error.message.includes('not granted')) {
        console.warn('Fullscreen request denied by browser. This may be due to browser security policies.')
      }
    }
  }

  const skipTime = (seconds: number) => {
    const video = videoRef.current
    if (!video) return

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    handleSeek(newTime)
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      // Only hide controls if video is playing and not paused
      if (isPlaying && videoRef.current && !videoRef.current.paused) {
        setShowControls(false)
      }
    }, 3000)
  }

  // Auto-hide controls when playback starts
  const startAutoHideControls = () => {
    // Small delay to ensure playback has actually started
    setTimeout(() => {
      if (isPlaying && videoRef.current && !videoRef.current.paused) {
        showControlsTemporarily()
      }
    }, 500)
  }

  const showCursorTemporarily = () => {
    setShowCursor(true)

    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current)
    }

    cursorTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showControls) {
        setShowCursor(false)
      }
    }, 2000) // Hide cursor after 2 seconds of inactivity
  }

  // Show cursor when controls are visible
  useEffect(() => {
    if (showControls) {
      setShowCursor(true)
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current)
      }
    }
  }, [showControls])

  // Auto-hide controls when playback starts
  useEffect(() => {
    if (isPlaying && videoRef.current && !videoRef.current.paused) {
      startAutoHideControls()
    }
  }, [isPlaying])

  const handleMouseMove = () => {
    showControlsTemporarily()
    showCursorTemporarily()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // Show controls temporarily for any keyboard interaction
    showControlsTemporarily()

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        togglePlay()
        break
      case 'ArrowLeft':
        e.preventDefault()
        skipTime(-10)
        break
      case 'ArrowRight':
        e.preventDefault()
        skipTime(10)
        break
      case 'KeyM':
        e.preventDefault()
        toggleMute()
        break
      case 'KeyF':
        e.preventDefault()
        toggleFullscreen()
        break
      case 'Escape':
        if (isFullscreen) {
          // Exit fullscreen with browser compatibility
          if (document.exitFullscreen) {
            document.exitFullscreen()
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen()
          } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen()
          } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen()
          }
        } else {
          onClose()
        }
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current)
      }
    }
  }, [isPlaying, isFullscreen, currentTime, duration])

  // Track handling functions
  const discoverTracks = () => {
    const video = videoRef.current
    if (!video) return

    console.log('🎵 Discovering audio and subtitle tracks...')

    // Discover audio tracks
    const audioTrackList: { id: string; label: string; language: string }[] = []
    if (video.audioTracks && video.audioTracks.length > 0) {
      console.log(`🎵 Found ${video.audioTracks.length} audio tracks`)
      for (let i = 0; i < video.audioTracks.length; i++) {
        const track = video.audioTracks[i]
        audioTrackList.push({
          id: i.toString(),
          label: track.label || `Audio Track ${i + 1}`,
          language: track.language || 'unknown'
        })
        console.log(`🎵 Audio Track ${i}: ${track.label || 'Unlabeled'} (${track.language || 'unknown'})`)
      }
    } else {
      console.log('🎵 No native audio tracks found, adding default streaming options')
      // For streaming content, provide common audio language options
      audioTrackList.push(
        { id: 'default', label: 'English', language: 'en' },
        { id: 'alt1', label: 'Original Audio', language: 'original' }
      )
    }

    // Discover subtitle tracks
    const subtitleTrackList: { id: string; label: string; language: string; src?: string }[] = [
      { id: 'off', label: 'Off', language: 'none' }
    ]

    // Enhanced text track detection with multiple checks
    const checkForTextTracks = () => {
      console.log(`📝 🔍 COMPREHENSIVE TEXT TRACK ANALYSIS:`)
      console.log(`📝 Video element:`, video)
      console.log(`📝 Video src:`, video.src?.substring(0, 100) + '...')
      console.log(`📝 Video readyState:`, video.readyState)
      console.log(`📝 Video networkState:`, video.networkState)
      console.log(`📝 TextTracks object:`, video.textTracks)
      console.log(`📝 TextTracks length:`, video.textTracks?.length || 0)

      if (video.textTracks && video.textTracks.length > 0) {
        console.log(`📝 ✅ FOUND ${video.textTracks.length} NATIVE TEXT TRACKS IN VIDEO!`)
        const updatedSubtitleTracks = [{ id: 'off', label: 'Off', language: 'none' }]

        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i]
          console.log(`📝 Native Track ${i}:`)
          console.log(`📝   - Kind: ${track.kind}`)
          console.log(`📝   - Label: "${track.label || 'Unlabeled'}"`)
          console.log(`📝   - Language: ${track.language || 'unknown'}`)
          console.log(`📝   - Mode: ${track.mode}`)
          // readyState is non-standard on some browsers; skipped
          console.log(`📝   - Cues: ${track.cues?.length || 0}`)

          if (track.kind === 'subtitles' || track.kind === 'captions') {
            updatedSubtitleTracks.push({
              id: i.toString(),
              label: track.label || `${track.kind} ${i + 1}`,
              language: track.language || 'unknown'
            })
          }
        }

        if (updatedSubtitleTracks.length > 1) {
          setSubtitleTracks(updatedSubtitleTracks)
          console.log(`📝 ✅ Updated subtitle tracks with ${updatedSubtitleTracks.length - 1} native tracks`)
          return true
        }
      } else {
        console.log(`📝 ❌ No native text tracks found in video`)

        // Check if video has any tracks at all
        if (video.audioTracks) {
          console.log(`📝 Audio tracks available: ${video.audioTracks.length}`)
        }
        if (video.videoTracks) {
          console.log(`📝 Video tracks available: ${video.videoTracks.length}`)
        }
      }
      return false
    }

    // Check immediately
    checkForTextTracks()

    // Check after 1 second
    setTimeout(() => {
      console.log(`📝 🔄 Checking for text tracks after 1 second...`)
      checkForTextTracks()
    }, 1000)

    // Check after 3 seconds
    setTimeout(() => {
      console.log(`📝 🔄 Checking for text tracks after 3 seconds...`)
      checkForTextTracks()
    }, 3000)

    if (video.textTracks && video.textTracks.length > 0) {
      console.log(`📝 Found ${video.textTracks.length} text tracks (immediate check)`)
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i]
        console.log(`📝 Text Track ${i}: ${track.kind} - ${track.label || 'Unlabeled'} (${track.language || 'unknown'})`)
        if (track.kind === 'subtitles' || track.kind === 'captions') {
          subtitleTrackList.push({
            id: i.toString(),
            label: track.label || `${track.kind} ${i + 1}`,
            language: track.language || 'unknown'
          })
        }
      }
    } else {
      console.log('📝 No native text tracks found, checking for real subtitles from SubDL API')

      // Prioritize real subtitles from SubDL API
      if (realSubtitles && realSubtitles.length > 0) {
        console.log(`📝 ✅ FOUND ${realSubtitles.length} REAL SUBTITLE FILES FROM SUBDL API!`)

        realSubtitles.forEach((subtitle, index) => {
          console.log(`📝 Real Subtitle ${index}: ${subtitle.label} (${subtitle.language}) - URL: ${subtitle.url}`)

          // Add real subtitle track to the list
          subtitleTrackList.push({
            id: `real_${subtitle.language}`,
            label: subtitle.label,
            language: subtitle.language,
            src: subtitle.url
          })

          // Create and add HTML5 track element to video
          const trackElement = document.createElement('track')
          trackElement.kind = 'subtitles'
          trackElement.src = subtitle.url
          trackElement.srclang = subtitle.language
          trackElement.label = subtitle.label
          trackElement.default = false // Start with subtitles OFF

          // Add to video element
          video.appendChild(trackElement)
          console.log(`📝 Added HTML5 track element for ${subtitle.label}`)
        })

        console.log(`📝 ✅ Successfully loaded ${realSubtitles.length} real subtitle tracks`)
      } else if (availableSubtitles && availableSubtitles.length > 0) {
        console.log(`📝 ⚠️ Falling back to fake subtitle metadata (${availableSubtitles.length} languages)`)
        console.log(`📝 VideoPlayer: Stream title: ${title}`)
        console.log(`📝 VideoPlayer: Video source: ${src?.substring(0, 50)}...`)

        // Language code to name mapping
        const languageNames: Record<string, string> = {
          'en': 'English',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'it': 'Italian',
          'pt': 'Portuguese',
          'ru': 'Russian',
          'ja': 'Japanese',
          'ko': 'Korean',
          'zh': 'Chinese',
          'nl': 'Dutch',
          'sv': 'Swedish',
          'no': 'Norwegian',
          'da': 'Danish',
          'fi': 'Finnish',
          'pl': 'Polish',
          'cs': 'Czech',
          'hu': 'Hungarian',
          'tr': 'Turkish',
          'ar': 'Arabic',
          'he': 'Hebrew',
          'hi': 'Hindi',
          'th': 'Thai',
          'vi': 'Vietnamese'
        }

        availableSubtitles.forEach(langCode => {
          const trackLabel = languageNames[langCode] || langCode.toUpperCase()
          subtitleTrackList.push({
            id: langCode,
            label: trackLabel,
            language: langCode,
            src: 'stream'
          })
          console.log(`📝 VideoPlayer: Added subtitle track: ${trackLabel} (${langCode})`)
        })
      } else {
        console.log('📝 No subtitle information available from stream')
        // Provide a basic set of common subtitle options as fallback
        subtitleTrackList.push(
          { id: 'en', label: 'English', language: 'en', src: 'external' }
        )
      }
    }

    setAudioTracks(audioTrackList)
    setSubtitleTracks(subtitleTrackList)

    console.log(`🎛️ Audio tracks available: ${audioTrackList.length}`)
    console.log(`📝 VideoPlayer: Final subtitle track list:`, subtitleTrackList.map(t => `${t.label} (${t.id})`))
    console.log(`📝 VideoPlayer: Total subtitle tracks available: ${subtitleTrackList.length}`)

    // Set default selections
    if (audioTrackList.length > 0) {
      setSelectedAudioTrack('0')
    }
  }

  const selectAudioTrack = (trackId: string) => {
    const video = videoRef.current
    if (!video) {
      console.log('🎵 Cannot select audio track: video not available')
      return
    }

    console.log(`🎵 Selecting audio track: ${trackId}`)

    // For proxied streams, we don't have native audioTracks
    // Instead, we'll ensure audio is properly enabled and configured
    try {
      // Ensure audio is enabled and not muted
      video.muted = false
      video.volume = volume > 0 ? volume : 0.8

      // For proxied streams, we can't actually switch tracks
      // but we can ensure audio is working properly
      setSelectedAudioTrack(trackId)
      console.log(`🎵 Audio track ${trackId} selected (proxied stream)`)
      console.log(`🔊 Audio state: volume=${video.volume}, muted=${video.muted}`)

      // Try to trigger audio context if needed (for autoplay policy)
      if (video.paused) {
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('🎵 Audio enabled through play action')
          }).catch((error) => {
            console.log('🎵 Play failed, but audio should still work on user interaction:', error)
          })
        }
      }
    } catch (error) {
      console.error('🎵 Error configuring audio:', error)
    }
  }

  // Function to parse SRT subtitle format
  const parseSRT = (srtContent: string) => {
    const subtitles: { text: string; startTime: number; endTime: number }[] = []
    const blocks = srtContent.trim().split('\n\n')

    for (const block of blocks) {
      const lines = block.split('\n')
      if (lines.length >= 3) {
        const timeLine = lines[1]
        const textLines = lines.slice(2)

        const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
        if (timeMatch) {
          const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
          const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000

          subtitles.push({
            text: textLines.join('\n'),
            startTime,
            endTime
          })
        }
      }
    }

    return subtitles
  }

  // Function to load external subtitles
  const loadExternalSubtitles = async (language: string, source: string = 'external') => {
    try {
      console.log(`📝 Attempting to load subtitles for language: ${language} from ${source}`)

      if (source === 'stream') {
        // For stream-based subtitles, show a message that subtitles are embedded
        console.log(`📝 Subtitles for ${language} are embedded in the stream`)

        // Create a placeholder message for stream-based subtitles
        const streamSubtitles = [
          { text: `${language.toUpperCase()} subtitles are embedded in this stream`, startTime: 5, endTime: 10 },
          { text: "If you don't see subtitles, they may not be available for this specific video file", startTime: 15, endTime: 20 }
        ]

        setCustomSubtitles(streamSubtitles)
        console.log(`📝 Stream-based subtitles enabled for ${language}`)
        return true
      } else {
        // For external subtitles, show a sample/placeholder
        const sampleSubtitles = [
          { text: "External subtitle loading not yet implemented", startTime: 10, endTime: 15 },
          { text: "This stream may have embedded subtitles", startTime: 20, endTime: 25 }
        ]

        setCustomSubtitles(sampleSubtitles)
        console.log(`📝 External subtitle placeholder loaded for ${language}`)
        return true
      }
    } catch (error) {
      console.error('📝 Error loading subtitles:', error)
      return false
    }
  }

  const selectSubtitleTrack = async (trackId: string) => {
    const video = videoRef.current
    if (!video) {
      console.log('📝 Cannot select subtitle track: video not available')
      return
    }

    console.log(`📝 Selecting subtitle track: ${trackId}`)

    try {
      // Clear custom subtitles first
      setCustomSubtitles([])
      setCurrentSubtitle('')

      // Always disable all existing text tracks first
      if (video.textTracks && video.textTracks.length > 0) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i]
          if (track.kind === 'subtitles' || track.kind === 'captions') {
            track.mode = 'disabled'
            console.log(`📝 Disabled native track ${i}: ${track.label || 'Unlabeled'}`)
          }
        }
      }

      if (trackId === 'off') {
        console.log('📝 All subtitles turned off')
        setSelectedSubtitleTrack(trackId)
        return
      }

      // Handle native text tracks (numeric IDs)
      if (!isNaN(parseInt(trackId))) {
        const trackIndex = parseInt(trackId)
        if (video.textTracks && trackIndex >= 0 && trackIndex < video.textTracks.length) {
          const track = video.textTracks[trackIndex]
          if (track.kind === 'subtitles' || track.kind === 'captions') {
            track.mode = 'showing'
            console.log(`📝 ✅ ENABLED NATIVE SUBTITLE TRACK ${trackId}: ${track.label || 'Unlabeled'} (${track.language || 'unknown'})`)
            console.log(`📝 Track mode set to: ${track.mode}`)
            // Non-standard readyState omitted

            // Force video to refresh subtitle display
            video.currentTime = video.currentTime + 0.001

            // Set the selected track
            setSelectedSubtitleTrack(trackId)
            console.log(`📝 Native subtitles should now be visible on the video element`)
            return
          }
        }
      } else {
        // Handle external/stream subtitle tracks (string IDs)
        const selectedTrack = subtitleTracks.find(track => track.id === trackId)
        if (selectedTrack) {
          console.log(`📝 ⚠️ WARNING: Selected track "${selectedTrack.label}" (${trackId}) is not a native text track`)
          console.log(`📝 This suggests the video file may not have embedded subtitles for this language`)
          console.log(`📝 Stream source: ${selectedTrack.src || 'external'}`)

          if (selectedTrack.src === 'stream') {
            console.log(`📝 ❌ Stream-based subtitle track selected, but no native text tracks found`)
            console.log(`📝 This means the video file doesn't actually contain embedded subtitles`)
            console.log(`📝 The subtitle metadata may be incorrect or the file lacks subtitle streams`)

            // Don't create custom overlays - just inform the user
            setCurrentSubtitle('')
            console.log(`📝 No custom subtitle overlay will be created - check if video has real embedded subtitles`)
          } else {
            await loadExternalSubtitles(selectedTrack.language, selectedTrack.src)
          }
        }
      }

      setSelectedSubtitleTrack(trackId)
    } catch (error) {
      console.error('📝 Error selecting subtitle track:', error)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black flex items-center justify-center transition-all duration-300 ${
        showCursor ? 'cursor-pointer' : 'cursor-none'
      }`}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        // Check if click is on video area (not on controls)
        const target = e.target as HTMLElement
        const isControlElement = target.closest('[data-video-controls]')

        if (!isControlElement) {
          e.stopPropagation()
          togglePlay()
          showControlsTemporarily()
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full object-contain ${
          showCursor ? 'cursor-pointer' : 'cursor-none'
        }`}
        onDoubleClick={toggleFullscreen}
        controls={false}
        preload="metadata"
        crossOrigin={src?.includes('torrentio.strem.fun') ? undefined : "anonymous"}
      />

      {/* Custom subtitle overlay positioned above controls */}
      {currentSubtitle && selectedSubtitleTrack !== 'off' && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40 max-w-4xl px-4">
          <div className="bg-black bg-opacity-75 text-white text-center px-4 py-2 rounded-lg shadow-lg">
            <p className="text-lg leading-relaxed whitespace-pre-line">{currentSubtitle}</p>
          </div>
        </div>
      )}



      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-xl">Loading video...</div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        data-video-controls
      >
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto" data-video-controls>
          <h1 className="text-white text-xl font-semibold">{title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            data-video-controls
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" data-video-controls>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 text-white"
              data-video-controls
            >
              <Play className="h-10 w-10 fill-current" />
            </Button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 space-y-4 pointer-events-auto" data-video-controls>
          {/* Progress Bar */}
          <div className="flex items-center space-x-2" data-video-controls>
            <span className="text-white text-sm min-w-[50px]">{formatTime(currentTime)}</span>
            <div className="flex-1">
              <Progress
                value={(currentTime / duration) * 100}
                className="h-1 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = (e.clientX - rect.left) / rect.width
                  handleSeek(percent * duration)
                }}
                data-video-controls
              />
            </div>
            <span className="text-white text-sm min-w-[50px]">{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div
            className="flex items-center justify-between"
            onMouseLeave={() => setShowVolumeSlider(false)}
            data-video-controls
          >
            <div className="flex items-center space-x-2" data-video-controls>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipTime(-10)}
                className="text-white hover:bg-white/20"
                data-video-controls
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                data-video-controls
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipTime(10)}
                className="text-white hover:bg-white/20"
                data-video-controls
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              <div className="flex items-center space-x-2" data-video-controls>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="text-white hover:bg-white/20"
                  data-video-controls
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>

                {/* Volume Slider */}
                <div
                  className={`flex items-center transition-all duration-200 ${
                    showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
                  }`}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  data-video-controls
                >
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={(value) => {
                      const newVolume = value[0] / 100
                      handleVolumeChange(newVolume)
                      if (newVolume > 0 && isMuted) {
                        toggleMute() // Unmute if volume is increased
                      }
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                    data-video-controls
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2" data-video-controls>
              {/* Audio Track Selector */}
              {audioTracks.length > 0 && (
                <div className="relative group" data-video-controls>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    title={`Audio Language (${audioTracks.length} tracks available)`}
                    data-video-controls
                  >
                    <Languages className="h-5 w-5" />
                  </Button>
                  <select
                    value={selectedAudioTrack}
                    onChange={(e) => selectAudioTrack(e.target.value)}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    title="Select audio language"
                    data-video-controls
                  >
                    {audioTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.label} {track.language !== 'unknown' && `(${track.language})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subtitle Track Selector */}
              {subtitleTracks.length > 1 && (
                <div className="relative group" data-video-controls>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    title={`Subtitles (${subtitleTracks.length - 1} tracks available)`}
                    data-video-controls
                  >
                    <Subtitles className="h-5 w-5" />
                  </Button>
                  <select
                    value={selectedSubtitleTrack}
                    onChange={(e) => {
                      selectSubtitleTrack(e.target.value)
                    }}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    title="Select subtitle language"
                    data-video-controls
                  >
                    {subtitleTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.label} {track.language !== 'none' && track.language !== 'unknown' && `(${track.language})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
              data-video-controls
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
