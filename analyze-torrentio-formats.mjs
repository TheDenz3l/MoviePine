#!/usr/bin/env node

// Comprehensive test to check Torrentio stream formats
// Using manual fetch since we can't import the TypeScript module directly

// Test with popular movie IDs that should have many streams
const testMovies = [
  { id: 'tt0111161', name: 'The Shawshank Redemption' },
  { id: 'tt0068646', name: 'The Godfather' }, 
  { id: 'tt0468569', name: 'The Dark Knight' },
  { id: 'tt0109830', name: 'Forrest Gump' },
  { id: 'tt0137523', name: 'Fight Club' },
  { id: 'tt0120737', name: 'The Lord of the Rings' },
  { id: 'tt0816692', name: 'Interstellar' },
  { id: 'tt1375666', name: 'Inception' },
  { id: 'tt0167260', name: 'The Lord of the Rings: The Return of the King' },
  { id: 'tt0110912', name: 'Pulp Fiction' }
]

// Create Torrentio API test functions
async function fetchTorrentioStreams(movieId) {
  const baseUrl = 'https://torrentio.strem.fun'
  const providers = 'rarbg|1337x|thepiratebay|kickass|torrentgalaxy'
  const config = `providers=${providers}|sort=qualitysize`
  
  const url = `${baseUrl}/${config}/stream/movie/${movieId}.json`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    return data.streams || []
  } catch (error) {
    console.log(`   ❌ Error fetching ${movieId}: ${error.message}`)
    return []
  }
}

