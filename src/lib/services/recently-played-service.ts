/**
 * Recently Played Service
 * Manages recently played movies with progress tracking and localStorage persistence
 */

export interface RecentlyPlayedMovie {
  id: string
  title: string
  poster: string
  year?: number
  genre?: string[]
  lastWatched: number // timestamp
  progress: number // 0-1 (percentage watched)
  duration: number // total duration in seconds
  currentTime: number // current playback position in seconds
  isCompleted: boolean // true if >90% watched
  // New (optional) persisted stream selection data so we can resume with same stream
  lastStreamUrl?: string
  lastSubtitles?: string[]
}

const STORAGE_KEY = 'movieplayer_recently_played'
const MAX_ITEMS = 15

export class RecentlyPlayedService {
  /**
   * Get all recently played movies, sorted by most recent first
   */
  static getAll(): RecentlyPlayedMovie[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const movies: RecentlyPlayedMovie[] = JSON.parse(stored)
      return movies.sort((a, b) => b.lastWatched - a.lastWatched)
    } catch (error) {
      console.error('Error loading recently played movies:', error)
      return []
    }
  }

  /**
   * Add a movie to recently played (when playback starts)
   */
  static add(movie: {
    id: string
    title: string
    poster: string
    year?: number
    genre?: string[]
  }): void {
    try {
      const movies = this.getAll()
      
      // Remove existing entry if present
      const filtered = movies.filter(m => m.id !== movie.id)
      
      // Create new entry
      const newEntry: RecentlyPlayedMovie = {
        ...movie,
        lastWatched: Date.now(),
        progress: 0,
        duration: 0,
        currentTime: 0,
  isCompleted: false,
  lastStreamUrl: undefined,
  lastSubtitles: undefined
      }
      
      // Add to beginning and limit to MAX_ITEMS
      const updated = [newEntry, ...filtered].slice(0, MAX_ITEMS)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      console.log(`📺 Added "${movie.title}" to recently played`)
    } catch (error) {
      console.error('Error adding to recently played:', error)
    }
  }

  /**
   * Update progress for a movie
   */
  static updateProgress(
    movieId: string, 
    currentTime: number, 
    duration: number
  ): void {
    try {
      const movies = this.getAll()
      const movieIndex = movies.findIndex(m => m.id === movieId)
      
      if (movieIndex === -1) return
      
      const progress = duration > 0 ? currentTime / duration : 0
      const isCompleted = progress >= 0.9
      
      movies[movieIndex] = {
        ...movies[movieIndex],
        lastWatched: Date.now(),
        progress,
        duration,
        currentTime,
        isCompleted
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies))
      
      // Only log significant progress updates to avoid spam
      if (Math.floor(progress * 10) !== Math.floor((movies[movieIndex].progress || 0) * 10)) {
        console.log(`📺 Updated progress for "${movies[movieIndex].title}": ${Math.round(progress * 100)}%`)
      }
    } catch (error) {
      console.error('Error updating recently played progress:', error)
    }
  }

  /**
   * Persist the stream information (chosen URL & subtitle list) used for a movie.
   * This lets us reuse the exact same stream on resume instead of re-running selection
   * which might pick a different file/quality and reset playback for some providers.
   */
  static setStreamInfo(movieId: string, streamUrl: string, subtitles: string[]): void {
    try {
      if (!streamUrl) return
      const movies = this.getAll()
      const idx = movies.findIndex(m => m.id === movieId)
      if (idx === -1) return
      movies[idx] = {
        ...movies[idx],
        lastStreamUrl: streamUrl,
        lastSubtitles: subtitles
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies))
    } catch (e) {
      console.error('Error setting stream info:', e)
    }
  }

  /**
   * Retrieve previously chosen stream info if available.
   */
  static getStreamInfo(movieId: string): { url: string; subtitles: string[] } | null {
    const movie = this.get(movieId)
    if (movie?.lastStreamUrl) {
      return { url: movie.lastStreamUrl, subtitles: movie.lastSubtitles || [] }
    }
    return null
  }

  /**
   * Remove a movie from recently played
   */
  static remove(movieId: string): void {
    try {
      const movies = this.getAll()
      const filtered = movies.filter(m => m.id !== movieId)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      console.log(`📺 Removed movie ${movieId} from recently played`)
    } catch (error) {
      console.error('Error removing from recently played:', error)
    }
  }

  /**
   * Clear all recently played movies
   */
  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('📺 Cleared all recently played movies')
    } catch (error) {
      console.error('Error clearing recently played:', error)
    }
  }

  /**
   * Get a specific movie from recently played
   */
  static get(movieId: string): RecentlyPlayedMovie | null {
    const movies = this.getAll()
    return movies.find(m => m.id === movieId) || null
  }

  /**
   * Check if a movie is in recently played
   */
  static has(movieId: string): boolean {
    return this.get(movieId) !== null
  }

  /**
   * Get resume time for a movie (returns 0 if completed or not found)
   */
  static getResumeTime(movieId: string): number {
    const movie = this.get(movieId)
    if (!movie || movie.isCompleted) return 0
    return movie.currentTime
  }

  /**
   * Format progress as percentage string
   */
  static formatProgress(progress: number): string {
    return `${Math.round(progress * 100)}%`
  }

  /**
   * Format time for display
   */
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}
