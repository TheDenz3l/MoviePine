/**
 * SubDL.com API integration for fetching real subtitle files
 * Provides actual .srt subtitle downloads instead of fake metadata
 */

const SUBDL_API_KEY = process.env.NEXT_PUBLIC_SUBDL_API_KEY || ''
const SUBDL_BASE_URL = 'https://api.subdl.com/api/v1'

export interface SubDLSubtitle {
  sd_id: string
  type: 'movie' | 'tv'
  name: string
  imdb_id?: string
  tmdb_id?: number
  year?: number
  season_number?: number
  episode_number?: number
  language: string
  author: string
  comment?: string
  release_name: string
  url: string
  download_count: number
  hi: boolean // Hearing Impaired
  rating: number
  votes: number
}

export interface SubDLSearchResult {
  status: boolean
  results: Array<{
    imdb_id?: string
    tmdb_id?: number
    type: 'movie' | 'tv'
    name: string
    sd_id: string
    first_air_date?: string
    year?: number
  }>
  subtitles: SubDLSubtitle[]
  error?: string
}

export interface SubtitleSearchParams {
  imdb_id?: string
  tmdb_id?: string | number
  film_name?: string
  type?: 'movie' | 'tv'
  year?: number
  languages?: string[] // Language codes like ['EN', 'ES', 'FR']
  season_number?: number
  episode_number?: number
}

/**
 * Search for subtitles using SubDL API
 */
