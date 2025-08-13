#!/usr/bin/env node

// Enhanced analysis to check Torrentio stream formats with better detection
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

function enhancedFormatDetection(title, infoHash, behaviorHints) {
  if (!title) return 'Unknown'
  
  const titleLower = title.toLowerCase()
  
  // Enhanced format detection with more patterns
  const formatPatterns = [
    // MP4 patterns
    { formats: ['MP4'], patterns: [/\.mp4$/i, /\.mp4\s/i, /mp4/i, /\.m4v$/i] },
    
    // MKV patterns  
    { formats: ['MKV'], patterns: [/\.mkv$/i, /\.mkv\s/i, /mkv/i] },
    
    // AVI patterns
    { formats: ['AVI'], patterns: [/\.avi$/i, /\.avi\s/i, /avi/i] },
    
    // WebM patterns
    { formats: ['WebM'], patterns: [/\.webm$/i, /\.webm\s/i, /webm/i] },
    
    // Other patterns
    { formats: ['MOV'], patterns: [/\.mov$/i, /\.mov\s/i] },
    { formats: ['WMV'], patterns: [/\.wmv$/i, /\.wmv\s/i] },
    { formats: ['FLV'], patterns: [/\.flv$/i, /\.flv\s/i] }
  ]
  
  // Check explicit format patterns
  for (const { formats, patterns } of formatPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return formats[0]
      }
    }
  }
  
  // Check behavior hints for filename
  if (behaviorHints && behaviorHints.filename) {
    const filename = behaviorHints.filename.toLowerCase()
    for (const { formats, patterns } of formatPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(filename)) {
          return formats[0]
        }
      }
    }
  }
  
  // Infer from common naming patterns
  if (/x264|x265|h\.264|h\.265|hevc|avc/i.test(title)) {
    // These codecs are commonly in MP4 or MKV
    // Look for other clues
    if (/web-?dl|webrip|brrip|bluray/i.test(title)) {
      return 'Likely MP4/MKV' // Could be either, but often MP4 for web content
    }
    return 'Video (format unclear)'
  }
  
  return 'Unknown'
}

// Test with a smaller set first
const testMovies = [
  { id: 'tt0111161', name: 'The Shawshank Redemption' },
  { id: 'tt0468569', name: 'The Dark Knight' },
  { id: 'tt0816692', name: 'Interstellar' }
]

async function detailedFormatAnalysis() {
  console.log('🔍 Enhanced Torrentio Format Analysis...\n')
  
  const allStreams = []
  
  for (const movie of testMovies) {
    console.log(`🎬 Analyzing: ${movie.name} (${movie.id})`)
    
    const streams = await fetchTorrentioStreams(movie.id)
    console.log(`   Found ${streams.length} streams`)
    
    for (const stream of streams.slice(0, 15)) { // Check up to 15 per movie
      const format = enhancedFormatDetection(
        stream.title || stream.name || '', 
        stream.infoHash,
        stream.behaviorHints
      )
      
      allStreams.push({
        movie: movie.name,
        title: (stream.title || stream.name || 'Unknown Title').substring(0, 100),
        format: format,
        infoHash: stream.infoHash,
        filename: stream.behaviorHints?.filename || 'N/A'
      })
    }
    
    // Add delay
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n📋 DETAILED STREAM ANALYSIS:')
  console.log('=====================================')
  
  // Count formats
  const formatCounts = {}
  allStreams.forEach(stream => {
    formatCounts[stream.format] = (formatCounts[stream.format] || 0) + 1
  })
  
  console.log('\nFormat Distribution:')
  Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).forEach(([format, count]) => {
    const percentage = ((count / allStreams.length) * 100).toFixed(1)
    console.log(`${format}: ${count} streams (${percentage}%)`)
  })
  
  console.log('\n📄 SAMPLE STREAMS BY FORMAT:')
  console.log('=====================================')
  
  // Group by format and show examples
  const byFormat = {}
  allStreams.forEach(stream => {
    if (!byFormat[stream.format]) byFormat[stream.format] = []
    byFormat[stream.format].push(stream)
  })
  
  Object.entries(byFormat).forEach(([format, streams]) => {
    console.log(`\n${format} (${streams.length} streams):`)
    streams.slice(0, 3).forEach((stream, i) => {
      console.log(`  ${i+1}. ${stream.title}`)
      if (stream.filename !== 'N/A') {
        console.log(`     Filename: ${stream.filename}`)
      }
      console.log(`     Movie: ${stream.movie}`)
    })
  })
  
  console.log('\n🎯 ANALYSIS CONCLUSION:')
  console.log('=====================================')
  
  const unknownPercentage = ((formatCounts['Unknown'] || 0) / allStreams.length) * 100
  const mp4Percentage = ((formatCounts['MP4'] || 0) / allStreams.length) * 100
  const mkvPercentage = ((formatCounts['MKV'] || 0) / allStreams.length) * 100
  
  if (unknownPercentage > 70) {
    console.log('❌ CRITICAL: Most streams have unknown format!')
    console.log('   This means Torrentio stream names don\'t clearly indicate video container format.')
    console.log('   The actual format is likely determined at the torrent file level.')
  } else if (mkvPercentage > 50) {
    console.log('⚠️ WARNING: Majority of streams are MKV format')
    console.log('   This could cause browser compatibility issues')
  } else if (mp4Percentage > 50) {
    console.log('✅ GOOD: Majority of streams are MP4 format')
  }
  
  console.log('\n💡 RECOMMENDATIONS:')
  if (unknownPercentage > 50) {
    console.log('• Stream format detection needs improvement')
    console.log('• Consider checking actual torrent file contents')
    console.log('• MP4 prioritization becomes even more important for final file selection')
  }
}

// Run the enhanced analysis
detailedFormatAnalysis().catch(console.error)
