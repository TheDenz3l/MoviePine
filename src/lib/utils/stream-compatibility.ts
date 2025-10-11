// Stream compatibility utilities for web playback
// Based on Stremio's approach: prioritize browser-compatible formats

export enum CompatibilityTier {
  ULTRA_SAFE = 'ultra-safe',    // MP4 + H.264 + AAC - guaranteed to work
  SAFE = 'safe',                 // MP4 + H.264 + compatible audio
  RISKY = 'risky',               // MP4 but with potential codec issues
  TRANSCODING_REQUIRED = 'transcoding-required', // Needs transcoding
  INCOMPATIBLE = 'incompatible'  // Cannot be played even with transcoding
}

export interface CompatibilityResult {
  tier: CompatibilityTier
  score: number
  issues: string[]
  container?: string
  videoCodec?: string
  audioCodec?: string
  canPlay: boolean
  requiresTranscoding: boolean
}

export class StreamCompatibilityChecker {
  /**
   * Analyze a stream name and determine its compatibility tier
   * Following Stremio's approach: MP4 + H.264 + AAC is the gold standard
   */
  static analyze(streamName: string, isSafari: boolean = false): CompatibilityResult {
    const name = streamName.toLowerCase()
    const issues: string[] = []
    
    // Detect container format
    const container = this.detectContainer(streamName)
    const videoCodec = this.detectVideoCodec(name)
    const audioCodec = this.detectAudioCodec(name)
    
    // CRITICAL: MKV is absolutely incompatible with web browsers
    if (container === 'MKV') {
      return {
        tier: CompatibilityTier.INCOMPATIBLE,
        score: 0,
        issues: ['MKV container not supported in web browsers - use MP4 or WebM'],
        container,
        videoCodec,
        audioCodec,
        canPlay: false,
        requiresTranscoding: false
      }
    }
    
    // Check for absolute incompatibilities
    if (this.hasAbsoluteIncompatibilities(name, isSafari)) {
      return {
        tier: CompatibilityTier.INCOMPATIBLE,
        score: 0,
        issues: this.getIncompatibilityReasons(name, isSafari),
        container,
        videoCodec,
        audioCodec,
        canPlay: false,
        requiresTranscoding: false
      }
    }
    
    // ULTRA-SAFE: MP4 + H.264 + AAC (Stremio's preferred format)
    if (this.isUltraSafe(container, videoCodec, audioCodec)) {
      return {
        tier: CompatibilityTier.ULTRA_SAFE,
        score: 100,
        issues: [],
        container,
        videoCodec,
        audioCodec,
        canPlay: true,
        requiresTranscoding: false
      }
    }
    
    // SAFE: MP4 + H.264 + any compatible audio
    if (this.isSafe(container, videoCodec, audioCodec, isSafari)) {
      const audioIssues = this.getAudioCompatibilityIssues(audioCodec)
      return {
        tier: CompatibilityTier.SAFE,
        score: 80,
        issues: audioIssues,
        container,
        videoCodec,
        audioCodec,
        canPlay: true,
        requiresTranscoding: false
      }
    }
    
    // RISKY: MP4 but with potential issues
    if (this.isRisky(container, videoCodec, audioCodec, isSafari)) {
      const riskyIssues = this.getRiskyIssues(videoCodec, audioCodec, isSafari)
      return {
        tier: CompatibilityTier.RISKY,
        score: 50,
        issues: riskyIssues,
        container,
        videoCodec,
        audioCodec,
        canPlay: true,
        requiresTranscoding: false
      }
    }
    
    // TRANSCODING REQUIRED: Non-MP4 or incompatible codecs
    const transcodingIssues = this.getTranscodingRequiredReasons(name, container, videoCodec, audioCodec)
    return {
      tier: CompatibilityTier.TRANSCODING_REQUIRED,
      score: 25,
      issues: transcodingIssues,
      container,
      videoCodec,
      audioCodec,
      canPlay: true,
      requiresTranscoding: true
    }
  }
  
