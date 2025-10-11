# Netflix-Style Video Player - Ground-Up Implementation Plan
**Project**: MoviePine Netflix Player Rebuild  
**Date**: September 30, 2025  
**Status**: Planning Phase  

---

## 🎯 Project Vision

Build a **production-grade Netflix-style video player** from scratch with:
- ✅ **100% reliable cross-browser audio** (Chrome, Safari, Firefox, Edge)
- ✅ **4K-first architecture** (automatic 4K selection, no manual quality picker)
- ✅ **Modern subtitle system** with WebVTT support
- ✅ **Episode navigation** for TV series (next episode selector within player)
- ✅ **Netflix-quality UI/UX** matching the reference design
- ✅ **Zero legacy code** - complete fresh start

---

## 🚫 What We're REMOVING (Old Broken System)

### Files/Code to DELETE:
1. `src/lib/audio-manager.ts` - Broken Chrome audio detection
2. `src/lib/subtitle-manager.ts` - Old subtitle system
3. `src/lib/stream-manager.ts` - Legacy stream handling
4. All references to `AudioManager`, `SubtitleManager`, `StreamManager` classes
5. Old `useApplyPlaybackSettings` hooks (we'll rebuild)
6. Current `video-player.tsx` implementation (will replace entirely)

### Why Start Fresh?
- Current audio system has unfixable Chrome compatibility issues
- Over-engineered architecture with unnecessary abstractions
- Mixed concerns between audio detection and playback
- No proper 4K prioritization
- Subtitle system not integrated properly

---

## 📐 New Architecture Philosophy

### Core Principles:
1. **Simplicity First**: Use native HTML5 video APIs wherever possible
2. **Browser-Native Audio**: Let the browser handle audio naturally (it just works!)
3. **Progressive Enhancement**: Start with basics, add features incrementally
4. **4K by Default**: Always select highest quality stream available
5. **Component Isolation**: UI, playback, and data management fully separated

### Tech Stack:
- **Video Element**: Native HTML5 `<video>` tag
- **Streaming**: HLS.js for adaptive streaming (Chrome/Firefox), native HLS (Safari)
- **Subtitles**: Native `<track>` elements with WebVTT
- **Audio**: Native browser audio (no custom managers!)
- **State**: React hooks for clean state management
- **UI**: Tailwind + shadcn/ui for Netflix-style controls

---

## 🏗️ Phase 1: Core Foundation & Cleanup (Week 1)

### Goal: Remove old system, establish new foundation

#### 1.1 - Cleanup & Removal (Day 1-2)
**Tasks:**
- [ ] Delete old manager files:
  - `src/lib/audio-manager.ts`
  - `src/lib/subtitle-manager.ts`
  - `src/lib/stream-manager.ts`
- [ ] Remove all imports of these managers across codebase
- [ ] Backup current `video-player.tsx` to `video-player.OLD.tsx`
- [ ] Search and remove all `AudioManager`, `SubtitleManager` references
- [ ] Clean up unused dependencies related to old audio system

**Deliverable:** Clean slate with no legacy audio code

#### 1.2 - Create New Core Architecture (Day 2-3)
**Files to Create:**

**`src/lib/video/types.ts`** - TypeScript interfaces
```typescript
export interface VideoSource {
  url: string
  type: 'hls' | 'mp4' | 'webm'
  quality: '4K' | '1080p' | '720p' | '480p'
}

export interface SubtitleTrack {
  id: string
  label: string          // "English", "Spanish", etc.
  language: string       // "en", "es", etc.
  url: string
  format: 'vtt' | 'srt'
}

export interface EpisodeInfo {
  seriesId: string
  seasonNumber: number
  episodeNumber: number
  title: string
  nextEpisode?: {
    seasonNumber: number
    episodeNumber: number
    title: string
  }
}

export interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isLoading: boolean
  bufferedPercent: number
  error: string | null
}
```

**`src/lib/video/stream-selector.ts`** - Smart 4K-first stream selection
```typescript
/**
 * Stream Selector - Automatically picks best 4K stream
 * NO manual quality selection - always chooses highest available
 */

export interface StreamOption {
  url: string
  quality: string
  resolution: { width: number; height: number }
  codec?: string
}

export async function selectBestStream(streams: StreamOption[]): Promise<string> {
  // Sort by resolution (highest first)
  const sorted = streams.sort((a, b) => 
    (b.resolution.width * b.resolution.height) - 
    (a.resolution.width * a.resolution.height)
  )
  
  // First, try to get 4K (3840x2160 or higher)
  const fourK = sorted.find(s => s.resolution.width >= 3840)
  if (fourK) {
    console.log('✅ 4K stream selected:', fourK.url)
    return fourK.url
  }
  
  // Fallback to highest available
  console.log('⚠️ 4K not available, using highest:', sorted[0].quality)
  return sorted[0].url
}

export function isHLSStream(url: string): boolean {
  return url.includes('.m3u8') || url.includes('hls')
}

export function getStreamType(url: string): 'hls' | 'mp4' | 'webm' {
  if (isHLSStream(url)) return 'hls'
  if (url.endsWith('.mp4')) return 'mp4'
  if (url.endsWith('.webm')) return 'webm'
  return 'hls' // default assumption for streaming services
}
```

**Deliverable:** Clean architecture foundation with TypeScript types

#### 1.3 - HLS Setup with 4K Priority (Day 3-4)
**File: `src/lib/video/hls-loader.ts`**

```typescript
import Hls from 'hls.js'

export class HLSLoader {
  private hls: Hls | null = null
  private videoElement: HTMLVideoElement | null = null

  constructor() {
    console.log('🎬 HLS Loader initialized')
  }

  /**
   * Load HLS stream with 4K priority
   */
  async loadStream(url: string, videoEl: HTMLVideoElement): Promise<void> {
    this.videoElement = videoEl

    // Safari has native HLS support - use it!
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🍎 Using native HLS (Safari)')
      videoEl.src = url
      return
    }

    // Chrome/Firefox - use HLS.js
    if (!Hls.isSupported()) {
      throw new Error('HLS not supported in this browser')
    }

    this.hls = new Hls({
      // 4K optimization settings
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000, // 60MB buffer for 4K
      maxBufferLength: 30,
      
      // Start with highest quality
      startLevel: -1, // Auto-select highest
      
      // Aggressive quality selection
      abrEWMADefaultEstimate: 5000000, // Assume 5Mbps minimum
      
      // Enable bandwidth estimation
      enableWorker: true,
      lowLatencyMode: false, // We want quality over latency
      
      // Debugging
      debug: false
    })

    this.hls.loadSource(url)
    this.hls.attachMedia(videoEl)

    // Force highest quality after manifest is loaded
    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('📊 HLS Manifest loaded, levels:', data.levels.length)
      
      // Find 4K level (3840x2160 or higher)
      const fourKLevel = data.levels.findIndex(
        level => level.height >= 2160 || level.width >= 3840
      )
      
      if (fourKLevel !== -1) {
        console.log('✅ 4K level found, forcing:', data.levels[fourKLevel])
        this.hls.currentLevel = fourKLevel
      } else {
        // Use highest available
        this.hls.currentLevel = data.levels.length - 1
        console.log('⚠️ No 4K, using highest:', data.levels[this.hls.currentLevel])
      }
    })

    // Error handling
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('❌ Fatal HLS error:', data)
        throw new Error(`HLS Error: ${data.type}`)
      }
    })
  }

  /**
   * Get current quality info
   */
  getCurrentQuality(): { width: number; height: number; bitrate: number } | null {
    if (!this.hls) return null
    
    const level = this.hls.levels[this.hls.currentLevel]
    if (!level) return null
    
    return {
      width: level.width,
      height: level.height,
      bitrate: level.bitrate
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.hls) {
      this.hls.destroy()
      this.hls = null
    }
  }
}
```

**Deliverable:** Working HLS loader with 4K prioritization

---

## 🔊 Phase 2: Bulletproof Audio System (Week 1-2)

### Goal: Audio that JUST WORKS in every browser

#### 2.1 - Native Audio Architecture (Day 5-6)
**Key Insight:** Don't fight the browser - use native audio APIs correctly!

**File: `src/lib/video/audio-controller.ts`**

```typescript
/**
 * Audio Controller - Simple, Native, Reliable
 * 
 * Philosophy: Let the browser handle audio naturally.
 * We just manage volume/mute state.
 */

export class AudioController {
  private videoElement: HTMLVideoElement
  private volumeBeforeMute: number = 0.8

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
    
    // Set sensible defaults
    videoElement.volume = 0.8
    videoElement.muted = false
    
    console.log('🔊 Audio controller initialized')
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(level: number): void {
    const clampedVolume = Math.max(0, Math.min(1, level))
    this.videoElement.volume = clampedVolume
    
    // If setting volume while muted, unmute
    if (this.videoElement.muted && clampedVolume > 0) {
      this.videoElement.muted = false
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.videoElement.volume
  }

  /**
   * Mute/unmute
   */
  toggleMute(): void {
    if (this.videoElement.muted) {
      // Unmute - restore previous volume
      this.videoElement.muted = false
      if (this.videoElement.volume === 0) {
        this.videoElement.volume = this.volumeBeforeMute
      }
    } else {
      // Mute - save current volume
      this.volumeBeforeMute = this.videoElement.volume
      this.videoElement.muted = true
    }
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.videoElement.muted
  }

  /**
   * Handle browser autoplay policies
   * Call this on first user interaction
   */
  async enableAudio(): Promise<void> {
    try {
      // Unmute if muted by autoplay policy
      if (this.videoElement.muted) {
        this.videoElement.muted = false
      }
      
      // Ensure volume is set
      if (this.videoElement.volume === 0) {
        this.videoElement.volume = 0.8
      }
      
      console.log('✅ Audio enabled successfully')
    } catch (error) {
      console.error('⚠️ Audio enable failed:', error)
    }
  }
}
```

**Why This Works:**
- Uses native `video.volume` and `video.muted` properties
- No complex audio context manipulation
- Handles Chrome's autoplay policy correctly
- Simple and maintainable

**Deliverable:** Rock-solid audio that works in all browsers

#### 2.2 - Autoplay Policy Handler (Day 6-7)
**File: `src/hooks/useAutoplayPolicy.ts`**

```typescript
import { useEffect, useState } from 'react'

/**
 * Handle browser autoplay policies gracefully
 * Shows user prompt if autoplay is blocked
 */
export function useAutoplayPolicy(videoRef: React.RefObject<HTMLVideoElement>) {
  const [needsUserGesture, setNeedsUserGesture] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const attemptAutoplay = async () => {
      try {
        await video.play()
        setNeedsUserGesture(false)
        console.log('✅ Autoplay successful')
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          console.log('⚠️ Autoplay blocked, user gesture required')
          setNeedsUserGesture(true)
        } else {
          console.error('❌ Play error:', error)
        }
      }
    }

    // Try autoplay when video is ready
    video.addEventListener('loadedmetadata', attemptAutoplay)

    return () => {
      video.removeEventListener('loadedmetadata', attemptAutoplay)
    }
  }, [videoRef])

  const enablePlayback = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      await video.play()
      setNeedsUserGesture(false)
    } catch (error) {
      console.error('Failed to enable playback:', error)
    }
  }

  return { needsUserGesture, enablePlayback }
}
```

**Deliverable:** Smooth autoplay handling with user prompts

---

## 🎨 Phase 3: Netflix-Style UI & Controls (Week 2)

### Goal: Pixel-perfect Netflix interface

#### 3.1 - Core Player Component (Day 8-10)
**File: `src/components/NetflixPlayer.tsx`**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, X, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HLSLoader } from '@/lib/video/hls-loader'
import { AudioController } from '@/lib/video/audio-controller'
import { useAutoplayPolicy } from '@/hooks/useAutoplayPolicy'

