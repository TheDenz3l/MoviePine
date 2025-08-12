// Torbox API Integration
// Based on Torbox API documentation

export interface TorboxTorrent {
  id: number
  hash: string
  name: string
  size: number
  progress: number
  download_speed: number
  upload_speed: number
  eta: number
  status: 'downloading' | 'seeding' | 'paused' | 'error' | 'completed'
  added_at: string
  completed_at?: string
  files: TorboxFile[]
}

export interface TorboxFile {
  id: number
  name: string
  size: number
  mime_type: string
  download_url?: string
}

export interface TorboxUser {
  id: number
  email: string
  plan: string
  premium_expires_at?: string
  server: string
}

export interface TorboxDownloadLink {
  url: string
  expires_at: string
}

export class TorboxAPI {
  private apiKey: string
  private baseUrl = 'https://api.torbox.app/v1/api'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Torbox API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  }

  // User methods
  async getUser(): Promise<TorboxUser> {
    return this.makeRequest<TorboxUser>('/user/me')
  }

  // Torrent methods
  async getTorrents(): Promise<TorboxTorrent[]> {
    const response = await this.makeRequest<{ data: TorboxTorrent[] }>('/torrents/mylist')
    return response.data
  }

  async getTorrent(id: number): Promise<TorboxTorrent> {
    return this.makeRequest<TorboxTorrent>(`/torrents/mylist/${id}`)
  }

  async addTorrent(magnetLink: string): Promise<{ id: number }> {
    return this.makeRequest<{ id: number }>('/torrents/createtorrent', {
      method: 'POST',
      body: JSON.stringify({
        magnet: magnetLink,
      }),
    })
  }

  async addTorrentByHash(infoHash: string): Promise<{ id: number }> {
    return this.makeRequest<{ id: number }>('/torrents/createtorrent', {
      method: 'POST',
      body: JSON.stringify({
        hash: infoHash,
      }),
    })
  }

  async deleteTorrent(id: number): Promise<void> {
    await this.makeRequest(`/torrents/controltorrent`, {
      method: 'POST',
      body: JSON.stringify({
        torrent_id: id,
        operation: 'delete',
      }),
    })
  }

  async pauseTorrent(id: number): Promise<void> {
    await this.makeRequest(`/torrents/controltorrent`, {
      method: 'POST',
      body: JSON.stringify({
        torrent_id: id,
        operation: 'pause',
      }),
    })
  }

  async resumeTorrent(id: number): Promise<void> {
    await this.makeRequest(`/torrents/controltorrent`, {
      method: 'POST',
      body: JSON.stringify({
        torrent_id: id,
        operation: 'resume',
      }),
    })
  }

  // File methods
  async getTorrentFiles(torrentId: number): Promise<TorboxFile[]> {
    const response = await this.makeRequest<{ data: TorboxFile[] }>(`/torrents/mylist/${torrentId}`)
    return response.data
  }

  async getDownloadLink(torrentId: number, fileId?: number): Promise<TorboxDownloadLink> {
    const endpoint = fileId 
      ? `/torrents/requestdl?torrent_id=${torrentId}&file_id=${fileId}`
      : `/torrents/requestdl?torrent_id=${torrentId}`
    
    return this.makeRequest<TorboxDownloadLink>(endpoint)
  }

  // Streaming methods
  async getStreamingUrl(torrentId: number, fileId?: number): Promise<string> {
    const downloadLink = await this.getDownloadLink(torrentId, fileId)
    const directUrl = downloadLink.url

    // Use stream proxy for Torbox URLs to handle CORS and streaming
    if (directUrl.includes('torbox.app') || directUrl.includes('download.')) {
      const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(directUrl)}`
      console.log(`🔄 Using stream proxy for Torbox URL: ${proxiedUrl.substring(0, 100)}...`)
      return proxiedUrl
    }

    return directUrl
  }

  // Helper methods
  async findTorrentByHash(infoHash: string): Promise<TorboxTorrent | null> {
    const torrents = await this.getTorrents()
    return torrents.find(t => t.hash.toLowerCase() === infoHash.toLowerCase()) || null
  }

  async getOrCreateTorrent(infoHash: string): Promise<TorboxTorrent> {
    // First try to find existing torrent
    let torrent = await this.findTorrentByHash(infoHash)
    
    if (!torrent) {
      // Create new torrent
      const result = await this.addTorrentByHash(infoHash)
      torrent = await this.getTorrent(result.id)
    }
    
    return torrent
  }

  async getVideoFiles(torrentId: number): Promise<TorboxFile[]> {
    const files = await this.getTorrentFiles(torrentId)
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']
    
    return files.filter(file => 
      videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    )
  }

  async getLargestVideoFile(torrentId: number): Promise<TorboxFile | null> {
    const videoFiles = await this.getVideoFiles(torrentId)
    if (videoFiles.length === 0) return null
    
    // PRIORITY 1: MP4 format is top priority for universal compatibility
    const mp4Files = videoFiles.filter(f => /\.mp4$/i.test(f.name))
    if (mp4Files.length > 0) {
      console.log(`🎯 [MP4 PRIORITY] Found ${mp4Files.length} MP4 files, selecting best quality`)
      
      // Within MP4 files, prioritize by quality indicators and codec compatibility
      const scoredMp4s = mp4Files.map(f => {
        const name = f.name.toLowerCase()
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
        score += Math.min(f.size / (1024*1024*100), 50) // up to +50 for very large files
        
        return { f, score, name }
      }).sort((a, b) => b.score - a.score)
      
      console.log(`🏆 [MP4 SELECTED] ${scoredMp4s[0].name} (score: ${scoredMp4s[0].score})`)
      return scoredMp4s[0].f
    }
    
    // FALLBACK: If no MP4 files, use quality-based selection on other formats
    console.log(`⚠️ [NO MP4] No MP4 files found, falling back to other formats`)
    const scoredVideos = videoFiles.map(f => {
      const name = f.name.toLowerCase()
      let score = 0
      
      // Format preference (MP4 would be here but already handled above)
      if (/\.webm$/i.test(f.name)) score += 100 // Second best for web compatibility
      else if (/\.mkv$/i.test(f.name)) score += 80
      else if (/\.avi$/i.test(f.name)) score += 60
      else score += 40
      
      // Quality scoring
      if (/(2160|4k)/.test(name)) score += 1000
      else if (/1080/.test(name)) score += 800
      else if (/720/.test(name)) score += 600
      else if (/480/.test(name)) score += 400
      else score += 200
      
      // Size factor
      score += Math.min(f.size / (1024*1024*100), 50)
      
      return { f, score }
    }).sort((a, b) => b.score - a.score)
    
    return scoredVideos[0].f
  }

  // Utility method to check if API key is valid
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getUser()
      return true
    } catch (error) {
      return false
    }
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Format download speed for display
  formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s'
  }
}

// Helper function to create Torbox API instance
export function createTorboxAPI(apiKey: string): TorboxAPI {
  return new TorboxAPI(apiKey)
}
