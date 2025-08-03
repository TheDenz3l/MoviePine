// OpenSubtitles API Integration for subtitle fetching
// OpenSubtitles REST API: https://opensubtitles.stoplight.io/docs/opensubtitles-api

export interface OpenSubtitlesSubtitle {
  id: string
  type: string
  attributes: {
    subtitle_id: string
    language: string
    download_count: number
    new_download_count: number
    hearing_impaired: boolean
    hd: boolean
    fps: number
    votes: number
    points: number
    ratings: number
    from_trusted: boolean
    foreign_parts_only: boolean
    ai_translated: boolean
    machine_translated: boolean
    upload_date: string
    release: string
    comments: string
    legacy_subtitle_id: number
    uploader: {
      uploader_id: number
      name: string
      rank: string
    }
    feature_details: {
      feature_id: number
      feature_type: string
      year: number
      title: string
      movie_name: string
      imdb_id: number
      tmdb_id: number
    }
    url: string
    related_links: {
      label: string
      url: string
      img_url: string
    }[]
    files: {
      file_id: number
      cd_number: number
      file_name: string
    }[]
  }
}

export interface OpenSubtitlesSearchResult {
  total_pages: number
  total_count: number
  per_page: number
  page: number
  data: OpenSubtitlesSubtitle[]
}

export interface OpenSubtitlesDownloadResult {
  link: string
  file_name: string
  requests: number
  remaining: number
  message: string
  reset_time: string
  reset_time_utc: string
}

export class OpenSubtitlesAPI {
  private apiKey: string
  private baseUrl = 'https://api.opensubtitles.com/api/v1'
  private userAgent = 'MoviePine v1.0'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers = {
      'Api-Key': this.apiKey,
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenSubtitles API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Search for subtitles by IMDB ID
  async searchSubtitles(params: {
    imdbId?: string
    tmdbId?: number
    query?: string
    languages?: string[] // ISO 639-1 codes like ['en', 'es', 'fr']
    hearingImpaired?: boolean
    trustedSources?: boolean
    page?: number
  }): Promise<OpenSubtitlesSearchResult> {
    const searchParams = new URLSearchParams()

    if (params.imdbId) {
      // Remove 'tt' prefix if present
      const cleanImdbId = params.imdbId.replace(/^tt/, '')
      searchParams.append('imdb_id', cleanImdbId)
    }

    if (params.tmdbId) {
      searchParams.append('tmdb_id', params.tmdbId.toString())
    }

    if (params.query) {
      searchParams.append('query', params.query)
    }

    if (params.languages && params.languages.length > 0) {
      searchParams.append('languages', params.languages.join(','))
    }

    if (params.hearingImpaired !== undefined) {
      searchParams.append('hearing_impaired', params.hearingImpaired ? 'include' : 'exclude')
    }

    if (params.trustedSources) {
      searchParams.append('trusted_sources', 'only')
    }

    if (params.page) {
      searchParams.append('page', params.page.toString())
    }

    // Default to ordering by download count
    searchParams.append('order_by', 'download_count')
    searchParams.append('order_direction', 'desc')

    return this.makeRequest<OpenSubtitlesSearchResult>(`/subtitles?${searchParams.toString()}`)
  }

  // Download subtitle file
  async downloadSubtitle(fileId: number): Promise<OpenSubtitlesDownloadResult> {
    return this.makeRequest<OpenSubtitlesDownloadResult>('/download', {
      method: 'POST',
      body: JSON.stringify({
        file_id: fileId,
        sub_format: 'srt', // Request SRT format
      }),
    })
  }

  // Get subtitle content as text
  async getSubtitleContent(fileId: number): Promise<string> {
    const downloadResult = await this.downloadSubtitle(fileId)
    
    // Download the actual subtitle file
    const response = await fetch(downloadResult.link)
    if (!response.ok) {
      throw new Error(`Failed to download subtitle file: ${response.status} ${response.statusText}`)
    }

    return response.text()
  }

  // Find best subtitle for a movie
  async findBestSubtitle(params: {
    imdbId?: string
    tmdbId?: number
    language: string
    trustedOnly?: boolean
  }): Promise<OpenSubtitlesSubtitle | null> {
    try {
      const searchResult = await this.searchSubtitles({
        imdbId: params.imdbId,
        tmdbId: params.tmdbId,
        languages: [params.language],
        trustedSources: params.trustedOnly,
        hearingImpaired: false,
        page: 1,
      })

      if (searchResult.data.length === 0) {
        return null
      }

      // Return the first result (highest download count due to ordering)
      return searchResult.data[0]
    } catch (error) {
      console.error('Error finding best subtitle:', error)
      return null
    }
  }

  // Get available languages for a movie
  async getAvailableLanguages(params: {
    imdbId?: string
    tmdbId?: number
  }): Promise<string[]> {
    try {
      const searchResult = await this.searchSubtitles({
        imdbId: params.imdbId,
        tmdbId: params.tmdbId,
        page: 1,
      })

      const languages = new Set<string>()
      searchResult.data.forEach(subtitle => {
        languages.add(subtitle.attributes.language)
      })

      return Array.from(languages).sort()
    } catch (error) {
      console.error('Error getting available languages:', error)
      return []
    }
  }
}

// Helper function to parse SRT subtitle format
export function parseSRT(srtContent: string): { text: string; startTime: number; endTime: number }[] {
  const subtitles: { text: string; startTime: number; endTime: number }[] = []
  const blocks = srtContent.trim().split('\n\n')
  
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length >= 3) {
      const timeLine = lines[1]
      const textLines = lines.slice(2)
      
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
      if (timeMatch) {
        const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
        const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000
        
        subtitles.push({
          text: textLines.join('\n').replace(/<[^>]*>/g, ''), // Remove HTML tags
          startTime,
          endTime
        })
      }
    }
  }
  
  return subtitles
}
