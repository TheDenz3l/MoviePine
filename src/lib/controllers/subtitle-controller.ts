/**
 * SubtitleController - Modern Subtitle Management System
 * 
 * Handles subtitle rendering with:
 * - VTT and SRT parsing
 * - Custom styling
 * - Multiple track support
 * - Time-synchronized display
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SubtitleTrack {
  id: string
  label: string
  language: string
  src: string
  kind: 'subtitles' | 'captions'
}

export interface SubtitleCue {
  startTime: number
  endTime: number
  text: string
}

export interface SubtitleStyle {
  fontSize: number
  color: string
  backgroundColor: string
  fontFamily: string
  position: 'bottom' | 'top'
}

// ============================================================================
// SubtitleController Class
// ============================================================================

export class SubtitleController {
  private video: HTMLVideoElement | null = null
  private tracks: SubtitleTrack[] = []
  private activeTrackId: string | null = null
  private currentCue: SubtitleCue | null = null
  private parsedCues: Map<string, SubtitleCue[]> = new Map()
  
  // Styling
  private style: SubtitleStyle = {
    fontSize: 18,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    fontFamily: 'Arial, sans-serif',
    position: 'bottom'
  }

  // Callbacks
  private cueChangeCallback?: (cue: SubtitleCue | null) => void
  private tracksChangeCallback?: (tracks: SubtitleTrack[]) => void

  // Update interval
  private updateInterval?: NodeJS.Timeout

  constructor() {
    console.log('📝 SubtitleController initialized')
  }

  // ============================================================================
  // Core Initialization
  // ============================================================================

  /**
   * Attach to video element
   */
  attach(videoElement: HTMLVideoElement): void {
    if (this.video) {
      this.detach()
    }

    this.video = videoElement
    console.log('📝 Attached SubtitleController to video')

    // Start monitoring time for subtitle updates
    this.startUpdating()
  }

  /**
   * Detach from video element
   */
  detach(): void {
    if (!this.video) return

    console.log('📝 Detaching SubtitleController')
    this.stopUpdating()
    this.video = null
  }

  // ============================================================================
  // Track Management
  // ============================================================================

  /**
   * Add a subtitle track
   */
  async addTrack(track: SubtitleTrack): Promise<void> {
    console.log('📝 Adding subtitle track:', track.label)

    // Check if track already exists
    const exists = this.tracks.some(t => t.id === track.id)
    if (exists) {
      console.warn('⚠️ Track already exists:', track.id)
      return
    }

    this.tracks.push(track)
    this.tracksChangeCallback?.(this.tracks)

    // Load and parse the track
    await this.loadTrack(track)
  }

  /**
   * Add multiple tracks
   */
  async addTracks(tracks: SubtitleTrack[]): Promise<void> {
    for (const track of tracks) {
      await this.addTrack(track)
    }
  }

  /**
   * Remove a track
   */
  removeTrack(trackId: string): void {
    this.tracks = this.tracks.filter(t => t.id !== trackId)
    this.parsedCues.delete(trackId)
    
    if (this.activeTrackId === trackId) {
      this.activeTrackId = null
      this.currentCue = null
      this.cueChangeCallback?.(null)
    }

    this.tracksChangeCallback?.(this.tracks)
  }

  /**
   * Select a track to display
   */
  selectTrack(trackId: string | null): void {
    console.log('📝 Selecting subtitle track:', trackId)

    this.activeTrackId = trackId
    this.currentCue = null
    this.cueChangeCallback?.(null)

    // If selecting a track, ensure it's loaded
    if (trackId) {
      const track = this.tracks.find(t => t.id === trackId)
      if (track && !this.parsedCues.has(trackId)) {
        this.loadTrack(track)
      }
    }
  }

  /**
   * Get all available tracks
   */
  getTracks(): SubtitleTrack[] {
    return [...this.tracks]
  }

  /**
   * Get active track ID
   */
  getActiveTrackId(): string | null {
    return this.activeTrackId
  }

  // ============================================================================
  // Track Loading and Parsing
  // ============================================================================

  /**
   * Load and parse a subtitle file
   */
  private async loadTrack(track: SubtitleTrack): Promise<void> {
    try {
      console.log('📝 Loading subtitle file:', track.src)

      const response = await fetch(track.src)
      if (!response.ok) {
        throw new Error(`Failed to load subtitles: ${response.statusText}`)
      }

      const text = await response.text()
      const cues = this.parseSubtitleFile(text, track.src)
      
      this.parsedCues.set(track.id, cues)
      console.log(`📝 Parsed ${cues.length} subtitle cues for ${track.label}`)

    } catch (error) {
      console.error('📝 Failed to load subtitle track:', error)
    }
  }

  /**
   * Parse subtitle file (supports VTT and SRT)
   */
  private parseSubtitleFile(content: string, filename: string): SubtitleCue[] {
    const isVTT = content.includes('WEBVTT') || filename.endsWith('.vtt')
    const isSRT = filename.endsWith('.srt') || /^\d+\s*[\r\n]/.test(content)

    if (isVTT) {
      return this.parseVTT(content)
    } else if (isSRT) {
      return this.parseSRT(content)
    }

    console.warn('⚠️ Unknown subtitle format, attempting SRT parse')
    return this.parseSRT(content)
  }

  /**
   * Parse WebVTT format
   */
  private parseVTT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = []
    const lines = content.split('\n')
    
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()

      // Look for timestamp line
      if (line.includes('-->')) {
        const match = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/)
        if (match) {
          const startTime = this.parseVTTTime(match[1])
          const endTime = this.parseVTTTime(match[2])
          
          // Collect text lines
          i++
          const textLines: string[] = []
          while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i].trim())
            i++
          }

          if (textLines.length > 0) {
            cues.push({
              startTime,
              endTime,
              text: textLines.join('\n')
            })
          }
        }
      }
      i++
    }

    return cues
  }

  /**
   * Parse SRT format
   */
  private parseSRT(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = []
    const blocks = content.split(/\n\s*\n/)

    for (const block of blocks) {
      const lines = block.trim().split('\n')
      if (lines.length < 3) continue

      // Line 0: Index (skip)
      // Line 1: Timestamps
      const timeLine = lines[1]
      const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
      
      if (match) {
        const startTime = this.parseSRTTime(match[1])
        const endTime = this.parseSRTTime(match[2])
        
        // Lines 2+: Text
        const text = lines.slice(2).join('\n')

        cues.push({
          startTime,
          endTime,
          text
        })
      }
    }

    return cues
  }

  /**
   * Parse VTT timestamp (HH:MM:SS.mmm)
   */
  private parseVTTTime(timeStr: string): number {
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const secondsParts = parts[2].split('.')
    const seconds = parseInt(secondsParts[0], 10)
    const milliseconds = parseInt(secondsParts[1], 10)

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  }

  /**
   * Parse SRT timestamp (HH:MM:SS,mmm)
   */
  private parseSRTTime(timeStr: string): number {
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const secondsParts = parts[2].split(',')
    const seconds = parseInt(secondsParts[0], 10)
    const milliseconds = parseInt(secondsParts[1], 10)

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  }

  // ============================================================================
  // Subtitle Display Updates
  // ============================================================================

  /**
   * Start updating subtitles based on video time
   */
  private startUpdating(): void {
    this.stopUpdating()

    this.updateInterval = setInterval(() => {
      this.updateCurrentCue()
    }, 250) // Update 4 times per second
  }

  /**
   * Stop updating
   */
  private stopUpdating(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = undefined
    }
  }

  /**
   * Update the current cue based on video time
   */
  private updateCurrentCue(): void {
    if (!this.video || !this.activeTrackId) return

    const currentTime = this.video.currentTime
    const cues = this.parsedCues.get(this.activeTrackId)
    
    if (!cues) return

    // Find the cue that matches current time
    const matchingCue = cues.find(cue => 
      currentTime >= cue.startTime && currentTime <= cue.endTime
    )

    // Only notify if cue changed
    if (matchingCue !== this.currentCue) {
      this.currentCue = matchingCue || null
      this.cueChangeCallback?.(this.currentCue)
    }
  }

  // ============================================================================
  // Styling
  // ============================================================================

  /**
   * Set subtitle style
   */
  setStyle(style: Partial<SubtitleStyle>): void {
    this.style = { ...this.style, ...style }
    console.log('📝 Subtitle style updated:', this.style)
  }

  /**
   * Get current style
   */
  getStyle(): SubtitleStyle {
    return { ...this.style }
  }

  // ============================================================================
  // Callbacks
  // ============================================================================

  /**
   * Register callback for cue changes
   */
  onCueChange(callback: (cue: SubtitleCue | null) => void): void {
    this.cueChangeCallback = callback
  }

  /**
   * Register callback for track list changes
   */
  onTracksChange(callback: (tracks: SubtitleTrack[]) => void): void {
    this.tracksChangeCallback = callback
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Destroy controller
   */
  destroy(): void {
    console.log('📝 Destroying SubtitleController')
    this.detach()
    this.tracks = []
    this.parsedCues.clear()
    this.activeTrackId = null
    this.currentCue = null
    this.cueChangeCallback = undefined
    this.tracksChangeCallback = undefined
  }
}
