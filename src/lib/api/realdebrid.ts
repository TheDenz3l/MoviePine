// Real-Debrid API client for premium streaming
export interface RealDebridTorrent {
  id: string
  filename: string
  original_filename: string
  hash: string
  bytes: number
  original_bytes: number
  host: string
  split: number
  progress: number
  status: 'magnet_error' | 'magnet_conversion' | 'waiting_files_selection' | 'queued' | 'downloading' | 'downloaded' | 'error' | 'virus' | 'compressing' | 'uploading' | 'dead'
  added: string
  files: RealDebridFile[]
  links: string[]
  ended?: string
  speed?: number
  seeders?: number
}

export interface RealDebridFile {
  id: number
  path: string
  bytes: number
  selected: number
}

export interface RealDebridLink {
  id: string
  filename: string
  mimeType: string
  filesize: number
  link: string
  host: string
  host_icon: string
  chunks: number
  crc: number
  download: string
  streamable: number
}

export interface RealDebridUser {
  id: number
  username: string
  email: string
  points: number
  locale: string
  avatar: string
  type: string
  premium: number
  expiration: string
}

export class RealDebridAPI {
  private apiKey: string
  private baseUrl = 'https://api.real-debrid.com/rest/1.0'

  constructor(apiKey: string) {
    this.apiKey = apiKey
    
    // Log initialization
    console.log('🔐 Real-Debrid API initialized with key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NO KEY')
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      console.log(`🔗 Real-Debrid API call: ${options.method || 'GET'} ${endpoint}`)

      // Prepare headers - don't set Content-Type if body is FormData
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers as Record<string, string>,
      }