  private static detectContainer(name: string): string | undefined {
    // Enhanced format detection with multiple patterns
    const nameLower = name.toLowerCase()
    
    // MP4 detection - most reliable for browsers
    if (/\.mp4\b/i.test(name) || /\bmp4\b/i.test(name)) return 'MP4'
    
    // MKV detection - CRITICAL: Must catch all variants
    if (/\.mkv\b/i.test(name) || /\bmkv\b/i.test(name) ||
        /matroska/i.test(name)) return 'MKV'
    
    // WebM detection
    if (/\.webm\b/i.test(name) || /\bwebm\b/i.test(name)) return 'WebM'
    
    // AVI detection
    if (/\.avi\b/i.test(name) || /\bavi\b/i.test(name)) return 'AVI'
    
    // MOV detection
    if (/\.mov\b/i.test(name) || /\bmov\b/i.test(name)) return 'MOV'
    
    return undefined
  }
  
  private static detectVideoCodec(name: string): string | undefined {
    if (/(x264|h\.?264|avc)/i.test(name)) return 'H.264'
    if (/(x265|h\.?265|hevc)/i.test(name)) return 'HEVC'
    if (/av1/i.test(name)) return 'AV1'
    if (/vp9/i.test(name)) return 'VP9'
    if (/vp8/i.test(name)) return 'VP8'
    return undefined
  }
  
  private static detectAudioCodec(name: string): string | undefined {
    if (/aac/i.test(name)) return 'AAC'
    if (/mp3/i.test(name)) return 'MP3'
    if (/opus/i.test(name)) return 'Opus'
    if (/ac3|dd5\.1/i.test(name)) return 'AC3'
    if (/eac3|ddp|dd\+/i.test(name)) return 'EAC3'
    if (/dts/i.test(name)) return 'DTS'
    if (/truehd/i.test(name)) return 'TrueHD'
    if (/flac/i.test(name)) return 'FLAC'
    return undefined
  }
  
  private static hasAbsoluteIncompatibilities(name: string, isSafari: boolean): boolean {
    // Formats that cannot be played even with transcoding (corrupted, incomplete, etc.)
    if (/(sample|trailer|xxx|adult)/i.test(name)) return true
    if (/(incomplete|partial|corrupt)/i.test(name)) return true
    
    // Safari-specific absolute incompatibilities
    if (isSafari) {
      // Safari cannot handle these even with transcoding in our current setup
      if (/remux/i.test(name)) return true
      if (/(10bit|10-bit)/i.test(name)) return true
      if (/(hdr|dolby\.vision|dv)/i.test(name)) return true
    }
    
    return false
  }
  
  private static getIncompatibilityReasons(name: string, isSafari: boolean): string[] {
    const reasons: string[] = []
    
    if (/(sample|trailer)/i.test(name)) {
      reasons.push('Sample or trailer file')
    }
    if (/(incomplete|partial)/i.test(name)) {
      reasons.push('Incomplete download')
    }
    if (isSafari && /remux/i.test(name)) {
      reasons.push('Remux files not supported in Safari')
    }
    if (isSafari && /(10bit|10-bit)/i.test(name)) {
      reasons.push('10-bit encoding not supported in Safari')
    }
    if (isSafari && /(hdr|dolby\.vision)/i.test(name)) {
      reasons.push('HDR metadata not supported in Safari web player')
    }
    
    return reasons
  }
  
  private static isUltraSafe(
    container?: string,
    videoCodec?: string,
    audioCodec?: string
  ): boolean {
    return (
      container === 'MP4' &&
      videoCodec === 'H.264' &&
      (audioCodec === 'AAC' || audioCodec === 'MP3')
    )
  }
  
  private static isSafe(
    container?: string,
    videoCodec?: string,
    audioCodec?: string,
    isSafari: boolean = false
  ): boolean {
    if (container !== 'MP4') return false
    if (videoCodec !== 'H.264') return false
    
    // Safari is more restrictive with audio
    if (isSafari) {
      return audioCodec === 'AAC' || audioCodec === 'MP3' || !audioCodec
    }
    
    // Non-Safari browsers can handle more audio codecs in MP4
    return (
      !audioCodec || // No explicit audio codec mentioned
      audioCodec === 'AAC' ||
      audioCodec === 'MP3' ||
      audioCodec === 'Opus' ||
      audioCodec === 'AC3'
    )
  }
  