interface NetflixPlayerProps {
  src: string
  title: string
  onClose: () => void
  autoPlay?: boolean
  startTime?: number
}

export function NetflixPlayer({
  src,
  title,
  onClose,
  autoPlay = true,
  startTime = 0
}: NetflixPlayerProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsLoaderRef = useRef<HLSLoader | null>(null)
  const audioControllerRef = useRef<AudioController | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)

  // Volume state
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  // UI state
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Autoplay policy handling
  const { needsUserGesture, enablePlayback } = useAutoplayPolicy(videoRef)

  // Initialize player
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const initPlayer = async () => {
      try {
        console.log('🎬 Initializing Netflix Player...')
        
        // Initialize audio controller
        const audioCtrl = new AudioController(video)
        audioControllerRef.current = audioCtrl

        // Load stream
        const hlsLoader = new HLSLoader()
        hlsLoaderRef.current = hlsLoader
        
        await hlsLoader.loadStream(src, video)
        
        // Set start time
        if (startTime > 0) {
          video.currentTime = startTime
        }

        setIsLoading(false)
        console.log('✅ Player ready')

        // Auto-play if enabled
        if (autoPlay) {
          const playPromise = video.play()
          if (playPromise) {
            playPromise.then(() => {
              setIsPlaying(true)
            }).catch(err => {
              console.log('Autoplay prevented:', err)
            })
          }
        }
      } catch (err: any) {
        console.error('❌ Player init error:', err)
        setError(err.message || 'Failed to load video')
        setIsLoading(false)
      }
    }

    initPlayer()

    // Cleanup
    return () => {
      hlsLoaderRef.current?.destroy()
    }
  }, [src, startTime, autoPlay])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        setBuffered((bufferedEnd / video.duration) * 100)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('progress', handleProgress)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('progress', handleProgress)
    }
  }, [])

  // Control handlers
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    audioControllerRef.current?.setVolume(newVolume)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    audioControllerRef.current?.toggleMute()
    setIsMuted(!isMuted)
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      await container.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Format time helper
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-xl">Loading...</div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <p className="text-red-500 text-xl mb-4">{error}</p>
            <Button onClick={onClose}>Close Player</Button>
          </div>
        </div>
      )}

      {/* User Gesture Required Overlay */}
      {needsUserGesture && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/70 cursor-pointer"
          onClick={enablePlayback}
        >
          <div className="text-center">
            <Play className="w-20 h-20 text-white mx-auto mb-4" />
            <p className="text-white text-lg">Click to start playback</p>
          </div>
        </div>
      )}

      {/* Netflix Controls */}
      {showControls && !isLoading && !error && (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-auto">
            <div>
              <h1 className="text-white text-2xl font-bold">{title}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4 pointer-events-auto">
            {/* Progress Bar */}
            <div className="relative">
              <div
                className="h-1 bg-gray-600 rounded-full cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = (e.clientX - rect.left) / rect.width
                  handleSeek(percent * duration)
                }}
              >
                {/* Buffered */}
                <div
                  className="absolute h-full bg-gray-400 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute h-full bg-red-600 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Time Display */}
              <div className="flex justify-between text-sm text-white/80 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" fill="white" />
                  ) : (
                    <Play className="w-8 h-8" fill="white" />
                  )}
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2">
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
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume * 100}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value) / 100)}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3">
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
      )}
    </div>
  )
}
```

**Deliverable:** Functional Netflix-style player with basic controls

#### 3.2 - Control Auto-Hide & Interactions (Day 10-11)

**File: `src/hooks/useControlsAutoHide.ts`**
```typescript
import { useEffect, useState, useRef } from 'react'