export async function searchSubtitles(params: SubtitleSearchParams): Promise<SubDLSearchResult> {
  try {
    const searchParams = new URLSearchParams({
      api_key: SUBDL_API_KEY,
      subs_per_page: '10'
    })

    // Add search parameters
    if (params.imdb_id) {
      // Try both with and without 'tt' prefix
      const imdbId = params.imdb_id.startsWith('tt') ? params.imdb_id.replace('tt', '') : params.imdb_id
      searchParams.append('imdb_id', imdbId)
    }
    if (params.tmdb_id) {
      searchParams.append('tmdb_id', params.tmdb_id.toString())
    }
    if (params.film_name) {
      searchParams.append('film_name', params.film_name)
    }
    if (params.type) {
      searchParams.append('type', params.type)
    }
    if (params.year) {
      searchParams.append('year', params.year.toString())
    }
    if (params.languages && params.languages.length > 0) {
      searchParams.append('languages', params.languages.join(','))
    }
    if (params.season_number) {
      searchParams.append('season_number', params.season_number.toString())
    }
    if (params.episode_number) {
      searchParams.append('episode_number', params.episode_number.toString())
    }

    const url = `${SUBDL_BASE_URL}/subtitles?${searchParams.toString()}`
    console.log(`🔗 SubDL API call: ${url.replace(SUBDL_API_KEY, 'API_KEY_HIDDEN')}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MoviePine/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`SubDL API error: ${response.status} ${response.statusText}`)
    }

    const data: SubDLSearchResult = await response.json()
    console.log(`📡 SubDL response: ${data.status ? 'Success' : 'Error'}`)
    
    if (!data.status) {
      console.error(`❌ SubDL API error: ${data.error}`)
      return { status: false, results: [], subtitles: [], error: data.error }
    }

    console.log(`✅ SubDL: Found ${data.subtitles?.length || 0} subtitles for search`)
    return data

  } catch (error) {
    console.error('❌ SubDL API error:', error)
    return {
      status: false,
      results: [],
      subtitles: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get subtitle download URL from SubDL
 */
export function getSubtitleDownloadUrl(subtitle: SubDLSubtitle): string {
  // SubDL API returns relative URLs like "/subtitle/3484838-8407859.zip"
  // We need to convert them to full download URLs
  if (subtitle.url.startsWith('/')) {
    return `https://dl.subdl.com${subtitle.url}`
  }

  // If it's already a full URL, return as-is
  return subtitle.url
}

/**
 * Convert language codes to SubDL format
 */
export function convertLanguageCodes(languages: string[]): string[] {
  const languageMap: Record<string, string> = {
    'en': 'EN',
    'es': 'ES', 
    'fr': 'FR',
    'de': 'DE',
    'it': 'IT',
    'pt': 'PT',
    'ru': 'RU',
    'ar': 'AR',
    'hi': 'HI',
    'zh': 'ZH',
    'ja': 'JA',
    'ko': 'KO'
  }

  return languages.map(lang => languageMap[lang.toLowerCase()] || lang.toUpperCase())
}

/**
 * Search subtitles by movie metadata
 */
export async function searchMovieSubtitles(
  movieTitle: string,
  year?: number,
  imdbId?: string,
  tmdbId?: string | number,
  languages: string[] = ['EN']
): Promise<SubDLSubtitle[]> {
  console.log(`🎬 Searching SubDL subtitles for: "${movieTitle}" (${year})`)
  console.log(`📊 Search params: IMDB=${imdbId}, TMDB=${tmdbId}, Languages=[${languages.join(', ')}]`)

  // Try multiple search strategies
  const searchStrategies = [
    // Strategy 1: IMDB ID only with uppercase languages
    ...(imdbId ? [{
      type: 'movie' as const,
      imdb_id: imdbId,
      languages: convertLanguageCodes(languages)
    }] : []),

    // Strategy 2: IMDB ID only with lowercase languages
    ...(imdbId ? [{
      type: 'movie' as const,
      imdb_id: imdbId,
      languages: languages.map(l => l.toLowerCase())
    }] : []),

    // Strategy 3: TMDB ID only
    ...(tmdbId ? [{
      type: 'movie' as const,
      tmdb_id: tmdbId,
      languages: convertLanguageCodes(languages)
    }] : []),

    // Strategy 4: Movie name + year
    {
      type: 'movie' as const,
      film_name: movieTitle,
      year: year,
      languages: convertLanguageCodes(languages)
    },

    // Strategy 5: Movie name only (fallback)
    {
      type: 'movie' as const,
      film_name: movieTitle,
      languages: convertLanguageCodes(languages)
    }
  ]

  // Try each strategy until we find subtitles
  for (let i = 0; i < searchStrategies.length; i++) {
    const strategy = searchStrategies[i]
    console.log(`🔍 SubDL Strategy ${i + 1}: ${JSON.stringify(strategy)}`)

    const result = await searchSubtitles(strategy)

    if (result.status && result.subtitles && result.subtitles.length > 0) {
      console.log(`✅ SubDL Strategy ${i + 1} succeeded: Found ${result.subtitles.length} subtitles`)

      // Sort by rating and download count for best quality
      const sortedSubtitles = result.subtitles.sort((a, b) => {
        const scoreA = (a.rating || 0) * 0.7 + Math.log(a.download_count + 1) * 0.3
        const scoreB = (b.rating || 0) * 0.7 + Math.log(b.download_count + 1) * 0.3
        return scoreB - scoreA
      })

      console.log(`✅ Found ${sortedSubtitles.length} subtitles, returning top results`)
      return sortedSubtitles
    } else {
      console.log(`❌ SubDL Strategy ${i + 1} failed: ${result.error || 'No subtitles found'}`)
    }
  }

  // If all strategies failed
  console.log(`❌ All SubDL search strategies failed for "${movieTitle}"`)
  return []
}

/**
 * Get best subtitle for each language
 */
export function getBestSubtitlePerLanguage(subtitles: SubDLSubtitle[]): Record<string, SubDLSubtitle> {
  const bestPerLanguage: Record<string, SubDLSubtitle> = {}

  for (const subtitle of subtitles) {
    const lang = subtitle.language.toLowerCase()
    
    if (!bestPerLanguage[lang] || 
        subtitle.rating > bestPerLanguage[lang].rating ||
        (subtitle.rating === bestPerLanguage[lang].rating && subtitle.download_count > bestPerLanguage[lang].download_count)) {
      bestPerLanguage[lang] = subtitle
    }
  }

  return bestPerLanguage
}
