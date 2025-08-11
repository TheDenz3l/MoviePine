"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import VideoPlayer from "./video-player"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  movieId: string | null
  movieTitle: string
  onGetStreamingUrl: (movieId: string) => Promise<string | null>
  onGetStreamingResult?: (movieId: string) => Promise<{
    url: string;
    subtitles: string[];
    realSubtitles?: Array<{
      language: string
      label: string
      url: string
      isExternal: boolean
    }>
  } | null>
  movieData?: {
    id: string
    title: string
    poster: string
    year?: number
    genre?: string[]
  }
  startTime?: number
  // Optional: function to derive the next episode id given a current episode id.
  // If not provided we'll try to increment season/episode pattern like tmdb_12345:S01E02
  resolveNextEpisodeId?: (currentId: string) => string | null
  // Optional: hook to preload next episode metadata before playback
  onPreloadNextEpisode?: (nextId: string) => Promise<void> | void
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  movieId,
  movieTitle,
  onGetStreamingUrl,
  onGetStreamingResult,
  movieData,
  startTime = 0,
  resolveNextEpisodeId,
  onPreloadNextEpisode
}: VideoPlayerModalProps) {
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null)
  const [availableSubtitles, setAvailableSubtitles] = useState<string[]>([])
  const [realSubtitles, setRealSubtitles] = useState<Array<{
    language: string
    label: string
    url: string
    isExternal: boolean
  }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string>('')
  const [currentAttempt, setCurrentAttempt] = useState<number>(0)
  const [totalAttempts, setTotalAttempts] = useState<number>(0)
  // Series navigation
  const [nextEpisodeId, setNextEpisodeId] = useState<string | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
  if (isOpen && movieId) {
      prepareStream()
    } else {
      // Reset state when modal closes
      setStreamingUrl(null)
      setAvailableSubtitles([])
      setRealSubtitles([])
      setError(null)
      setIsLoading(false)
      setLoadingStatus('')
      setCurrentAttempt(0)
  setTotalAttempts(0)
  setNextEpisodeId(null)
  setIsAdvancing(false)
    }
  }, [isOpen, movieId])

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    return () => {
      // Clear streaming URL on unmount to prevent video play interruption
      setStreamingUrl(null)
    }
  }, [])

  const isSafari = typeof navigator !== 'undefined' && /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent)

  const prepareStream = async () => {
    if (!movieId) return

    setIsLoading(true)
    setError(null)
    setStreamingUrl(null)
    setAvailableSubtitles([])
    setRealSubtitles([])
    setLoadingStatus('Discovering available streams...')
    setCurrentAttempt(0)
    setTotalAttempts(0)

    try {
      console.log(`🎬 Preparing stream for movie: ${movieId}`)
  // Determine next episode id if this looks like a series episode id
  computeNextEpisodeId(movieId)

      // Try to get streaming result with subtitle information first
  const idForRequest = isSafari ? movieId + '#safari' : movieId
      if (onGetStreamingResult) {
        const result = await onGetStreamingResult(idForRequest)
        if (result) {
          console.log(`✅ Streaming result obtained: ${result.url.substring(0, 50)}...`)
          console.log(`📝 VideoPlayerModal: Available subtitles from result: [${result.subtitles.join(', ') || 'None'}]`)
          console.log(`📝 VideoPlayerModal: Real subtitles from SubDL: ${result.realSubtitles?.length || 0} tracks`)
          if (result.realSubtitles && result.realSubtitles.length > 0) {
            console.log(`📝 Real subtitle languages: [${result.realSubtitles.map(s => s.language).join(', ')}]`)
          }
          setLoadingStatus('Stream ready! Starting playback...')
          setStreamingUrl(result.url)
          setAvailableSubtitles(result.subtitles)
          setRealSubtitles(result.realSubtitles || [])
          console.log(`📝 VideoPlayerModal: Set availableSubtitles state to: [${result.subtitles.join(', ')}]`)
          console.log(`📝 VideoPlayerModal: Set realSubtitles state to: ${result.realSubtitles?.length || 0} tracks`)
        } else {
          const errorMessage = categorizeStreamError(movieId)
          setError(errorMessage)
        }
      } else {
        // Fallback to original method
  const url = await onGetStreamingUrl(idForRequest)
        if (url) {
          const streamUrl = typeof url === 'string' ? url : (url as any)
          console.log(`✅ Streaming URL obtained: ${streamUrl.substring(0, 50)}...`)
          setLoadingStatus('Stream ready! Starting playback...')
          setStreamingUrl(streamUrl)
          setAvailableSubtitles([]) // No subtitle info available
        } else {
          const errorMessage = categorizeStreamError(movieId)
          setError(errorMessage)
        }
      }
    } catch (err) {
      console.error('Error preparing stream:', err)
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Categorize streaming errors for better user feedback
  const categorizeStreamError = (movieId: string): string => {
    if (movieId.startsWith('tmdb_')) {
      return `No streams found for this movie. This could be because:

• The movie is very new and not yet available on torrent networks
• The movie is not popular enough to have active streams
• There may be temporary issues with stream providers
• The movie might be region-restricted

Try searching for a different movie or check back later.`
    }

    return 'No streams available for this movie. This might be a rare or very new release. Please try a different title.'
  }

  // Get user-friendly error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      if (message.includes('timeout') || message.includes('aborted')) {
        return 'Request timed out. Please check your internet connection and try again.'
      }
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your internet connection and try again.'
      }
      if (message.includes('api') || message.includes('service')) {
        return 'Streaming service temporarily unavailable. Please try again in a few minutes.'
      }
      if (message.includes('rate limit') || message.includes('too many')) {
        return 'Too many requests. Please wait a moment and try again.'
      }
      if (message.includes('not found') || message.includes('404')) {
        return 'Movie not found in our database. Try searching for a different title.'
      }
      if (message.includes('unauthorized') || message.includes('401')) {
        return 'Authentication error. Please check your API keys in settings.'
      }
      if (message.includes('forbidden') || message.includes('403')) {
        return 'Access denied. This content may be restricted in your region.'
      }
    }

    return 'Unable to load stream. Please try again or select a different movie.'
  }

  const handleClose = () => {
    // Clear streaming URL first to unmount VideoPlayer component cleanly
    setStreamingUrl(null)
    setAvailableSubtitles([])
    setError(null)
    setIsLoading(false)
    setLoadingStatus('')
    setCurrentAttempt(0)
    setTotalAttempts(0)

    // Small delay to ensure video cleanup before closing modal
    setTimeout(() => {
      onClose()
    }, 100)
  }

  const handleRetry = () => {
    prepareStream()
  }

  const computeNextEpisodeId = (id: string) => {
    if (resolveNextEpisodeId) {
      const custom = resolveNextEpisodeId(id)
      setNextEpisodeId(custom)
      return
    }
    // Pattern: base:S01E02 (season 1 episode 2)
    const match = id.match(/^(.*):S(\d+)E(\d+)$/)
    if (!match) { setNextEpisodeId(null); return }
    const base = match[1]
    const season = parseInt(match[2], 10)
    const episode = parseInt(match[3], 10)
    const nextEpisode = episode + 1
    // We don't know season length; optimistic next episode id.
    const nextId = `${base}:S${String(season).padStart(2, '0')}E${String(nextEpisode).padStart(2, '0')}`
    setNextEpisodeId(nextId)
  }

  const handleAdvanceToNext = async () => {
    if (!nextEpisodeId) return
    setIsAdvancing(true)
    try {
      if (onPreloadNextEpisode) await onPreloadNextEpisode(nextEpisodeId)
      // Update current movie context
      // Re-run prepareStream with new id
      // Because movieId is a prop, we can't mutate it directly; expect parent to control.
      // If parent isn't controlling, we fallback to internal simulation by calling provided callbacks.
      console.log('➡️ Advancing to next episode', nextEpisodeId)
      // We simulate closing and re-opening with new id by calling onGetStreamingResult directly.
      setStreamingUrl(null)
      setAvailableSubtitles([])
      setRealSubtitles([])
      setError(null)
      setIsLoading(true)
      if (onGetStreamingResult) {
        const result = await onGetStreamingResult(nextEpisodeId)
        if (result) {
          setStreamingUrl(result.url)
          setAvailableSubtitles(result.subtitles)
          setRealSubtitles(result.realSubtitles || [])
          setLoadingStatus('Stream ready! Starting playback...')
          computeNextEpisodeId(nextEpisodeId)
        } else {
          setError(categorizeStreamError(nextEpisodeId))
        }
      } else if (onGetStreamingUrl) {
        const url = await onGetStreamingUrl(nextEpisodeId)
        if (url) {
          setStreamingUrl(typeof url === 'string' ? url : (url as any))
          setLoadingStatus('Stream ready! Starting playback...')
          computeNextEpisodeId(nextEpisodeId)
        } else setError(categorizeStreamError(nextEpisodeId))
      }
    } catch (e) {
      console.error('Error advancing to next episode', e)
      setError('Failed to load next episode.')
    } finally {
      setIsAdvancing(false)
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="!w-screen !h-screen !max-w-none !max-h-none !p-0 !m-0 bg-black border-0 rounded-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {movieTitle ? `Playing ${movieTitle}` : 'Video Player'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isLoading
            ? `Preparing stream for ${movieTitle}`
            : error
            ? `Error loading ${movieTitle}: ${error}`
            : `Video player for ${movieTitle}`
          }
        </DialogDescription>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Preparing Stream</h2>
            <p className="text-gray-300 text-center max-w-md mb-2">
              Finding the best quality stream for "{movieTitle}"...
            </p>
            <p className="text-sm text-blue-400 mb-2">
              {loadingStatus}
            </p>
            {totalAttempts > 0 && (
              <p className="text-xs text-gray-400">
                Trying stream {currentAttempt} of {totalAttempts}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-4">
              Using intelligent selection: 4K → 1080p → 720p with best seeders
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Stream Unavailable</h2>
            <p className="text-gray-300 text-center max-w-md mb-6">
              {error}
            </p>
            <div className="flex space-x-4">
              <Button 
                onClick={handleRetry}
                className="bg-white text-black hover:bg-gray-200"
              >
                Try Again
              </Button>
              <Button 
                onClick={handleClose}
                variant="outline"
                className="border-gray-400 text-white hover:bg-white hover:text-black"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {streamingUrl && (
          <VideoPlayer
            src={streamingUrl}
            title={movieTitle}
            onClose={handleClose}
            autoPlay={true}
            availableSubtitles={availableSubtitles}
            realSubtitles={realSubtitles}
            movieId={movieId || undefined}
            movieData={movieData}
            startTime={startTime}
            hasNextEpisode={!!nextEpisodeId}
            onNextEpisode={handleAdvanceToNext}
            onError={(errorMessage) => {
              if (errorMessage === 'REQUEST_H264_FALLBACK' && movieId && isSafari) {
                console.log('🧪 Modal: Received H264 fallback request, retrying with #safari+h264 token')
                setStreamingUrl(null)
                setIsLoading(true)
                // Re-run streaming result with added token forcing h264
                const retryId = movieId + '#safari+h264'
                ;(async () => {
                  try {
                    if (onGetStreamingResult) {
                      const result = await onGetStreamingResult(retryId)
                      if (result) {
                        setStreamingUrl(result.url)
                        setAvailableSubtitles(result.subtitles)
                        setRealSubtitles(result.realSubtitles || [])
                        setError(null)
                      } else {
                        setError(categorizeStreamError(movieId))
                      }
                    } else if (onGetStreamingUrl) {
                      const url = await onGetStreamingUrl(retryId)
                      if (url) {
                        setStreamingUrl(typeof url === 'string' ? url : (url as any))
                        setError(null)
                      } else {
                        setError(categorizeStreamError(movieId))
                      }
                    }
                  } catch (e) {
                    console.error('Fallback retry failed', e)
                    setError('Fallback retry failed.')
                  } finally {
                    setIsLoading(false)
                  }
                })()
                return
              }
              console.error('Video player error:', errorMessage)
              setError(errorMessage)
              setStreamingUrl(null)
              setAvailableSubtitles([])
              setRealSubtitles([])
              setIsLoading(false)
            }}
          />
        )}
        {isAdvancing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white z-50">
            <div className="space-y-2 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto" />
              <p className="text-sm">Loading next episode...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
