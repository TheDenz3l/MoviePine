// Debug utilities for streaming functionality

export interface StreamingDebugInfo {
  movieId: string
  searchIds: Array<{id: string, type: string}>
  streamsFound: number
  selectedStream?: {
    quality: string
    size: string
    seeders: number
    source: string
  }
  errors: string[]
  timing: {
    start: number
    idConversion?: number
    streamSearch?: number
    streamPreparation?: number
    total?: number
  }
}

export class StreamingDebugger {
  private static instance: StreamingDebugger
  private debugSessions: Map<string, StreamingDebugInfo> = new Map()
  private isDebugMode: boolean = false

  constructor() {
    // Enable debug mode in development or when explicitly enabled
    this.isDebugMode = process.env.NODE_ENV === 'development' || 
                      process.env.NEXT_PUBLIC_DEBUG_STREAMING === 'true'
  }

  static getInstance(): StreamingDebugger {
    if (!StreamingDebugger.instance) {
      StreamingDebugger.instance = new StreamingDebugger()
    }
    return StreamingDebugger.instance
  }

  startSession(movieId: string): string {
    const sessionId = `${movieId}_${Date.now()}`
    const debugInfo: StreamingDebugInfo = {
      movieId,
      searchIds: [],
      streamsFound: 0,
      errors: [],
      timing: {
        start: Date.now()
      }
    }
    
    this.debugSessions.set(sessionId, debugInfo)
    this.log(`🎬 Starting streaming debug session for ${movieId}`, sessionId)
    return sessionId
  }

  logSearchIds(sessionId: string, searchIds: Array<{id: string, type: string}>) {
    const session = this.debugSessions.get(sessionId)
    if (session) {
      session.searchIds = searchIds
      session.timing.idConversion = Date.now() - session.timing.start
      this.log(`🔍 Search IDs: ${searchIds.map(s => `${s.id} (${s.type})`).join(', ')}`, sessionId)
    }
  }

  logStreamsFound(sessionId: string, count: number, source: string) {
    const session = this.debugSessions.get(sessionId)
    if (session) {
      session.streamsFound = count
      session.timing.streamSearch = Date.now() - session.timing.start
      this.log(`📊 Found ${count} streams from ${source}`, sessionId)
    }
  }

  logSelectedStream(sessionId: string, stream: any) {
    const session = this.debugSessions.get(sessionId)
    if (session) {
      session.selectedStream = {
        quality: stream.quality || 'Unknown',
        size: stream.size || 'Unknown',
        seeders: stream.seeders || 0,
        source: stream.source || 'Unknown'
      }
      this.log(`✅ Selected stream: ${stream.quality} (${stream.size}, ${stream.seeders} seeders)`, sessionId)
    }
  }

  logError(sessionId: string, error: string) {
    const session = this.debugSessions.get(sessionId)
    if (session) {
      session.errors.push(error)
      this.log(`❌ Error: ${error}`, sessionId)
    }
  }

  endSession(sessionId: string, success: boolean) {
    const session = this.debugSessions.get(sessionId)
    if (session) {
      session.timing.total = Date.now() - session.timing.start
      
      this.log(`🏁 Session ended: ${success ? 'SUCCESS' : 'FAILED'}`, sessionId)
      this.log(`⏱️ Total time: ${session.timing.total}ms`, sessionId)
      
      if (this.isDebugMode) {
        console.group(`🎬 Streaming Debug Summary: ${session.movieId}`)
        console.log('Search IDs tried:', session.searchIds)
        console.log('Streams found:', session.streamsFound)
        console.log('Selected stream:', session.selectedStream)
        console.log('Errors:', session.errors)
        console.log('Timing:', session.timing)
        console.groupEnd()
      }
      
      // Clean up old sessions (keep last 10)
      if (this.debugSessions.size > 10) {
        const oldestKey = this.debugSessions.keys().next().value
        this.debugSessions.delete(oldestKey)
      }
    }
  }

  private log(message: string, sessionId?: string) {
    if (this.isDebugMode) {
      const prefix = sessionId ? `[${sessionId.split('_')[1]}]` : '[DEBUG]'
      console.log(`${prefix} ${message}`)
    }
  }

  // Get debug info for a session (useful for error reporting)
  getSessionInfo(sessionId: string): StreamingDebugInfo | null {
    return this.debugSessions.get(sessionId) || null
  }

  // Export debug data for troubleshooting
  exportDebugData(): any {
    return {
      sessions: Array.from(this.debugSessions.entries()),
      timestamp: new Date().toISOString(),
      debugMode: this.isDebugMode
    }
  }
}

// Convenience functions
export const streamingDebugger = StreamingDebugger.getInstance()

export function logStreamingStep(step: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎬 ${step}`, data ? JSON.stringify(data, null, 2) : '')
  }
}

export function logStreamingError(error: string, context?: any) {
  console.error(`❌ Streaming Error: ${error}`, context)
}

export function logStreamingSuccess(message: string, data?: any) {
  console.log(`✅ ${message}`, data)
}
