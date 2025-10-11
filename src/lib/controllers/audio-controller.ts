/**
 * AudioController - Modern Audio Management System
 * 
 * A clean, ground-up implementation focusing on:
 * - Chrome and Safari audio compatibility
 * - Native browser APIs for optimal performance
 * - Automatic codec detection and handling
 * - Seamless audio track management
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AudioTrackInfo {
  id: string
  label: string
  language: string
  kind: string
  enabled: boolean
}

export interface AudioState {
  volume: number
  muted: boolean
  hasAudio: boolean
  tracks: AudioTrackInfo[]
  activeTrackId: string | null
}

export interface AudioMetrics {
  webkitAudioBytes: number
  audioTracks: number
  method: 'webkit' | 'native' | 'mozilla' | 'none'
  canPlayAudio: boolean
}

// ============================================================================
// AudioController Class
// ============================================================================

export class AudioController {
  private video: HTMLVideoElement | null = null
  private state: AudioState = {
    volume: 0.8,
    muted: false,
    hasAudio: false,
    tracks: [],
    activeTrackId: null
  }

  // Browser detection
  private readonly isChrome: boolean
  private readonly isSafari: boolean
  private readonly isFirefox: boolean

  // Callbacks
  private stateChangeCallback?: (state: AudioState) => void
  private errorCallback?: (error: string) => void

  // Monitoring
  private monitoringInterval?: NodeJS.Timeout
  private lastByteCount: number = 0
  private userHasInteracted: boolean = false

  constructor() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    this.isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
    this.isChrome = /Chrome/.test(ua) && !/Edge/.test(ua)
    this.isFirefox = /Firefox/.test(ua)

    console.log('🎵 AudioController initialized', {
      browser: this.isSafari ? 'Safari' : this.isChrome ? 'Chrome' : this.isFirefox ? 'Firefox' : 'Unknown'
    })
  }

  // ============================================================================
  // Core Initialization
  // ============================================================================

  /**
   * Attach to a video element and initialize audio
   */
  async attach(videoElement: HTMLVideoElement): Promise<void> {
    if (this.video) {
      this.detach()
    }

    this.video = videoElement
    console.log('🎵 Attaching AudioController to video element')

    // Set initial audio state - CRITICAL for Chrome/Safari
    videoElement.volume = this.state.volume
    videoElement.muted = false

    // Add listeners
    videoElement.addEventListener('volumechange', this.handleVolumeChange)
    videoElement.addEventListener('loadedmetadata', this.handleMetadataLoaded)
    videoElement.addEventListener('play', this.handlePlay)
    
    // If metadata already loaded, process immediately
    if (videoElement.readyState >= 1) {
      await this.handleMetadataLoaded()
    }
  }

  /**
   * Detach from video element and cleanup
   */
  detach(): void {
    if (!this.video) return

    console.log('🎵 Detaching AudioController')
    
    this.stopMonitoring()
    
    this.video.removeEventListener('volumechange', this.handleVolumeChange)
    this.video.removeEventListener('loadedmetadata', this.handleMetadataLoaded)
    this.video.removeEventListener('play', this.handlePlay)
    
    this.video = null
    this.userHasInteracted = false
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleVolumeChange = (): void => {
    if (!this.video) return

    const newVolume = this.video.volume
    const newMuted = this.video.muted

    if (this.state.volume !== newVolume || this.state.muted !== newMuted) {
      this.state.volume = newVolume
      this.state.muted = newMuted
      this.notifyStateChange()
      
      console.log('🔊 Volume changed:', { volume: newVolume, muted: newMuted })
    }
  }

  private handleMetadataLoaded = async (): Promise<void> => {
    console.log('🎵 Audio metadata loaded')
    
    await this.discoverAudioTracks()
    this.checkAudioPresence()
    this.startMonitoring()
  }

  private handlePlay = (): void => {
    if (!this.userHasInteracted) {
      this.userHasInteracted = true
      this.ensureAudioEnabled()
    }
  }

  // ============================================================================
  // Audio Track Management
  // ============================================================================

  /**
   * Discover all available audio tracks
   */
  private async discoverAudioTracks(): Promise<void> {
    if (!this.video) return

    const tracks: AudioTrackInfo[] = []
    const audioTracks = this.video.audioTracks

    if (audioTracks && audioTracks.length > 0) {
      console.log(`🎵 Found ${audioTracks.length} audio tracks`)

      for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i]
        const trackInfo: AudioTrackInfo = {
          id: track.id || i.toString(),
          label: track.label || `Audio ${i + 1}`,
          language: track.language || 'unknown',
          kind: track.kind || 'main',
          enabled: track.enabled
        }
        
        tracks.push(trackInfo)

        if (track.enabled) {
          this.state.activeTrackId = trackInfo.id
        }
      }

      this.state.tracks = tracks
      this.notifyStateChange()
    } else {
      console.log('🎵 No native audio tracks found (may be embedded in stream)')
    }
  }

  /**
   * Switch to a different audio track
   */
  selectTrack(trackId: string): void {
    if (!this.video?.audioTracks) {
      console.warn('⚠️ Audio track switching not supported')
      return
    }

    const audioTracks = this.video.audioTracks
    
    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i]
      const id = track.id || i.toString()
      track.enabled = (id === trackId)
    }

    this.state.activeTrackId = trackId
    this.notifyStateChange()
    
    console.log('🎵 Switched to audio track:', trackId)
  }

  // ============================================================================
  // Audio Detection & Monitoring
  // ============================================================================

  /**
   * Check if audio is present in the stream
   */
  private checkAudioPresence(): void {
    const metrics = this.getAudioMetrics()
    this.state.hasAudio = metrics.canPlayAudio

    console.log('🎵 Audio presence check:', metrics)

    if (!this.state.hasAudio) {
      this.errorCallback?.('No audio detected in stream')
    }

    this.notifyStateChange()
  }

  /**
   * Get current audio metrics (browser-specific)
   */
  getAudioMetrics(): AudioMetrics {
    if (!this.video) {
      return {
        webkitAudioBytes: 0,
        audioTracks: 0,
        method: 'none',
        canPlayAudio: false
      }
    }

    const video = this.video
    
    // Chrome/Safari: WebKit audio bytes
    const webkitAudioBytes = (video as any).webkitAudioDecodedByteCount || 0
    
    // Firefox: mozHasAudio
    const mozHasAudio = (video as any).mozHasAudio === true
    
    // Standard: audioTracks API
    const hasAudioTracks = video.audioTracks && video.audioTracks.length > 0
    const audioTrackCount = video.audioTracks?.length || 0

    const canPlayAudio = mozHasAudio || webkitAudioBytes > 0 || hasAudioTracks
    
    const method: AudioMetrics['method'] = 
      mozHasAudio ? 'mozilla' :
      webkitAudioBytes > 0 ? 'webkit' :
      hasAudioTracks ? 'native' : 'none'

    return {
      webkitAudioBytes,
      audioTracks: audioTrackCount,
      method,
      canPlayAudio
    }
  }

  /**
   * Start monitoring audio health
   */
  private startMonitoring(): void {
    this.stopMonitoring()

    this.monitoringInterval = setInterval(() => {
      if (!this.video || this.video.paused) return

      const metrics = this.getAudioMetrics()

      // Check for audio byte progression (Chrome/Safari)
      if (metrics.method === 'webkit') {
        if (metrics.webkitAudioBytes > this.lastByteCount) {
          this.lastByteCount = metrics.webkitAudioBytes
          
          if (!this.state.hasAudio) {
            console.log('🎵 Audio detected during playback!')
            this.state.hasAudio = true
            this.notifyStateChange()
          }
        } else if (this.video.currentTime > 3 && this.lastByteCount === 0) {
          // No audio bytes after 3 seconds of playback
          if (this.state.hasAudio) {
            console.warn('⚠️ Audio stopped or not present')
            this.errorCallback?.('Audio playback may have stopped')
          }
        }
      }
    }, 1000)
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
  }

  // ============================================================================
  // Volume Control
  // ============================================================================

  /**
   * Set volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    if (!this.video) return

    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.video.volume = clampedVolume
    this.state.volume = clampedVolume

    // Auto-unmute if volume is increased from 0
    if (clampedVolume > 0 && this.state.muted) {
      this.setMuted(false)
    }

    console.log('🔊 Volume set to:', clampedVolume)
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    if (!this.video) return

    this.video.muted = muted
    this.state.muted = muted
    
    console.log('🔊 Muted:', muted)
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.setMuted(!this.state.muted)
  }

  /**
   * Ensure audio is enabled (call on user interaction)
   */
  private ensureAudioEnabled(): void {
    if (!this.video) return

    console.log('🎵 Ensuring audio enabled on user interaction')

    // Unmute if currently muted
    if (this.video.muted) {
      this.video.muted = false
      this.state.muted = false
    }

    // Ensure volume is at least 50% on first interaction
    if (this.video.volume === 0) {
      this.video.volume = 0.5
      this.state.volume = 0.5
    }

    this.notifyStateChange()
  }

  /**
   * Force unmute (for manual user action)
   */
  forceUnmute(): void {
    if (!this.video) return

    console.log('🎵 Force unmuting audio')
    
    this.video.muted = false
    
    if (this.video.volume === 0) {
      this.video.volume = 0.8
    }

    this.state.muted = false
    this.state.volume = this.video.volume
    this.userHasInteracted = true
    
    this.notifyStateChange()
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current audio state
   */
  getState(): AudioState {
    return { ...this.state }
  }

  /**
   * Register state change callback
   */
  onStateChange(callback: (state: AudioState) => void): void {
    this.stateChangeCallback = callback
  }

  /**
   * Register error callback
   */
  onError(callback: (error: string) => void): void {
    this.errorCallback = callback
  }

  /**
   * Notify state change to callback
   */
  private notifyStateChange(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback({ ...this.state })
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    console.log('🎵 Destroying AudioController')
    this.detach()
    this.stateChangeCallback = undefined
    this.errorCallback = undefined
  }
}
