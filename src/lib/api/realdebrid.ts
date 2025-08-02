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
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      console.log(`🔗 Real-Debrid API call: ${options.method || 'GET'} ${endpoint}`)

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      console.log(`📡 Real-Debrid response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Real-Debrid API error: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`Real-Debrid API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Real-Debrid response data:`, data)
      return data
    } catch (error) {
      console.error(`💥 Real-Debrid API request failed:`, error)
      throw error
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const user = await this.getUser()
      console.log(`✅ Real-Debrid connected: ${user.username} (Premium: ${user.premium ? 'Yes' : 'No'})`)
      return true
    } catch (error) {
      console.error('❌ Real-Debrid connection failed:', error)
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
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        // Don't set Content-Type for FormData, let browser set it
      },
    })
  }

  // Select files for a torrent
  async selectFiles(id: string, fileIds: string = 'all'): Promise<void> {
    const formData = new FormData()
    formData.append('files', fileIds)

    await this.makeRequest(`/torrents/selectFiles/${id}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })
  }

  // Get download link for a file
  async getDownloadLink(link: string): Promise<RealDebridLink> {
    const formData = new FormData()
    formData.append('link', link)

    return this.makeRequest<RealDebridLink>('/unrestrict/link', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
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

    return videoFiles.reduce((largest, current) => 
      current.bytes > largest.bytes ? current : largest
    )
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
    
    return downloadInfo.download
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