export function useControlsAutoHide(isPlaying: boolean, delay: number = 3000) {
  const [showControls, setShowControls] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const resetTimeout = () => {
    setShowControls(true)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (isPlaying) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, delay)
    }
  }

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    } else {
      resetTimeout()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isPlaying])

  return { showControls, resetTimeout }
}
```

**Deliverable:** Netflix-style auto-hiding controls

---

## 📝 Phase 4: Subtitle System (Week 3)

### Goal: Professional subtitle support with customization

#### 4.1 - Subtitle Parser & Manager (Day 12-14)

**File: `src/lib/video/subtitle-parser.ts`**
```typescript
/**
 * Parse WebVTT and SRT subtitle formats
 */

export interface SubtitleCue {
  startTime: number
  endTime: number
  text: string
}

export async function parseWebVTT(url: string): Promise<SubtitleCue[]> {
  const response = await fetch(url)
  const text = await response.text()
  
  const cues: SubtitleCue[] = []
  const lines = text.split('\n')
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    
    // Look for timestamp line (e.g., "00:00:10.000 --> 00:00:12.000")
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim())
      const startTime = parseVTTTime(startStr)
      const endTime = parseVTTTime(endStr)
      
      // Collect subtitle text (next non-empty lines until empty line)
      const textLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i])
        i++
      }
      
      cues.push({
        startTime,
        endTime,
        text: textLines.join('\n')
      })
    }
    i++
  }
  
  return cues
}

