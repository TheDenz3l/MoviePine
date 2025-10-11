/**
 * HLS Loader - 4K-Optimized Streaming
 * 
 * Handles HLS streams with automatic 4K prioritization
 * Uses HLS.js for Chrome/Firefox, native HLS for Safari
 */

import Hls from 'hls.js'
import { StreamInfo } from './types'
import { isHLSStream, getQualityLabel } from './stream-selector'

// ============================================================================
// HLS Loader Class
// ============================================================================

export class HLSLoader {
  private hls: Hls | null = null
  private videoElement: HTMLVideoElement | null = null
  private currentStreamInfo: StreamInfo | null = null
  
  // Callbacks
  private onErrorCallback: ((code: string, message: string) => void) | null = null
  private onQualityChangeCallback: ((quality: string) => void) | null = null
  private onProgressCallback: ((percent: number) => void) | null = null

  constructor() {
    console.log('🎬 HLS Loader initialized')
  }

  /**
   * Load HLS stream with 4K prioritization
   */
  async loadStream(url: string, videoEl: HTMLVideoElement): Promise<StreamInfo> {
    this.videoElement = videoEl

    if (!url) {
      throw new Error('Invalid stream URL')
    }

    console.log('📺 Loading stream:', url.substring(0, 100) + '...')

    // Check if this is actually an HLS stream or a direct video file
    const isHLS = url.includes('.m3u8') || url.includes('application/vnd.apple.mpegurl')
    
    if (!isHLS) {
      console.log('🎬 Direct video file detected (not HLS), using native playback')
      
      // CRITICAL: Ensure audio is enabled for direct playback
      videoEl.muted = false
      videoEl.volume = 1.0
      console.log('🔊 Audio explicitly enabled for direct playback')
      
      videoEl.src = url
      
      const streamInfo: StreamInfo = {
        url,
        type: 'mp4', // Assuming MP4, but could be other formats
        quality: 'Direct',
        isLive: false
      }
      
      this.currentStreamInfo = streamInfo
      return streamInfo
    }

    // Safari has native HLS support - use it!
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🍎 Using native HLS (Safari)')
      
      // CRITICAL: Ensure audio is enabled for Safari native HLS
      videoEl.muted = false
      videoEl.volume = 1.0
      console.log('🔊 Audio explicitly enabled for Safari native HLS')
      
      videoEl.src = url
      
      const streamInfo: StreamInfo = {
        url,
        type: 'hls',
        quality: 'Auto',
        isLive: false
      }
      
      this.currentStreamInfo = streamInfo
      return streamInfo
    }

    // Chrome/Firefox - use HLS.js
    if (!Hls.isSupported()) {
      throw new Error('HLS is not supported in this browser')
    }

