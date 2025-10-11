/**
 * Core Types for Netflix-Style Video Player
 * 
 * Clean, simple type definitions for the new player architecture
 */

// ============================================================================
// Video Source Types
// ============================================================================

export interface VideoSource {
  url: string
  type: 'hls' | 'mp4' | 'webm'
  quality: '4K' | '1080p' | '720p' | '480p' | '360p'
  resolution?: {
    width: number
    height: number
  }
  bitrate?: number
  codec?: string
}

// ============================================================================
// Subtitle Types
// ============================================================================

export interface SubtitleTrack {
  id: string
  label: string          // "English", "Spanish", "French", etc.
  language: string       // ISO language code: "en", "es", "fr", etc.
  url: string
  format: 'vtt' | 'srt'
  isDefault?: boolean
}

export interface SubtitleCue {
  startTime: number      // seconds
  endTime: number        // seconds
  text: string
}

// ============================================================================
// Episode/Series Types
// ============================================================================

export interface EpisodeInfo {
  seriesId: string
  seasonNumber: number
  episodeNumber: number
  title: string
  description?: string
  thumbnail?: string
  duration?: number
  
  nextEpisode?: {
    seasonNumber: number
    episodeNumber: number
    title: string
    thumbnail?: string
  }
  
  previousEpisode?: {
    seasonNumber: number
    episodeNumber: number
    title: string
    thumbnail?: string
  }
}

export interface Episode {
  seasonNumber: number
  episodeNumber: number
  title: string
  thumbnail?: string
  duration?: number
  description?: string
}

// ============================================================================
// Player State Types
// ============================================================================

export interface PlayerState {
  // Playback
  isPlaying: boolean
  currentTime: number
  duration: number
  bufferedPercent: number
  isLoading: boolean
  
  // Volume & Audio
  volume: number         // 0.0 to 1.0
  isMuted: boolean
  
  // Display
  isFullscreen: boolean
  showControls: boolean
  
  // Errors
  error: PlayerError | null
}

export interface PlayerError {
  code: string
  message: string
  recoverable: boolean
}

// ============================================================================
// Stream Information
// ============================================================================

export interface StreamInfo {
  url: string
  type: 'hls' | 'mp4' | 'webm'
  quality: string
  resolution?: {
    width: number
    height: number
  }
  bitrate?: number
  isLive?: boolean
}

// ============================================================================
// Player Configuration
// ============================================================================

export interface PlayerConfig {
  autoPlay?: boolean
  startTime?: number
  volume?: number
  muted?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  
  // Features
  enableKeyboardShortcuts?: boolean
  enableSubtitles?: boolean
  enableQualitySelector?: boolean // We'll keep this false for 4K-only
  
  // UI
  controlsAutoHideDelay?: number // milliseconds
  showQualityBadge?: boolean
  
  // Advanced
  maxBufferLength?: number
  enablePerformanceMonitoring?: boolean
}

// ============================================================================
// Player Props (for React component)
// ============================================================================

export interface NetflixPlayerProps {
  // Required
  src: string | VideoSource
  title: string
  onClose: () => void
  
  // Optional playback
  autoPlay?: boolean
  startTime?: number
  
  // Optional metadata
  movieId?: string
  movieData?: any
  
  // Subtitles
  subtitles?: SubtitleTrack[]
  defaultSubtitleLanguage?: string
  
  // Episode info (for TV series)
  episodeInfo?: EpisodeInfo
  allEpisodes?: Episode[]
  onEpisodeChange?: (episode: Episode) => void
  
  // Callbacks
  onError?: (error: PlayerError) => void
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  onQualityChange?: (quality: string) => void
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  droppedFrames: number
  totalFrames: number
  bufferingEvents: number
  averageBitrate: number
  currentQuality: string
  playbackStartTime: number
  totalPlayTime: number
}