export async function parseSRT(url: string): Promise<SubtitleCue[]> {
  const response = await fetch(url)
  const text = await response.text()
  
  const cues: SubtitleCue[] = []
  const blocks = text.split('\n\n').filter(b => b.trim())
  
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue
    
    // Line 1: sequence number (ignore)
    // Line 2: timestamps
    const timeLine = lines[1]
    if (!timeLine.includes('-->')) continue
    
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim())
    const startTime = parseSRTTime(startStr)
    const endTime = parseSRTTime(endStr)
    
    // Lines 3+: subtitle text
    const text = lines.slice(2).join('\n')
    
    cues.push({ startTime, endTime, text })
  }
  
  return cues
}

function parseVTTTime(timeStr: string): number {
  // Format: "00:00:10.000" or "01:23:45.678"
  const parts = timeStr.split(':')
  const seconds = parseFloat(parts[parts.length - 1])
  const minutes = parseInt(parts[parts.length - 2]) || 0
  const hours = parseInt(parts[parts.length - 3]) || 0
  
  return hours * 3600 + minutes * 60 + seconds
}

function parseSRTTime(timeStr: string): number {
  // Format: "00:00:10,000"
  const normalized = timeStr.replace(',', '.')
  return parseVTTTime(normalized)
}

/**
 * Get active subtitle for current time
 */