    return this.loadWithHLSjs(url, videoEl)
  }

  /**
   * Load stream using HLS.js (Chrome/Firefox)
   */
  private async loadWithHLSjs(url: string, videoEl: HTMLVideoElement): Promise<StreamInfo> {
    console.log('🔧 Using HLS.js for Chrome/Firefox')

    this.hls = new Hls({
      // ============================================
      // 4K Optimization Settings
      // ============================================
      
      // Buffer settings for 4K
      maxMaxBufferLength: 60,           // Max 60 seconds buffer
      maxBufferSize: 60 * 1000 * 1000,  // 60MB buffer size (for 4K)
      maxBufferLength: 30,              // Target 30 seconds
      
      // Start with highest quality
      startLevel: -1,                   // -1 = auto-select highest
      
      // Aggressive quality selection
      abrEwmaDefaultEstimate: 5000000,  // Assume 5Mbps minimum bandwidth
      abrEwmaFastLive: 3.0,
      abrEwmaSlowLive: 9.0,
      
      // Enable optimizations
      enableWorker: true,               // Use web worker for parsing
      lowLatencyMode: false,            // We want quality over low latency
      backBufferLength: 90,             // Keep 90s of back buffer
      
      // Fragment loading
      fragLoadingTimeOut: 30000,        // 30s timeout for fragments
      manifestLoadingTimeOut: 30000,    // 30s timeout for manifest (increased for slow networks)
      levelLoadingTimeOut: 30000,       // 30s timeout for levels
      
      // Debugging (set to false in production)
      debug: false,
      
      // Error recovery
      fragLoadingMaxRetry: 10,          // Increased retries for reliability
      manifestLoadingMaxRetry: 10,
      levelLoadingMaxRetry: 10,
      fragLoadingMaxRetryTimeout: 64000, // Max time to retry fragments
      manifestLoadingMaxRetryTimeout: 64000, // Max time to retry manifest
      levelLoadingMaxRetryTimeout: 64000  // Max time to retry levels
    })

    // Attach media element
    this.hls.attachMedia(videoEl)

    // Load source
    this.hls.loadSource(url)

    // Return promise that resolves when manifest is parsed
    return new Promise((resolve, reject) => {
      if (!this.hls) {
        reject(new Error('HLS.js not initialized'))
        return
      }

      // Manifest loaded successfully
      this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('📊 HLS Manifest parsed:', {
          levels: data.levels.length,
          qualities: data.levels.map(l => `${l.width}x${l.height}`)
        })

        // Force highest quality (4K if available)
        this.selectBestQualityLevel()

        // CRITICAL: Enable audio tracks explicitly
        this.enableAudioTracks()

        // Create stream info
        const bestLevel = this.getBestLevel()
        const streamInfo: StreamInfo = {
          url,
          type: 'hls',
          quality: bestLevel ? getQualityLabel({ width: bestLevel.width, height: bestLevel.height }) : 'Auto',
          resolution: bestLevel ? { width: bestLevel.width, height: bestLevel.height } : undefined,
          bitrate: bestLevel?.bitrate,
          isLive: data.levels[0]?.details?.live || false
        }

        this.currentStreamInfo = streamInfo
        console.log('✅ Stream ready:', streamInfo.quality)
        
        resolve(streamInfo)
      })

      // Handle audio track switching
      this.hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, (event, data) => {
        console.log(`🔊 Audio track switching to: ${data.id}`)
      })

      this.hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
        console.log(`✅ Audio track switched to: ${data.id}`)
        const track = this.hls?.audioTracks[data.id]
        if (track) {
          console.log(`🔊 Active audio: ${track.name || track.lang || 'default'}`)
        }
      })

      this.hls.on(Hls.Events.AUDIO_TRACK_LOADED, (event, data) => {
        console.log(`✅ Audio track loaded: ${data.id}`)
      })

      // Handle quality changes
      this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = this.hls?.levels[data.level]
        if (level) {
          const quality = getQualityLabel({ width: level.width, height: level.height })
          console.log(`📊 Quality switched to: ${quality} (${level.width}x${level.height})`)
          
          if (this.onQualityChangeCallback) {
            this.onQualityChangeCallback(quality)
          }
        }
      })

      // Handle fragment loading progress
      this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        if (this.onProgressCallback && videoEl.buffered.length > 0) {
          const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1)
          const percent = (bufferedEnd / videoEl.duration) * 100
          this.onProgressCallback(percent)
        }
      })

      // Handle errors
      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS Error:', data.type, data.details)

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('💔 Fatal network error')
              if (this.onErrorCallback) {
                this.onErrorCallback('NETWORK_ERROR', 'Network error loading video')
              }
              reject(new Error('Network error loading video'))
              break
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Attempting to recover from media error...')
              this.hls?.recoverMediaError()
              break
              
            default:
              console.error('💔 Unrecoverable error')
              if (this.onErrorCallback) {
                this.onErrorCallback('PLAYBACK_ERROR', 'Failed to play video')
              }
              reject(new Error('Failed to play video'))
              break
          }
        }
      })
    })
  }

  /**
   * Enable audio tracks explicitly
   * CRITICAL: This ensures audio is selected and enabled
   */
  private enableAudioTracks(): void {
    if (!this.hls) return

    try {
      // Get all audio tracks
      const audioTracks = this.hls.audioTracks
      
      if (!audioTracks || audioTracks.length === 0) {
        console.log('🔇 No audio tracks found in manifest')
        return
      }

      console.log(`🔊 Found ${audioTracks.length} audio track(s):`, 
        audioTracks.map((t, i) => `${i}: ${t.name || t.lang || 'default'} (${t.groupId || 'no-group'})`))

      // Select the first audio track explicitly
      this.hls.audioTrack = 0
      console.log(`🔊 Audio track explicitly enabled: Track 0`)

      // Verify audio track is selected
      setTimeout(() => {
        if (this.hls) {
          const currentTrack = this.hls.audioTrack
          console.log(`🔊 Current audio track after selection: ${currentTrack}`)
          
          if (currentTrack === -1) {
            console.warn('⚠️ Audio track selection failed, forcing re-selection')
            this.hls.audioTrack = 0
          }
        }
      }, 100)

    } catch (error) {
      console.error('❌ Error enabling audio tracks:', error)
    }
  }

  /**
   * Force selection of best quality level (4K priority)
   */
  private selectBestQualityLevel(): void {
    if (!this.hls || !this.hls.levels) return

    const levels = this.hls.levels

    // Find 4K level (3840x2160 or higher)
    const fourKIndex = levels.findIndex(
      level => level.height >= 2160 || level.width >= 3840
    )

    if (fourKIndex !== -1) {
      console.log('✅ 4K stream found, selecting level:', fourKIndex)
      this.hls.currentLevel = fourKIndex
      return
    }

    // Find 1440p level
    const qhdIndex = levels.findIndex(
      level => level.height >= 1440 || level.width >= 2560
    )

    if (qhdIndex !== -1) {
      console.log('✅ 1440p stream found, selecting level:', qhdIndex)
      this.hls.currentLevel = qhdIndex
      return
    }

    // Otherwise use highest available
    const highestIndex = levels.length - 1
    console.log('ℹ️ Using highest available quality, level:', highestIndex)
    this.hls.currentLevel = highestIndex
  }

  /**
   * Get best available level info
   */
  private getBestLevel() {
    if (!this.hls || !this.hls.levels) return null
    
    const currentLevel = this.hls.currentLevel
    if (currentLevel >= 0) {
      return this.hls.levels[currentLevel]
    }
    
    // Return highest level
    return this.hls.levels[this.hls.levels.length - 1]
  }

  /**
   * Get current quality info
   */
  getCurrentQuality(): { width: number; height: number; bitrate: number } | null {
    if (!this.hls || !this.hls.levels) return null

    const level = this.hls.levels[this.hls.currentLevel]
    if (!level) return null

    return {
      width: level.width,
      height: level.height,
      bitrate: level.bitrate
    }
  }

  /**
   * Get current stream info
   */
  getStreamInfo(): StreamInfo | null {
    return this.currentStreamInfo
  }

  /**
   * Get all available quality levels
   */
  getAvailableLevels(): Array<{ width: number; height: number; bitrate: number; quality: string }> {
    if (!this.hls || !this.hls.levels) return []

    return this.hls.levels.map(level => ({
      width: level.width,
      height: level.height,
      bitrate: level.bitrate,
      quality: getQualityLabel({ width: level.width, height: level.height })
    }))
  }

  /**
   * Manually switch to specific quality level
   * (We won't expose this in UI, but good to have for debugging)
   */
  setQualityLevel(levelIndex: number): void {
    if (!this.hls || !this.hls.levels) return

    if (levelIndex >= 0 && levelIndex < this.hls.levels.length) {
      this.hls.currentLevel = levelIndex
      console.log('🔄 Manually switched to level:', levelIndex)
    }
  }

  /**
   * Register error callback
   */
  onError(callback: (code: string, message: string) => void): void {
    this.onErrorCallback = callback
  }

  /**
   * Register quality change callback
   */
  onQualityChange(callback: (quality: string) => void): void {
    this.onQualityChangeCallback = callback
  }

  /**
   * Register progress callback
   */
  onProgress(callback: (percent: number) => void): void {
    this.onProgressCallback = callback
  }

  /**
   * Cleanup and destroy HLS instance
   */
  destroy(): void {
    if (this.hls) {
      this.hls.destroy()
      this.hls = null
      console.log('🧹 HLS Loader destroyed')
    }
    
    this.videoElement = null
    this.currentStreamInfo = null
    this.onErrorCallback = null
    this.onQualityChangeCallback = null
    this.onProgressCallback = null
  }
}

/**
 * Check if HLS is supported in current browser
 */
export function isHLSSupported(): boolean {
  // Check for native HLS support (Safari)
  const video = document.createElement('video')
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    return true
  }

  // Check for HLS.js support (Chrome/Firefox)
  return Hls.isSupported()
}
