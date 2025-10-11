/**
 * useAutoplayPolicy - Handle Browser Autoplay Restrictions
 * 
 * Modern browsers block autoplay with audio to prevent annoying users.
 * This hook handles that gracefully with a nice UI prompt.
 */

import { useEffect, useState, useRef } from 'react'

interface UseAutoplayPolicyReturn {
  needsUserGesture: boolean
  enablePlayback: () => Promise<void>
  error: string | null
}

/**
 * Handle browser autoplay policies gracefully
 * Shows user prompt if autoplay is blocked
 */
export function useAutoplayPolicy(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  autoPlay: boolean = true
): UseAutoplayPolicyReturn {
  const [needsUserGesture, setNeedsUserGesture] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptedAutoplay = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !autoPlay || attemptedAutoplay.current) return

    const attemptAutoplay = async () => {
      try {
        console.log('🎬 Attempting autoplay...')
        await video.play()
        setNeedsUserGesture(false)
        setError(null)
        console.log('✅ Autoplay successful!')
      } catch (err: any) {
        console.log('⚠️ Autoplay blocked:', err.name)
        
        if (err.name === 'NotAllowedError') {
          // Autoplay was blocked - need user interaction
          setNeedsUserGesture(true)
          setError(null)
        } else if (err.name === 'NotSupportedError') {
          setError('Video format not supported')
        } else {
          setError('Failed to play video')
        }
      }
    }

    // Try autoplay when video metadata is loaded
    const handleLoadedMetadata = () => {
      if (!attemptedAutoplay.current) {
        attemptedAutoplay.current = true
        attemptAutoplay()
      }
    }

    // If metadata already loaded, try immediately
    if (video.readyState >= 1) {
      handleLoadedMetadata()
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoRef, autoPlay])

  /**
   * User clicked to enable playback
   * This satisfies browser's "user gesture" requirement
   */
  const enablePlayback = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      console.log('👆 User interaction - enabling playback')
      
      // Explicitly unmute and set volume
      video.muted = false
      if (video.volume === 0) {
        video.volume = 0.8
      }
      
      console.log('🔊 Audio enabled on user gesture:', {
        muted: video.muted,
        volume: video.volume
      })
      
      // Play video
      await video.play()
      
      setNeedsUserGesture(false)
      setError(null)
      
      console.log('✅ Playback enabled with audio')
    } catch (err: any) {
      console.error('❌ Failed to enable playback:', err)
      setError('Failed to play video')
    }
  }

  return {
    needsUserGesture,
    enablePlayback,
    error
  }
}

/**
 * Check if autoplay is likely to be blocked
 * This is a heuristic - not 100% accurate
 */
export function isAutoplayLikelyBlocked(): boolean {
  // Mobile devices usually block autoplay
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  // Some browsers have "low power mode" that blocks autoplay
  const isLowPowerMode = (navigator as any).getBattery && (navigator as any).getBattery().level < 0.2
  
  return isMobile || isLowPowerMode
}

/**
 * Test if autoplay works in current browser
 * Returns promise that resolves to true if autoplay works
 */
export async function testAutoplay(): Promise<boolean> {
  const video = document.createElement('video')
  video.muted = true
  video.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEyIGxvb2thaGVhZF90aHJlYWRzPTIgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0yNSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAA9liIQAV/0TAAYdgAAAjwEAAAAAAAAAAADxgAADAAA7OAFhcHByb3hWAAAAQW1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAHGdHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAPoAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAABGbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAABAAAAAAAAAAVVG5maX4==' // Minimal valid MP4
  
  try {
    await video.play()
    return true
  } catch {
    return false
  }
}