export function getActiveSubtitle(
  cues: SubtitleCue[],
  currentTime: number
): string | null {
  const active = cues.find(
    cue => currentTime >= cue.startTime && currentTime <= cue.endTime
  )
  return active?.text || null
}
```

**File: `src/components/SubtitleDisplay.tsx`**
```typescript
'use client'

interface SubtitleDisplayProps {
  text: string | null
  fontSize?: number
  backgroundColor?: string
  textColor?: string
}

export function SubtitleDisplay({
  text,
  fontSize = 24,
  backgroundColor = 'rgba(0, 0, 0, 0.8)',
  textColor = 'white'
}: SubtitleDisplayProps) {
  if (!text) return null

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-4xl px-8 pointer-events-none z-40">
      <div
        className="text-center px-4 py-2 rounded"
        style={{
          backgroundColor,
          color: textColor,
          fontSize: `${fontSize}px`,
          lineHeight: 1.4,
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}
      >
        {text}
      </div>
    </div>
  )
}
```

**Deliverable:** Working subtitle system with WebVTT/SRT support

#### 4.2 - Subtitle Controls in Player (Day 14-15)

Add subtitle selector button to `NetflixPlayer.tsx`:
- Button to toggle subtitles menu
- List of available subtitle tracks
- "Off" option
- Current selection indicator
- Subtitle settings (size, position)

**Deliverable:** Full subtitle control integration

---

## 📺 Phase 5: TV Series Features (Week 3-4)

### Goal: Episode navigation within player

#### 5.1 - Episode Selector UI (Day 15-17)

**File: `src/components/EpisodeSelector.tsx`**
```typescript
'use client'

import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Episode {
  seasonNumber: number
  episodeNumber: number
  title: string
  thumbnail?: string
  duration?: number
}

interface EpisodeSelectorProps {
  currentEpisode: Episode
  allEpisodes: Episode[]
  onSelectEpisode: (episode: Episode) => void
}

