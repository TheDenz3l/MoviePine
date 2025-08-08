/**
 * Subtitle Service - Downloads and processes real subtitle files
 * Converts SRT to VTT and creates HTML5 track elements
 */

import { searchMovieSubtitles, getBestSubtitlePerLanguage, getSubtitleDownloadUrl, type SubDLSubtitle } from '../api/subdl'

export interface ProcessedSubtitle {
  language: string
  label: string
  url: string
  vttContent?: string
  isExternal: boolean
}

/**
 * Convert SRT subtitle content to VTT format
 */
export function convertSrtToVtt(srtContent: string): string {
  // Add VTT header
  let vttContent = 'WEBVTT\n\n'
  
  // Replace SRT timestamp format with VTT format
  // SRT: 00:01:30,500 --> 00:01:35,000
  // VTT: 00:01:30.500 --> 00:01:35.000
  const vttBody = srtContent
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // Replace comma with dot in timestamps
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
  
  vttContent += vttBody
  
  return vttContent
}

/**
 * Download subtitle file from URL
 */
export async function downloadSubtitleFile(url: string): Promise<string> {
  try {
    console.log(`📥 Downloading subtitle from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MoviePine/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download subtitle: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('application/zip') || url.includes('.zip')) {
      // Handle ZIP files (SubDL returns ZIP archives)
      console.log(`📦 Subtitle is in ZIP format, extracting...`)
      const arrayBuffer = await response.arrayBuffer()
      
      // For now, we'll need to handle ZIP extraction on the server side
      // Return the ZIP URL for server-side processing
      throw new Error('ZIP subtitle files need server-side processing')
    } else {
      // Direct SRT/VTT file
      const content = await response.text()
      console.log(`✅ Downloaded subtitle content: ${content.length} characters`)
      return content
    }
  } catch (error) {
    console.error(`❌ Failed to download subtitle from ${url}:`, error)
    throw error
  }
}

/**
 * Create a blob URL for subtitle content
 */
export function createSubtitleBlobUrl(vttContent: string): string {
  const blob = new Blob([vttContent], { type: 'text/vtt' })
  return URL.createObjectURL(blob)
}

/**
 * Fetch and process subtitles for a movie
 */
export async function fetchMovieSubtitles(
  movieTitle: string,
  year?: number,
  imdbId?: string,
  tmdbId?: string | number,
  requestedLanguages: string[] = ['en', 'es', 'fr', 'de', 'it']
): Promise<ProcessedSubtitle[]> {
  try {
    // Check if subtitle fetching is disabled
    const disableSubtitles = process.env.NEXT_PUBLIC_DISABLE_SUBTITLES === 'true'
    if (disableSubtitles) {
      console.log(`⚠️ Subtitle fetching is disabled via environment variable`)
      return []
    }

    console.log(`🎬 Fetching real subtitles for: "${movieTitle}" (${year})`)
    console.log(`📋 Requested languages: [${requestedLanguages.join(', ')}]`)

    // Search for subtitles using SubDL API with error handling
    const subtitles = await searchMovieSubtitles(
      movieTitle,
      year,
      imdbId,
      tmdbId,
      requestedLanguages
    )

    if (subtitles.length === 0) {
      console.log(`⚠️ No subtitles found for "${movieTitle}" - continuing without subtitles`)
      return []
    }

    // Get best subtitle for each language
    const bestPerLanguage = getBestSubtitlePerLanguage(subtitles)
    console.log(`📊 Found subtitles for languages: [${Object.keys(bestPerLanguage).join(', ')}]`)

    const processedSubtitles: ProcessedSubtitle[] = []

    // Process each language
    for (const [language, subtitle] of Object.entries(bestPerLanguage)) {
      try {
        const languageLabel = getLanguageLabel(language)
        console.log(`🔄 Processing ${languageLabel} subtitle...`)

        // Get the proper download URL and create proxy URL
        const downloadUrl = getSubtitleDownloadUrl(subtitle)
        const processedSubtitle: ProcessedSubtitle = {
          language: language,
          label: languageLabel,
          url: `/api/subtitle-proxy?url=${encodeURIComponent(downloadUrl)}&lang=${language}`,
          isExternal: true
        }

        processedSubtitles.push(processedSubtitle)
        console.log(`✅ Added ${languageLabel} subtitle`)

      } catch (error) {
        console.error(`❌ Failed to process ${language} subtitle:`, error)
        // Continue with other languages
      }
    }

    console.log(`🎯 Successfully processed ${processedSubtitles.length} subtitle tracks`)
    return processedSubtitles

  } catch (error) {
    console.warn('⚠️ Subtitle fetching failed, continuing without subtitles:', error)
    // Return empty array to allow streaming to continue without subtitles
    return []
  }
}

/**
 * Get human-readable language label
 */
export function getLanguageLabel(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish', 
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'tr': 'Turkish',
    'el': 'Greek',
    'he': 'Hebrew',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'uk': 'Ukrainian',
    'be': 'Belarusian',
    'ka': 'Georgian',
    'am': 'Amharic',
    'sw': 'Swahili',
    'zu': 'Zulu',
    'af': 'Afrikaans',
    'sq': 'Albanian',
    'eu': 'Basque',
    'ca': 'Catalan',
    'gl': 'Galician',
    'is': 'Icelandic',
    'ga': 'Irish',
    'mt': 'Maltese',
    'cy': 'Welsh'
  }

  return languageMap[languageCode.toLowerCase()] || languageCode.toUpperCase()
}

/**
 * Add subtitle track to video element
 */
export function addSubtitleTrackToVideo(
  video: HTMLVideoElement,
  subtitle: ProcessedSubtitle,
  isDefault: boolean = false
): HTMLTrackElement {
  // Remove existing track with same language
  const existingTracks = video.querySelectorAll(`track[srclang="${subtitle.language}"]`)
  existingTracks.forEach(track => track.remove())

  // Create new track element
  const track = document.createElement('track')
  track.kind = 'subtitles'
  track.src = subtitle.url
  track.srclang = subtitle.language
  track.label = subtitle.label
  track.default = isDefault

  // Add to video element
  video.appendChild(track)

  console.log(`📝 Added subtitle track: ${subtitle.label} (${subtitle.language})`)
  return track
}

/**
 * Load all subtitle tracks for a video
 */
export async function loadSubtitlesForVideo(
  video: HTMLVideoElement,
  movieTitle: string,
  year?: number,
  imdbId?: string,
  tmdbId?: string | number,
  requestedLanguages: string[] = ['en', 'es', 'fr', 'de', 'it']
): Promise<ProcessedSubtitle[]> {
  try {
    console.log(`🎬 Loading subtitles for video: "${movieTitle}"`)

    // Fetch subtitle data
    const subtitles = await fetchMovieSubtitles(
      movieTitle,
      year,
      imdbId,
      tmdbId,
      requestedLanguages
    )

    if (subtitles.length === 0) {
      console.log(`❌ No subtitles available for "${movieTitle}"`)
      return []
    }

    // Add tracks to video element
    subtitles.forEach((subtitle, index) => {
      addSubtitleTrackToVideo(video, subtitle, false) // Start with subtitles OFF
    })

    console.log(`✅ Loaded ${subtitles.length} subtitle tracks for "${movieTitle}"`)
    return subtitles

  } catch (error) {
    console.error('❌ Failed to load subtitles for video:', error)
    return []
  }
}