function parseStreamQuality(title) {
  if (!title) {
    return { quality: 'Unknown', size: 'Unknown', seeders: 0, format: 'Unknown' }
  }

  // Extract format information first (highest priority)
  let format = 'Unknown'
  const titleLower = title.toLowerCase()
  
  // Format detection patterns (MP4 gets priority)
  if (titleLower.includes('.mp4') || titleLower.includes('mp4') || 
      titleLower.includes('h264.mp4') || titleLower.includes('x264.mp4') ||
      titleLower.includes('hevc.mp4') || titleLower.includes('x265.mp4')) {
    format = 'MP4'
  } else if (titleLower.includes('.webm') || titleLower.includes('webm')) {
    format = 'WebM'
  } else if (titleLower.includes('.mkv') || titleLower.includes('mkv')) {
    format = 'MKV'
  } else if (titleLower.includes('.avi') || titleLower.includes('avi')) {
    format = 'AVI'
  }

  // Extract quality information
  let quality = 'Unknown'
  const qualityPatterns = [
    { pattern: /2160p|4k|uhd/i, quality: '4K' },
    { pattern: /1080p/i, quality: '1080p' },
    { pattern: /720p/i, quality: '720p' },
    { pattern: /480p/i, quality: '480p' },
    { pattern: /360p/i, quality: '360p' },
  ]

  for (const { pattern, quality: q } of qualityPatterns) {
    if (pattern.test(title)) {
      quality = q
      break
    }
  }

  // Extract file size
  let size = 'Unknown'
  const sizeMatch = title.match(/(\d+(?:\.\d+)?)\s*(gb|mb|tb)/i)
  if (sizeMatch) {
    size = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`
  }

  // Extract seeders (if available in title)
  let seeders = 0
  const seedersMatch = title.match(/(\d+)\s*seeders?/i)
  if (seedersMatch) {
    seeders = parseInt(seedersMatch[1], 10)
  }

  // Also try to extract seeders from 👤 emoji pattern
  const emojiSeedersMatch = title.match(/👤\s*(\d+)/)
  if (emojiSeedersMatch) {
    seeders = Math.max(seeders, parseInt(emojiSeedersMatch[1], 10))
  }

  return { quality, size, seeders, format }
}

async function analyzeStreamFormats() {
  console.log('🔍 Analyzing Torrentio stream formats across popular movies...\n')
  
  const formatStats = {
    total: 0,
    mp4: 0,
    mkv: 0, 
    avi: 0,
    webm: 0,
    unknown: 0,
    other: 0
  }
  
  const sampleStreams = []
  
  for (const movie of testMovies) {
    console.log(`🎬 Testing: ${movie.name} (${movie.id})`)
    
    try {
      const streams = await fetchTorrentioStreams(movie.id)
      console.log(`   Found ${streams.length} streams`)
      
      if (streams.length === 0) {
        console.log('   ⚠️ No streams found')
        continue
      }
      
      // Analyze first 10 streams from this movie
      const streamsToAnalyze = streams.slice(0, 10)
      
      for (const stream of streamsToAnalyze) {
        formatStats.total++
        
        const parsed = parseStreamQuality(stream.title || stream.name || '')
        const format = parsed.format || 'Unknown'
        
        // Store sample for detailed analysis
        if (sampleStreams.length < 50) {
          sampleStreams.push({
            movie: movie.name,
            title: stream.title || stream.name || 'Unknown Title',
            format: format,
            quality: parsed.quality,
            size: parsed.size
          })
        }
        
        // Count formats
        const formatLower = format.toLowerCase()
        if (formatLower === 'mp4') {
          formatStats.mp4++
        } else if (formatLower === 'mkv') {
          formatStats.mkv++
        } else if (formatLower === 'avi') {
          formatStats.avi++
        } else if (formatLower === 'webm') {
          formatStats.webm++
        } else if (formatLower === 'unknown') {
          formatStats.unknown++
        } else {
          formatStats.other++
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n📊 FORMAT ANALYSIS RESULTS:')
  console.log('=====================================')
  console.log(`Total streams analyzed: ${formatStats.total}`)
  console.log(`MP4 streams: ${formatStats.mp4} (${((formatStats.mp4/formatStats.total)*100).toFixed(1)}%)`)
  console.log(`MKV streams: ${formatStats.mkv} (${((formatStats.mkv/formatStats.total)*100).toFixed(1)}%)`)
  console.log(`AVI streams: ${formatStats.avi} (${((formatStats.avi/formatStats.total)*100).toFixed(1)}%)`)
  console.log(`WebM streams: ${formatStats.webm} (${((formatStats.webm/formatStats.total)*100).toFixed(1)}%)`)
  console.log(`Unknown format: ${formatStats.unknown} (${((formatStats.unknown/formatStats.total)*100).toFixed(1)}%)`)
  console.log(`Other formats: ${formatStats.other} (${((formatStats.other/formatStats.total)*100).toFixed(1)}%)`)
  
  console.log('\n📋 SAMPLE STREAM ANALYSIS:')
  console.log('=====================================')
  
  // Group samples by format
  const formatGroups = {}
  sampleStreams.forEach(stream => {
    if (!formatGroups[stream.format]) {
      formatGroups[stream.format] = []
    }
    formatGroups[stream.format].push(stream)
  })
  
  for (const [format, streams] of Object.entries(formatGroups)) {
    console.log(`\n${format} FORMAT EXAMPLES:`)
    streams.slice(0, 3).forEach((stream, i) => {
      console.log(`  ${i+1}. ${stream.title.substring(0, 80)}...`)
      console.log(`     Movie: ${stream.movie} | Quality: ${stream.quality} | Size: ${stream.size}`)
    })
  }
  
  console.log('\n🎯 CONCLUSION:')
  console.log('=====================================')
  if (formatStats.mkv > formatStats.total * 0.8) {
    console.log('❌ PROBLEM: Most streams are MKV format (poor browser compatibility)')
  } else if (formatStats.mp4 > formatStats.total * 0.5) {
    console.log('✅ GOOD: Majority of streams are MP4 format (good browser compatibility)')
  } else if (formatStats.unknown > formatStats.total * 0.5) {
    console.log('⚠️ UNCLEAR: Many streams have unknown format - need better detection')
  } else {
    console.log('📊 MIXED: Streams have varied formats - MP4 prioritization is important')
  }
  
  return formatStats
}

// Run the analysis
analyzeStreamFormats().catch(console.error)
