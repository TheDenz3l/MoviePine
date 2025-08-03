import { NextApiRequest, NextApiResponse } from 'next'
import { searchMovieSubtitles } from '../../lib/api/subdl'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, year, imdbId, tmdbId, languages = ['EN'] } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Movie title is required' })
    }

    console.log(`🧪 SubDL Test API: Searching for "${title}" (${year})`)
    console.log(`📊 Parameters: IMDB=${imdbId}, TMDB=${tmdbId}, Languages=[${languages.join(', ')}]`)

    const subtitles = await searchMovieSubtitles(
      title,
      year,
      imdbId,
      tmdbId,
      languages
    )

    console.log(`✅ SubDL Test API: Found ${subtitles.length} subtitles`)

    return res.status(200).json({
      success: true,
      movie: { title, year, imdbId, tmdbId },
      subtitles: subtitles.map(sub => ({
        id: sub.sd_id,
        language: sub.language,
        name: sub.release_name,
        author: sub.author,
        rating: sub.rating,
        downloads: sub.download_count,
        url: sub.url
      })),
      count: subtitles.length
    })

  } catch (error) {
    console.error('❌ SubDL Test API Error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    })
  }
}
