"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VideoPlayer } from "./video-player"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  movieId: string | null
  movieTitle: string
  onGetStreamingUrl: (movieId: string) => Promise<string | null>
}

export function VideoPlayerModal({ 
  isOpen, 
  onClose, 
  movieId, 
  movieTitle, 
  onGetStreamingUrl 
}: VideoPlayerModalProps) {
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string>('')
  const [currentAttempt, setCurrentAttempt] = useState<number>(0)
  const [totalAttempts, setTotalAttempts] = useState<number>(0)

  useEffect(() => {
    if (isOpen && movieId) {
      prepareStream()
    } else {
      // Reset state when modal closes
      setStreamingUrl(null)
      setError(null)
      setIsLoading(false)
      setLoadingStatus('')
      setCurrentAttempt(0)
      setTotalAttempts(0)
    }
  }, [isOpen, movieId])

  const prepareStream = async () => {
    if (!movieId) return

    setIsLoading(true)
    setError(null)
    setStreamingUrl(null)
    setLoadingStatus('Discovering available streams...')
    setCurrentAttempt(0)
    setTotalAttempts(0)

    try {
      console.log(`🎬 Preparing stream for movie: ${movieId}`)

      // Enhanced stream preparation with progress tracking
      const url = await onGetStreamingUrl(movieId)

      if (url) {
        // Handle both string URLs and streaming objects
        const streamUrl = typeof url === 'string' ? url : url.url
        console.log(`✅ Streaming URL obtained: ${streamUrl.substring(0, 50)}...`)
        setLoadingStatus('Stream ready! Starting playback...')
        setStreamingUrl(streamUrl)
      } else {
        setError('No streaming sources available for this movie. This could be because the movie is very new or not available in torrent sources. Please try another movie.')
      }
    } catch (err) {
      console.error('Error preparing stream:', err)
      setError(err instanceof Error ? err.message : 'Failed to prepare stream. Please try again or select a different movie.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStreamingUrl(null)
    setError(null)
    setIsLoading(false)
    setLoadingStatus('')
    setCurrentAttempt(0)
    setTotalAttempts(0)
    onClose()
  }

  const handleRetry = () => {
    prepareStream()
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
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
