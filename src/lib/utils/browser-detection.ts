// Browser detection utilities for Safari compatibility
// This module provides client-side browser detection for Safari-specific streaming optimizations

export interface BrowserInfo {
  isSafari: boolean
  isChrome: boolean
  isFirefox: boolean
  isEdge: boolean
  safariVersion?: { major: number; minor: number }
  userAgent: string
}

/**
 * Detects Safari browser on the client side
 * Must be called in a client-side environment (after component mount)
 */
export function detectSafari(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent
  
  // Safari detection: Contains "Safari" but not "Chrome"
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
  
  return isSafari
}

/**
 * Gets comprehensive browser information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      userAgent: 'server'
    }
  }

  const userAgent = navigator.userAgent
  
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent)
  const isFirefox = /Firefox/.test(userAgent)
  const isEdge = /Edge/.test(userAgent) || /Edg/.test(userAgent)
  
  let safariVersion: { major: number; minor: number } | undefined
  
  if (isSafari) {
    // Extract Safari version (e.g., "Version/16.0 Safari/605.1.15")
    const versionMatch = userAgent.match(/Version\/(\d+)\.(\d+)/)
    if (versionMatch) {
      safariVersion = {
        major: parseInt(versionMatch[1], 10),
        minor: parseInt(versionMatch[2], 10)
      }
    }
  }
  
  return {
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    safariVersion,
    userAgent
  }
}

/**
 * Hook-like function to get browser info in React components
 * Should be called inside useEffect to ensure client-side execution
 */
export function useBrowserDetection() {
  const browserInfo = getBrowserInfo()
  
  console.log(`🌐 Browser detected: ${
    browserInfo.isSafari ? `Safari ${browserInfo.safariVersion?.major}.${browserInfo.safariVersion?.minor}` :
    browserInfo.isChrome ? 'Chrome' :
    browserInfo.isFirefox ? 'Firefox' :
    browserInfo.isEdge ? 'Edge' :
    'Unknown'
  }`)
  
  if (browserInfo.isSafari) {
    console.log(`🍎 Safari browser detected - Safari-compatible streams will be prioritized`)
  }
  
  return browserInfo
}

/**
 * Simple Safari detection for use in API calls
 */
export function isSafariBrowser(): boolean {
  return detectSafari()
}

/**
 * Creates a query parameter for API calls to indicate Safari browser
 */
export function getSafariQueryParam(): string {
  const isSafari = detectSafari()
  return isSafari ? '&isSafari=true' : ''
}
