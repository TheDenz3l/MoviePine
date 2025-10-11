/**
 * Stream Selector - Automatic 4K Selection
 * 
 * Philosophy: Always select the highest quality stream available.
 * Users want 4K - give it to them automatically!
 */

import { VideoSource, StreamInfo } from './types'

// ============================================================================
// Stream Selection
// ============================================================================

export interface StreamOption {
  url: string
  quality: string
  resolution: { width: number; height: number }
  bitrate?: number
  codec?: string
}

/**
 * Select the best available stream (4K priority)
 * 
 * Priority order:
 * 1. 4K (3840x2160 or higher)
 * 2. 1440p (2560x1440)
 * 3. 1080p (1920x1080)
 * 4. 720p (1280x720)
 * 5. Lowest available
 */
export async function selectBestStream(streams: StreamOption[]): Promise<string> {
  if (!streams || streams.length === 0) {
    throw new Error('No streams available')
  }

  // Sort by resolution (highest first)
  const sorted = streams.sort((a, b) => {
    const aPixels = a.resolution.width * a.resolution.height
    const bPixels = b.resolution.width * b.resolution.height
    return bPixels - aPixels
  })

  const bestStream = sorted[0]
  const quality = getQualityLabel(bestStream.resolution)

  console.log(`✅ Selected ${quality} stream:`, {
    resolution: `${bestStream.resolution.width}x${bestStream.resolution.height}`,
    url: bestStream.url.substring(0, 100) + '...'
  })

  return bestStream.url
}

/**
 * Get human-readable quality label from resolution
 */
export function getQualityLabel(resolution: { width: number; height: number }): string {
  const { width, height } = resolution

  if (width >= 3840 || height >= 2160) return '4K'
  if (width >= 2560 || height >= 1440) return '1440p'
  if (width >= 1920 || height >= 1080) return '1080p'
  if (width >= 1280 || height >= 720) return '720p'
  if (width >= 854 || height >= 480) return '480p'
  return '360p'
}

/**
 * Check if a URL is an HLS stream
 */
export function isHLSStream(url: string): boolean {
  if (!url) return false
  
  const lowerUrl = url.toLowerCase()
  
  // Common HLS indicators
  return (
    lowerUrl.includes('.m3u8') ||
    lowerUrl.includes('/hls/') ||
    lowerUrl.includes('m3u8') ||
    lowerUrl.includes('application/vnd.apple.mpegurl')
  )
}

/**
 * Determine stream type from URL
 */
export function getStreamType(url: string): 'hls' | 'mp4' | 'webm' {
  if (!url) return 'mp4'
  
  const lowerUrl = url.toLowerCase()
  
  if (isHLSStream(lowerUrl)) {
    return 'hls'
  }
  
  if (lowerUrl.endsWith('.mp4') || lowerUrl.includes('mp4')) {
    return 'mp4'
  }
  
  if (lowerUrl.endsWith('.webm') || lowerUrl.includes('webm')) {
    return 'webm'
  }
  
  // Default to HLS for streaming services
  return 'hls'
}

/**
 * Parse stream URL to extract quality information
 */
export function parseStreamUrl(url: string): Partial<StreamInfo> {
  const type = getStreamType(url)
  
  // Try to extract quality from URL patterns
  let quality = 'Unknown'
  let resolution: { width: number; height: number } | undefined
  
  // Common quality patterns in URLs
  const qualityPatterns = [
    { pattern: /2160p|4k|uhd/i, quality: '4K', resolution: { width: 3840, height: 2160 } },
    { pattern: /1440p/i, quality: '1440p', resolution: { width: 2560, height: 1440 } },
    { pattern: /1080p|fhd/i, quality: '1080p', resolution: { width: 1920, height: 1080 } },
    { pattern: /720p|hd/i, quality: '720p', resolution: { width: 1280, height: 720 } },
    { pattern: /480p|sd/i, quality: '480p', resolution: { width: 854, height: 480 } },
  ]
  
  for (const { pattern, quality: q, resolution: r } of qualityPatterns) {
    if (pattern.test(url)) {
      quality = q
      resolution = r
      break
    }
  }
  
  return {
    url,
    type,
    quality,
    resolution
  }
}

/**
 * Validate stream URL
 */
export function isValidStreamUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  try {
    // Check if it's a valid URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url)
      return true
    }
    
    // Check if it's a relative path
    if (url.startsWith('/')) {
      return true
    }
    
    return false
  } catch {
    return false
  }
}

/**
 * Get estimated bandwidth requirement for quality level
 * Returns bitrate in Mbps
 */
export function getRequiredBandwidth(quality: string): number {
  const bandwidthMap: Record<string, number> = {
    '4K': 25,      // 25 Mbps for 4K
    '1440p': 16,   // 16 Mbps for 1440p
    '1080p': 8,    // 8 Mbps for 1080p
    '720p': 5,     // 5 Mbps for 720p
    '480p': 2.5,   // 2.5 Mbps for 480p
    '360p': 1,     // 1 Mbps for 360p
  }
  
  return bandwidthMap[quality] || 5
}

/**
 * Detect if user's connection can handle 4K
 * Uses Network Information API if available
 */
export async function canHandle4K(): Promise<boolean> {
  // Check if Network Information API is available
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (connection) {
    // Check effective type
    const effectiveType = connection.effectiveType // '4g', '3g', '2g', 'slow-2g'
    
    if (effectiveType === '4g') {
      return true
    }
    
    // Check downlink speed (in Mbps)
    const downlink = connection.downlink
    if (downlink && downlink >= 25) {
      return true
    }
  }
  
  // Default to true - let's try 4K and fallback if needed
  return true
}

/**
 * Select best stream with network awareness
 */
export async function selectBestStreamWithNetworkCheck(
  streams: StreamOption[]
): Promise<string> {
  const canUse4K = await canHandle4K()
  
  if (!canUse4K) {
    console.log('⚠️ Network may not support 4K, but attempting anyway')
  }
  
  // Always try for best quality first
  // HLS.js will handle adaptive bitrate if needed
  return selectBestStream(streams)
}
