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
    return downloadLink.url
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
    
    return videoFiles.reduce((largest, current) => 
      current.size > largest.size ? current : largest
    )
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
