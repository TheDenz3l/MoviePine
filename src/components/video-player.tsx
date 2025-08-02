"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"

interface VideoPlayerProps {
  src: string
  title: string
  onClose: () => void
  autoPlay?: boolean
}

export function VideoPlayer({ src, title, onClose, autoPlay = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
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
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const cursorTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
      // Set initial volume
      video.volume = volume
      video.muted = false
      if (autoPlay) {
        video.play()
        setIsPlaying(true)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [autoPlay])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
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
    const video = videoRef.current
    if (!video) return

    try {
      if (!document.fullscreenElement) {
        await video.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
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
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
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

  const handleMouseMove = () => {
    showControlsTemporarily()
    showCursorTemporarily()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
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
          document.exitFullscreen()
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

  return (
    <div
      className={`relative w-full h-full bg-black flex items-center justify-center transition-all duration-300 ${
        showCursor ? 'cursor-default' : 'cursor-none'
      }`}
      onMouseMove={handleMouseMove}
      onClick={showControlsTemporarily}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        controls={false}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-xl">Loading video...</div>
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <h1 className="text-white text-xl font-semibold">{title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <Play className="h-10 w-10 fill-current" />
            </Button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 space-y-4">
          {/* Progress Bar */}
          <div className="flex items-center space-x-2">
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
              />
            </div>
            <span className="text-white text-sm min-w-[50px]">{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div
            className="flex items-center justify-between"
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipTime(-10)}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipTime(10)}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="text-white hover:bg-white/20"
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
                  />
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
