/**
 * Audio Controller - Simple, Native, Bulletproof
 * 
 * Philosophy: Don't fight the browser - use native audio APIs correctly!
 * 
 * This is a CLEAN, SIMPLE wrapper around native HTML5 video audio.
 * No complex audio contexts, no Chrome-specific hacks, just works!
 */

// ============================================================================
// Audio Controller Class
// ============================================================================

export class AudioController {
  private videoElement: HTMLVideoElement
  private volumeBeforeMute: number = 0.8
  
  // Callbacks
  private onVolumeChangeCallback: ((volume: number, muted: boolean) => void) | null = null

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement
    
    // Set sensible defaults
    videoElement.volume = 0.8
    videoElement.muted = false
    
    // Listen for native volume changes
    this.setupEventListeners()
    
    console.log('🔊 Audio Controller initialized (native mode)')
  }

  /**
   * Setup event listeners for native volume events
   */
  private setupEventListeners(): void {
    const handleVolumeChange = () => {
      if (this.onVolumeChangeCallback) {
        this.onVolumeChangeCallback(
          this.videoElement.volume,
          this.videoElement.muted
        )
      }
    }

    this.videoElement.addEventListener('volumechange', handleVolumeChange)
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(level: number): void {
    // Clamp between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, level))
    
    this.videoElement.volume = clampedVolume
    
    // If setting volume while muted, unmute
    if (this.videoElement.muted && clampedVolume > 0) {
      this.videoElement.muted = false
    }
    
    console.log(`🔊 Volume set to: ${Math.round(clampedVolume * 100)}%`)
  }

  /**
   * Get current volume (0.0 to 1.0)
   */
  getVolume(): number {
    return this.videoElement.volume
  }

  /**
   * Mute audio
   */
  mute(): void {
    if (!this.videoElement.muted) {
      this.volumeBeforeMute = this.videoElement.volume
      this.videoElement.muted = true
      console.log('🔇 Audio muted')
    }
  }

  /**
   * Unmute audio
   */
  unmute(): void {
    if (this.videoElement.muted) {
      this.videoElement.muted = false
      
      // Restore previous volume if it was 0
      if (this.videoElement.volume === 0) {
        this.videoElement.volume = this.volumeBeforeMute
      }
      
      console.log('🔊 Audio unmuted')
    }
  }

  /**
   * Toggle mute/unmute
   */
  toggleMute(): void {
    if (this.videoElement.muted) {
      this.unmute()
    } else {
      this.mute()
    }
  }

  /**
   * Check if audio is muted
   */
  isMuted(): boolean {
    return this.videoElement.muted
  }

  /**
   * Increase volume by percentage (default 10%)
   */
  increaseVolume(amount: number = 0.1): void {
    const newVolume = Math.min(1, this.videoElement.volume + amount)
    this.setVolume(newVolume)
  }

  /**
   * Decrease volume by percentage (default 10%)
   */
  decreaseVolume(amount: number = 0.1): void {
    const newVolume = Math.max(0, this.videoElement.volume - amount)
    this.setVolume(newVolume)
  }

  /**
   * Handle browser autoplay policies
   * Call this on first user interaction to enable audio
   */
  async enableAudio(): Promise<void> {
    try {
      // Unmute if muted by autoplay policy
      if (this.videoElement.muted) {
        this.videoElement.muted = false
      }
      
      // Ensure volume is set to reasonable level
      if (this.videoElement.volume === 0) {
        this.videoElement.volume = 0.8
      }
      
      console.log('✅ Audio enabled successfully')
    } catch (error) {
      console.error('⚠️ Failed to enable audio:', error)
      throw error
    }
  }

  /**
   * Check if audio is available
   * This is always true for native HTML5 video - the browser handles it!
   */
  hasAudio(): boolean {
    // For HTML5 video, audio is handled natively by the browser
    // We don't need complex detection - if the video has audio, it will play
    return true
  }

  /**
   * Register callback for volume changes
   */
  onVolumeChange(callback: (volume: number, muted: boolean) => void): void {
    this.onVolumeChangeCallback = callback
  }

  /**
   * Get current audio state
   */
  getState(): { volume: number; muted: boolean } {
    return {
      volume: this.videoElement.volume,
      muted: this.videoElement.muted
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.onVolumeChangeCallback = null
    console.log('🧹 Audio Controller destroyed')
  }
}

/**
 * Utility: Check if browser supports audio
 * (Spoiler: all modern browsers do!)
 */
export function isAudioSupported(): boolean {
  const video = document.createElement('video')
  return typeof video.volume !== 'undefined'
}

/**
 * Utility: Get volume as percentage (0-100)
 */
export function volumeToPercent(volume: number): number {
  return Math.round(volume * 100)
}

/**
 * Utility: Convert percentage (0-100) to volume (0-1)
 */
export function percentToVolume(percent: number): number {
  return Math.max(0, Math.min(100, percent)) / 100
}