      // Only set Content-Type to application/json if not using FormData
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      console.log(`📡 Real-Debrid response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        
        // Parse error response to check for expected errors
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: 'unknown', error_code: 0 }
        }

        // Handle expected errors more gracefully (don't log as errors)
        const expectedErrors = [
          'hoster_unsupported',     // Error code 16 - hoster not supported
          'parameter_missing',      // Error code 1 - missing parameters
          'bad_token',             // Error code 8 - invalid API key
          'permission_denied',     // Error code 8 - access denied
        ]
        
        const isExpectedError = expectedErrors.includes(errorData.error)

        if (isExpectedError) {
          // For bad_token errors, provide helpful guidance
          if (errorData.error === 'bad_token') {
            console.warn('⚠️ Real-Debrid API key is invalid or expired')
            console.warn('📝 To fix this:')
            console.warn('   1. Go to https://real-debrid.com/apitoken')
            console.warn('   2. Generate a new API token')
            console.warn('   3. Update NEXT_PUBLIC_DEBRID_API_KEY in .env.local')
            console.warn('   4. Restart your Next.js dev server')
          }
          
          // For expected errors, return a special error object that can be handled gracefully
          throw {
            isExpectedError: true,
            errorType: errorData.error,
            errorCode: errorData.error_code,
            message: `Real-Debrid expected limitation: ${errorData.error}`,
            originalError: errorData
          }
        } else {
          console.error(`❌ Real-Debrid API error: ${response.status} ${response.statusText}`, errorText)
          throw new Error(`Real-Debrid API error: ${response.status} ${response.statusText} - ${errorText}`)
        }
      }

      const data = await response.json()
      console.log(`✅ Real-Debrid response data:`, data)
      return data
    } catch (error: any) {
      // Only log unexpected errors, not expected limitations
      if (!error.isExpectedError) {
        console.error(`💥 Real-Debrid API request failed:`, error)
      }
      throw error
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const user = await this.getUser()
      console.log(`✅ Real-Debrid connected: ${user.username} (Premium: ${user.premium ? 'Yes' : 'No'})`)
      return true
    } catch (error: any) {
      // Check if it's a bad token error
      if (error?.errorType === 'bad_token' || error?.errorCode === 8) {
        console.warn('⚠️ Real-Debrid API key is invalid or expired. Please update NEXT_PUBLIC_DEBRID_API_KEY in .env.local')
        console.warn('📝 Get a new API key from: https://real-debrid.com/apitoken')
      } else {
        console.error('❌ Real-Debrid connection failed:', error)
      }
      return false
    }
  }

  // Get user information
  async getUser(): Promise<RealDebridUser> {
    return this.makeRequest<RealDebridUser>('/user')
  }

  // Get all torrents
  async getTorrents(): Promise<RealDebridTorrent[]> {
    return this.makeRequest<RealDebridTorrent[]>('/torrents')
  }

  // Get torrent info by ID
  async getTorrent(id: string): Promise<RealDebridTorrent> {
    return this.makeRequest<RealDebridTorrent>(`/torrents/info/${id}`)
  }

  // Add a magnet link
  async addMagnet(magnetLink: string): Promise<{ id: string; uri: string }> {
    const formData = new FormData()
    formData.append('magnet', magnetLink)

    return this.makeRequest<{ id: string; uri: string }>('/torrents/addMagnet', {
      method: 'POST',
      body: formData,
    })
  }

  // Select files for a torrent
  async selectFiles(id: string, fileIds: string = 'all'): Promise<void> {
    const formData = new FormData()
    formData.append('files', fileIds)

    await this.makeRequest(`/torrents/selectFiles/${id}`, {
      method: 'POST',
      body: formData,
    })
  }

  // Get download link for a file
  async getDownloadLink(link: string): Promise<RealDebridLink> {
    const formData = new FormData()
    formData.append('link', link)

    return this.makeRequest<RealDebridLink>('/unrestrict/link', {
      method: 'POST',
      body: formData,
    })
  }

  // Delete a torrent
  async deleteTorrent(id: string): Promise<void> {
    await this.makeRequest(`/torrents/delete/${id}`, {
      method: 'DELETE',
    })
  }

  // Find torrent by hash
  async findTorrentByHash(hash: string): Promise<RealDebridTorrent | null> {
    const torrents = await this.getTorrents()
    return torrents.find(t => t.hash.toLowerCase() === hash.toLowerCase()) || null
  }

  // Check if torrent is ready for streaming
  isReady(torrent: RealDebridTorrent): boolean {
    return torrent.status === 'downloaded' && torrent.links.length > 0
  }

  // Get the largest video file from a torrent
  getLargestVideoFile(torrent: RealDebridTorrent): RealDebridFile | null {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']
    
    const videoFiles = torrent.files.filter(file => 
      videoExtensions.some(ext => file.path.toLowerCase().endsWith(ext))
    )

    if (videoFiles.length === 0) return null
    
    // PRIORITY 1: MP4 format is top priority for universal compatibility
    const mp4Files = videoFiles.filter(f => /\.mp4$/i.test(f.path))
    if (mp4Files.length > 0) {
      console.log(`🎯 [MP4 PRIORITY] Found ${mp4Files.length} MP4 files, selecting best quality`)
      
      // Within MP4 files, prioritize by quality indicators and codec compatibility
      const scoredMp4s = mp4Files.map(f => {
        const name = f.path.toLowerCase()
        let score = 0
        
        // Quality scoring (highest priority within MP4s)
        if (/(2160|4k)/.test(name)) score += 1000
        else if (/1080/.test(name)) score += 800
        else if (/720/.test(name)) score += 600
        else if (/480/.test(name)) score += 400
        else score += 200 // SD or unknown
        
        // Codec compatibility scoring
        if (/(hevc|x265|h\.265)/.test(name)) score += 50
        else if (/(h\.264|x264|avc)/.test(name)) score += 45
        else score += 30 // other codecs
        
        // Audio compatibility bonus
        if (/(aac|mp3|opus)/.test(name)) score += 20
        else if (/(ddp|dd\+|eac3)/.test(name)) score += 15
        else if (/(ac3|dd)/.test(name)) score += 10
        
        // Size factor (normalized to prevent overwhelming other factors)
        score += Math.min(f.bytes / (1024*1024*100), 50) // up to +50 for very large files
        
        return { f, score, name }
      }).sort((a, b) => b.score - a.score)
      
      console.log(`🏆 [MP4 SELECTED] ${scoredMp4s[0].name} (score: ${scoredMp4s[0].score})`)
      return scoredMp4s[0].f
    }
    
    // FALLBACK: If no MP4 files, use quality-based selection on other formats
    console.log(`⚠️ [NO MP4] No MP4 files found, falling back to other formats`)
    const scoredVideos = videoFiles.map(f => {
      const name = f.path.toLowerCase()
      let score = 0
      
      // Format preference (MP4 would be here but already handled above)
      if (/\.webm$/i.test(f.path)) score += 100 // Second best for web compatibility
      else if (/\.mkv$/i.test(f.path)) score += 80
      else if (/\.avi$/i.test(f.path)) score += 60
      else score += 40
      
      // Quality scoring
      if (/(2160|4k)/.test(name)) score += 1000
      else if (/1080/.test(name)) score += 800
      else if (/720/.test(name)) score += 600
      else if (/480/.test(name)) score += 400
      else score += 200
      
      // Size factor
      score += Math.min(f.bytes / (1024*1024*100), 50)
      
      return { f, score }
    }).sort((a, b) => b.score - a.score)
    
    return scoredVideos[0].f
  }

  // Get streaming URL for a torrent
  async getStreamingUrl(torrent: RealDebridTorrent): Promise<string | null> {
    if (!this.isReady(torrent)) {
      throw new Error('Torrent is not ready for streaming')
    }

    const videoFile = this.getLargestVideoFile(torrent)
    if (!videoFile) {
      throw new Error('No video files found in torrent')
    }

    // Get the download link for the video file
    const fileLink = torrent.links[0] // Usually the first link is the main file
    const downloadInfo = await this.getDownloadLink(fileLink)

    // Use stream proxy for Real-Debrid URLs to handle CORS and streaming
    const directUrl = downloadInfo.download
    if (directUrl.includes('real-debrid.com') || directUrl.includes('download.')) {
      const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(directUrl)}`
      console.log(`🔄 Using stream proxy for Real-Debrid URL: ${proxiedUrl.substring(0, 100)}...`)
      return proxiedUrl
    }