  private static isRisky(
    container?: string,
    videoCodec?: string,
    audioCodec?: string,
    isSafari: boolean = false
  ): boolean {
    // MP4 with HEVC (Safari 11+ only, hardware dependent)
    if (container === 'MP4' && videoCodec === 'HEVC') {
      return isSafari || true // Risky for all browsers
    }
    
    // MP4 with unknown codec
    if (container === 'MP4' && !videoCodec) {
      return true
    }
    
    // MP4 with problematic audio
    if (container === 'MP4' && videoCodec === 'H.264') {
      return audioCodec === 'DTS' || audioCodec === 'TrueHD' || audioCodec === 'FLAC'
    }
    
    return false
  }
  
  private static getAudioCompatibilityIssues(audioCodec?: string): string[] {
    if (!audioCodec) return []
    
    const issues: string[] = []
    if (audioCodec === 'AC3') {
      issues.push('AC3 audio may not work in all browsers')
    }
    if (audioCodec === 'EAC3') {
      issues.push('EAC3 audio may require transcoding')
    }
    
    return issues
  }
  
  private static getRiskyIssues(
    videoCodec?: string,
    audioCodec?: string,
    isSafari: boolean = false
  ): string[] {
    const issues: string[] = []
    
    if (videoCodec === 'HEVC') {
      if (isSafari) {
        issues.push('HEVC in Safari requires version 11+ and hardware support')
      } else {
        issues.push('HEVC support varies by browser and hardware')
      }
    }
    
    if (!videoCodec) {
      issues.push('Unknown video codec - may not be compatible')
    }
    
    if (audioCodec === 'DTS' || audioCodec === 'TrueHD') {
      issues.push(`${audioCodec} audio not supported in browsers`)
    }
    
    return issues
  }
  
  private static getTranscodingRequiredReasons(
    name: string,
    container?: string,
    videoCodec?: string,
    audioCodec?: string
  ): string[] {
    const reasons: string[] = []
    
    if (container && container !== 'MP4') {
      reasons.push(`${container} container requires transcoding to MP4`)
    }
    
    if (videoCodec && videoCodec !== 'H.264' && videoCodec !== 'HEVC') {
      reasons.push(`${videoCodec} video codec requires transcoding to H.264`)
    }
    
    if (audioCodec === 'DTS' || audioCodec === 'TrueHD' || audioCodec === 'FLAC') {
      reasons.push(`${audioCodec} audio requires transcoding to AAC`)
    }
    
    if (!container && !videoCodec) {
      reasons.push('Unknown format - may require transcoding')
    }
    
    return reasons
  }
  
  /**
   * Get format compatibility score for prioritization
   * MP4 and WebM get highest scores for browser compatibility
   */
  static getFormatScore(container?: string): number {
    if (!container) return 0
    
    switch (container) {
      case 'MP4':
        return 1000 // Highest priority - best browser support
      case 'WebM':
        return 900  // Good browser support
      case 'MKV':
        return -2000 // CRITICAL: Never select MKV
      case 'AVI':
        return -1000 // Not browser compatible
      case 'MOV':
        return 500   // Limited support
      default:
        return 0
    }
  }
  
  /**
   * Filter streams by compatibility tier
   * Returns only streams that meet the minimum tier requirement
   * EXCLUDES MKV format streams automatically
   */
  static filterByTier(
    streams: Array<{ name: string }>,
    minTier: CompatibilityTier,
    isSafari: boolean = false
  ): Array<{ name: string; compatibility: CompatibilityResult }> {
    const tierOrder = [
      CompatibilityTier.ULTRA_SAFE,
      CompatibilityTier.SAFE,
      CompatibilityTier.RISKY,
      CompatibilityTier.TRANSCODING_REQUIRED,
      CompatibilityTier.INCOMPATIBLE
    ]
    
    const minTierIndex = tierOrder.indexOf(minTier)
    
    return streams
      .map(stream => ({
        ...stream,
        compatibility: this.analyze(stream.name, isSafari)
      }))
      .filter(stream => {
        // CRITICAL: Always filter out MKV regardless of tier
        if (stream.compatibility.container === 'MKV') {
          console.log(`🚫 [TIER FILTER] Blocked MKV: ${stream.name.substring(0, 60)}...`)
          return false
        }
        
        const streamTierIndex = tierOrder.indexOf(stream.compatibility.tier)
        return streamTierIndex <= minTierIndex
      })
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
  }
  