export function EpisodeSelector({
  currentEpisode,
  allEpisodes,
  onSelectEpisode
}: EpisodeSelectorProps) {
  const [showList, setShowList] = useState(false)

  const currentIndex = allEpisodes.findIndex(
    ep =>
      ep.seasonNumber === currentEpisode.seasonNumber &&
      ep.episodeNumber === currentEpisode.episodeNumber
  )

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < allEpisodes.length - 1

  const goToPrevious = () => {
    if (hasPrevious) {
      onSelectEpisode(allEpisodes[currentIndex - 1])
    }
  }

  const goToNext = () => {
    if (hasNext) {
      onSelectEpisode(allEpisodes[currentIndex + 1])
    }
  }

  return (
    <div className="relative">
      {/* Episode Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          disabled={!hasPrevious}
          className="text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowList(!showList)}
          className="text-white hover:bg-white/20"
        >
          <List className="w-5 h-5 mr-2" />
          S{currentEpisode.seasonNumber}:E{currentEpisode.episodeNumber}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          disabled={!hasNext}
          className="text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Episode List Dropdown */}
      {showList && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-y-auto bg-black/95 border border-white/20 rounded-lg p-4 space-y-2">
          {allEpisodes.map((episode, idx) => {
            const isCurrent =
              episode.seasonNumber === currentEpisode.seasonNumber &&
              episode.episodeNumber === currentEpisode.episodeNumber

            return (
              <button
                key={idx}
                onClick={() => {
                  onSelectEpisode(episode)
                  setShowList(false)
                }}
                className={`w-full text-left p-3 rounded transition ${
                  isCurrent
                    ? 'bg-red-600 text-white'
                    : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <div className="font-semibold">
                  S{episode.seasonNumber}:E{episode.episodeNumber}
                </div>
                <div className="text-sm opacity-80">{episode.title}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Deliverable:** Episode selector integrated into player

#### 5.2 - Next Episode Auto-Play (Day 17-18)

**File: `src/components/NextEpisodePrompt.tsx`**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface NextEpisodePromptProps {
  nextEpisodeTitle: string
  onPlayNext: () => void
  onCancel: () => void
  autoPlayDelay?: number
}

export function NextEpisodePrompt({
  nextEpisodeTitle,
  onPlayNext,
  onCancel,
  autoPlayDelay = 10
}: NextEpisodePromptProps) {
  const [countdown, setCountdown] = useState(autoPlayDelay)

  useEffect(() => {
    if (countdown === 0) {
      onPlayNext()
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, onPlayNext])

  return (
    <div className="absolute bottom-32 right-8 w-96 bg-black/90 border border-white/20 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-white font-semibold text-lg">Next Episode</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-white/80 mb-4">{nextEpisodeTitle}</p>

      <div className="flex items-center justify-between">
        <span className="text-white/60 text-sm">
          Playing in {countdown}s...
        </span>
        <Button
          onClick={onPlayNext}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Play Now
        </Button>
      </div>

      {/* Countdown Progress Bar */}
      <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-600 transition-all duration-1000 ease-linear"
          style={{ width: `${((autoPlayDelay - countdown) / autoPlayDelay) * 100}%` }}
        />
      </div>
    </div>
  )
}
```

**Deliverable:** Netflix-style "Next Episode" prompt with countdown

---

## ⚡ Phase 6: 4K Optimization & Polish (Week 4)

### Goal: Smooth 4K playback, final polish

#### 6.1 - 4K Performance Optimization (Day 19-20)

**File: `src/lib/video/performance-monitor.ts`**
```typescript
/**
 * Monitor playback performance and optimize for 4K
 */

export class PerformanceMonitor {
  private videoElement: HTMLVideoElement
  private metrics = {
    droppedFrames: 0,
    totalFrames: 0,
    bufferingEvents: 0,
    averageBitrate: 0
  }

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
    this.startMonitoring()
  }

  private startMonitoring() {
    // Monitor frame drops
    setInterval(() => {
      const quality = (this.videoElement as any).getVideoPlaybackQuality?.()
      if (quality) {
        this.metrics.droppedFrames = quality.droppedVideoFrames
        this.metrics.totalFrames = quality.totalVideoFrames
        
        const dropRate = this.metrics.droppedFrames / this.metrics.totalFrames
        if (dropRate > 0.1) {
          console.warn('⚠️ High frame drop rate:', dropRate)
        }
      }
    }, 5000)

    // Monitor buffering
    this.videoElement.addEventListener('waiting', () => {
      this.metrics.bufferingEvents++
      console.log('⏳ Buffering event #', this.metrics.bufferingEvents)
    })
  }

  getMetrics() {
    return { ...this.metrics }
  }

  getDropRate() {
    return this.metrics.totalFrames > 0
      ? this.metrics.droppedFrames / this.metrics.totalFrames
      : 0
  }
}
```

**Deliverable:** Performance monitoring for 4K playback

#### 6.2 - Keyboard Shortcuts (Day 20-21)

**File: `src/hooks/usePlayerKeyboard.ts`**
```typescript
import { useEffect } from 'react'

interface KeyboardHandlers {
  onPlayPause: () => void
  onSeekForward: () => void
  onSeekBackward: () => void
  onVolumeUp: () => void
  onVolumeDown: () => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
}

export function usePlayerKeyboard(handlers: KeyboardHandlers) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent default for all our shortcuts
      const ourKeys = [' ', 'k', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'm', 'f']
      if (ourKeys.includes(e.key.toLowerCase())) {
        e.preventDefault()
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          handlers.onPlayPause()
          break
        case 'arrowleft':
          handlers.onSeekBackward()
          break
        case 'arrowright':
          handlers.onSeekForward()
          break
        case 'arrowup':
          handlers.onVolumeUp()
          break
        case 'arrowdown':
          handlers.onVolumeDown()
          break
        case 'm':
          handlers.onToggleMute()
          break
        case 'f':
          handlers.onToggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlers])
}
```

**Deliverable:** Full keyboard control support

#### 6.3 - Final Polish & Testing (Day 21-22)

**Tasks:**
- [ ] Test in Chrome, Safari, Firefox, Edge
- [ ] Test 4K playback on various connections
- [ ] Test subtitle sync accuracy
- [ ] Test episode switching
- [ ] Add loading skeletons
- [ ] Add error recovery
- [ ] Add quality indicator badge (shows "4K" when active)
- [ ] Performance optimization
- [ ] Code cleanup and documentation

**Deliverable:** Production-ready Netflix player

---

## 📋 Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Delete old audio/subtitle/stream managers
- [ ] Create new type definitions
- [ ] Build stream selector (4K-first)
- [ ] Setup HLS loader with quality prioritization

### Phase 2: Audio ✅
- [ ] Create simple native audio controller
- [ ] Implement autoplay policy handler
- [ ] Test audio in all browsers (Chrome, Safari, Firefox, Edge)
- [ ] Verify volume/mute functionality

### Phase 3: UI ✅
- [ ] Build core NetflixPlayer component
- [ ] Implement playback controls
- [ ] Add progress bar with scrubbing
- [ ] Add auto-hide controls
- [ ] Style to match Netflix design

### Phase 4: Subtitles ✅
- [ ] Create subtitle parser (WebVTT/SRT)
- [ ] Build subtitle display component
- [ ] Add subtitle selector to player
- [ ] Test subtitle synchronization

### Phase 5: Series ✅
- [ ] Create episode selector component
- [ ] Add prev/next episode navigation
- [ ] Build next episode auto-play prompt
- [ ] Test episode switching

### Phase 6: Polish ✅
- [ ] Add performance monitoring
- [ ] Implement keyboard shortcuts
- [ ] Cross-browser testing
- [ ] 4K playback optimization
- [ ] Final QA and bug fixes

---

## 🧪 Testing Strategy

### Unit Tests
- Audio controller volume/mute logic
- Subtitle parser (VTT/SRT)
- Time formatting helpers
- Stream selection logic

### Integration Tests
- Player initialization
- Episode switching
- Subtitle loading and display
- Keyboard shortcuts

### Browser Tests
- Chrome: Audio, 4K playback
- Safari: Native HLS, audio
- Firefox: HLS.js, audio
- Edge: Audio, playback

### Performance Tests
- 4K frame drop rate < 5%
- Buffering events < 3 per hour
- Memory usage stable over 2 hours
- CPU usage < 30% during playback

---

## 📊 Success Metrics

### Must-Have (Phase 1-3)
- ✅ Audio works in Chrome, Safari, Firefox, Edge
- ✅ 4K stream auto-selected when available
- ✅ Player loads in < 2 seconds
- ✅ Controls match Netflix design

### Should-Have (Phase 4-5)
- ✅ Subtitles sync perfectly (< 100ms drift)
- ✅ Episode switching works smoothly
- ✅ Next episode prompt appears at 90% completion

### Nice-to-Have (Phase 6)
- ✅ Keyboard shortcuts work
- ✅ Performance monitoring
- ✅ Quality indicator badge
- ✅ Thumbnail previews on hover

---

## 🚀 Deployment Plan

### Week 1-2
- Build foundation + audio system
- Deploy to staging for testing

### Week 3
- Add subtitles + series features
- Internal QA testing

### Week 4
- Final polish + optimization
- Beta testing with select users
- Production deployment

---

## 📝 Notes

### Why This Approach Works:
1. **Native Audio**: No complex managers, just use browser APIs correctly
2. **4K Default**: Users want quality, give it to them automatically
3. **Progressive Enhancement**: Start simple, add features incrementally
4. **Clean Architecture**: Easy to maintain and extend
5. **Battle-Tested Libraries**: HLS.js is proven for streaming

### Known Limitations:
- No AV1 codec support (requires browser support)
- No 8K support (bandwidth/hardware limitations)
- No HDR/Dolby Vision (requires special encoding)

### Future Enhancements:
- Watch party sync
- Audio descriptions track
- Quality stats overlay for debugging
- Chromecast support
- Picture-in-Picture mode

---

## 🎯 Phase Completion Criteria

Each phase complete when:
- ✅ All tasks checked off
- ✅ Code reviewed and approved
- ✅ Tests passing
- ✅ Deployed to staging
- ✅ Documented

---

**Let's build the best video player possible! 🚀**