    return directUrl
  }

  // Add torrent and wait for it to be ready
  async addTorrentAndWait(magnetLink: string, maxWaitTime = 120000): Promise<RealDebridTorrent> {
    try {
      console.log('🔄 Adding magnet to Real-Debrid...')
      console.log(`🧲 Magnet link: ${magnetLink.substring(0, 100)}...`)

      const { id } = await this.addMagnet(magnetLink)
      console.log(`📁 Torrent added with ID: ${id}`)

      // Select all files
      console.log('📋 Selecting all files...')
      await this.selectFiles(id, 'all')

      const startTime = Date.now()
      let lastStatus = ''
      let checkCount = 0

      while (Date.now() - startTime < maxWaitTime) {
        checkCount++
        const torrent = await this.getTorrent(id)

        // Log status changes
        if (torrent.status !== lastStatus) {
          console.log(`📊 Torrent status: ${torrent.status} (${torrent.progress}%) - Check #${checkCount}`)
          lastStatus = torrent.status
        }

        if (this.isReady(torrent)) {
          console.log('✅ Torrent is ready for streaming!')
          return torrent
        }

        if (torrent.status === 'error' || torrent.status === 'virus' || torrent.status === 'dead') {
          throw new Error(`Torrent failed with status: ${torrent.status}`)
        }

        // For cached torrents, they should be ready almost immediately
        // If it's taking too long, it's probably not cached
        if (checkCount > 10 && torrent.status === 'downloading') {
          throw new Error(`Torrent is downloading (not cached). This may take a while. Current progress: ${torrent.progress}%`)
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      throw new Error(`Torrent did not become ready within ${maxWaitTime / 1000} seconds. Current status: ${lastStatus}`)
    } catch (error) {
      console.error('💥 addTorrentAndWait failed:', error)
      throw error
    }
  }
}

export default RealDebridAPI