  /**
   * Get best available streams with fallback tiers
   * Stremio's approach: Try best tier first, fallback if none available
   * CRITICAL: Filters out MKV files aggressively for web browsers
   */
  static getBestAvailableStreams<T extends { name: string }>(
    streams: T[],
    isSafari: boolean = false,
    webSafeMode: boolean = false
  ): T[] {
    if (streams.length === 0) return []
    
    console.log(`🎯 [COMPATIBILITY] Analyzing ${streams.length} streams (Safari: ${isSafari}, WebSafe: ${webSafeMode})`)
    
    // PHASE 1: AGGRESSIVE MKV FILTERING (browsers cannot play MKV)
    const preFiltered = streams.filter(stream => {
      const container = this.detectContainer(stream.name)
      const isMKV = container === 'MKV'
      
      if (isMKV) {
        console.log(`🚫 [MKV FILTER] Blocked: ${stream.name.substring(0, 80)}...`)
        return false
      }
      return true
    })
    
    const mkvCount = streams.length - preFiltered.length
    if (mkvCount > 0) {
      console.log(`🚫 [MKV FILTER] Removed ${mkvCount} MKV streams`)
      console.log(`✅ [FORMAT FILTER] ${preFiltered.length} browser-compatible streams remaining`)
    }
    
    // Log format distribution AFTER filtering
    const formatCounts = preFiltered.reduce((acc, s) => {
      const container = this.detectContainer(s.name) || 'UNKNOWN'
      acc[container] = (acc[container] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(`📊 [FORMAT DISTRIBUTION] After MKV filter:`, formatCounts)
    
    // If all streams were MKV, return empty (no fallback - MKV won't work)
    if (preFiltered.length === 0) {
      console.error(`❌ [MKV FILTER] ALL streams were MKV format - no playable streams available`)
      return []
    }
    
    // PHASE 2: Analyze compatibility of remaining streams
    const analyzed = preFiltered.map(stream => ({
      stream,
      compatibility: this.analyze(stream.name, isSafari)
    }))
    
    // If web-safe mode, only return ultra-safe and safe tiers
    if (webSafeMode) {
      const webSafe = analyzed.filter(a =>
        a.compatibility.tier === CompatibilityTier.ULTRA_SAFE ||
        a.compatibility.tier === CompatibilityTier.SAFE
      )
      
      console.log(`🎯 [WEB-SAFE MODE] Found ${webSafe.length} web-safe streams`)
      return webSafe
        .sort((a, b) => b.compatibility.score - a.compatibility.score)
        .map(a => a.stream)
    }
    
    // PHASE 3: Try each tier in order (prioritizing browser-compatible formats)
    const tiers = [
      CompatibilityTier.ULTRA_SAFE,
      CompatibilityTier.SAFE,
      CompatibilityTier.RISKY,
      CompatibilityTier.TRANSCODING_REQUIRED
    ]
    
    for (const tier of tiers) {
      const tierStreams = analyzed.filter(a => a.compatibility.tier === tier)
      if (tierStreams.length > 0) {
        console.log(`🎯 [COMPATIBILITY] Using tier: ${tier} (${tierStreams.length} streams)`)
        
        // Log sample of selected streams
        tierStreams.slice(0, 3).forEach((t, i) => {
          const container = t.compatibility.container || 'Unknown'
          console.log(`  ${i+1}. [${container}] ${t.stream.name.substring(0, 70)}...`)
        })
        
        return tierStreams
          .sort((a, b) => b.compatibility.score - a.compatibility.score)
          .map(a => a.stream)
      }
    }
    
    // No compatible streams found after MKV filtering
    console.warn(`⚠️ [COMPATIBILITY] No compatible streams found in any tier`)
    return preFiltered // Return MKV-filtered list as last resort
  }
}
