#!/usr/bin/env node

// Test script to verify MP4 prioritization logic

// Create test streaming sources with different formats
const testSources = [
  {
    name: 'Movie.2023.1080p.x264.mkv - High seeders MKV',
    quality: '1080p',
    size: '8.5 GB',
    format: 'MKV',
    seeders: 500,
    infoHash: 'abcd1234567890abcdef1234567890abcdef1234',
    isReady: true,
    subtitles: []
  },
  {
    name: 'Movie.2023.1080p.x264.mp4 - Lower seeders but MP4',
    quality: '1080p', 
    size: '7.2 GB',
    format: 'MP4',
    seeders: 150,
    infoHash: 'efgh5678901234abcdef5678901234abcdef5678',
    isReady: true,
    subtitles: []
  },
  {
    name: 'Movie.2023.720p.x264.mp4 - Lower quality MP4',
    quality: '720p',
    size: '4.1 GB', 
    format: 'MP4',
    seeders: 300,
    infoHash: 'ijkl9012345678abcdef9012345678abcdef9012',
    isReady: true,
    subtitles: []
  },
  {
    name: 'Movie.2023.2160p.x265.mkv - 4K MKV highest quality',
    quality: '4K',
    size: '15.8 GB',
    format: 'MKV', 
    seeders: 80,
    infoHash: 'mnop3456789012abcdef3456789012abcdef3456',
    isReady: true,
    subtitles: []
  }
]

// Test the sorting logic
console.log('🧪 Testing MP4 Prioritization Logic...\n')

function testSortSourcesByPriority(sources, preferredQuality) {
  const scored = sources.map(s => {
    let composite = 0
    
    // PRIORITY 1: MP4 format detection (highest priority)
    const mp4Score = getFormatCompatibilityScore(s.name, s.format)
    composite += mp4Score * 1000 // MP4 gets massive priority
    
    // PRIORITY 2: Quality scoring
    const qualityScore = getQualityScore(s.quality)
    composite += qualityScore * 100
    
    // PRIORITY 3: Peer/seeder count (availability)
    const seedBoost = Math.min((s.seeders || 0) / 50, 200) // More aggressive seeder weighting
    composite += seedBoost
    
    // PRIORITY 4: Codec compatibility
    const codecScore = computeCodecCompatibilityScore(s.name)
    composite += codecScore * 10
    
    // PRIORITY 5: Audio compatibility (simplified for test)
    const audioScore = 5 // Default
    composite += audioScore * 5
    
    // PRIORITY 6: Readiness bonus
    const readiness = s.isReady ? 50 : 0
    composite += readiness
    
    // PRIORITY 7: User preferred quality bonus
    const preferred = preferredQuality && s.quality.toLowerCase().includes(preferredQuality.toLowerCase()) ? 100 : 0
    composite += preferred
    
    return { s, composite, mp4Score, qualityScore, seeders: s.seeders || 0 }
  }).sort((a, b) => b.composite - a.composite)
  
  return scored
}

function getFormatCompatibilityScore(streamName, format) {
  // Use format field if available (more reliable than parsing name)
  if (format) {
    if (format.toLowerCase() === 'mp4') return 100
    if (format.toLowerCase() === 'webm') return 60
    if (format.toLowerCase() === 'mkv') return 40
    if (format.toLowerCase() === 'avi') return 30
    return 20
  }
  
  // Fallback to name parsing
  const name = streamName.toLowerCase()
  
  if (name.includes('.mp4') || name.includes('mp4')) {
    return 100
  }
  
  if (name.includes('.webm') || name.includes('webm')) return 60
  if (name.includes('.mkv') || name.includes('mkv')) return 40
  if (name.includes('.avi') || name.includes('avi')) return 30
  
  return 20
}

function getQualityScore(quality) {
  const q = quality.toLowerCase()
  if (q.includes('4k') || q.includes('2160p')) return 5
  if (q.includes('1080p')) return 4
  if (q.includes('720p')) return 3
  if (q.includes('480p')) return 2
  return 1
}

function computeCodecCompatibilityScore(name) {
  const n = name.toLowerCase()
  let base = 5
  if (/(hevc|x265|h\.265)/.test(n)) base = 9
  else if (/(h\.264|x264|avc)/.test(n)) base = 10
  else if (/vp9/.test(n)) base = 6
  else if (/(av1)/.test(n)) base = 5
  return base
}

// Run the test
const sortedSources = testSortSourcesByPriority(testSources)

console.log('🎯 [MP4 PRIORITY] Test Results - Sources sorted by MP4 → Quality → Peers:\n')
sortedSources.forEach((d, i) => {
  const isMP4 = d.mp4Score > 50 ? '🎯 MP4' : '📁 Other'
  console.log(`${i + 1}. ${isMP4} | Q=${d.s.quality} | P=${d.seeders} | Score=${d.composite.toFixed(1)}`)
  console.log(`   📁 ${d.s.name}`)
  console.log(`   📊 Format Score: ${d.mp4Score * 1000}, Quality Score: ${d.qualityScore * 100}, Seeders: ${Math.min((d.seeders || 0) / 50, 200).toFixed(1)}\n`)
})

console.log('✅ Test completed! Check results above to verify MP4 prioritization.')
console.log('\n📋 Expected priority order:')
console.log('1. 1080p MP4 (150 seeders) - Should win due to MP4 format priority')
console.log('2. 720p MP4 (300 seeders) - Second MP4 option') 
console.log('3. 4K MKV (80 seeders) - Highest quality but not MP4')
console.log('4. 1080p MKV (500 seeders) - Good quality/seeders but not MP4')

console.log('\n🧮 Scoring breakdown:')
console.log('• MP4 format: 100,000 points (massive priority)')
console.log('• 4K quality: 500 points')
console.log('• 1080p quality: 400 points') 
console.log('• 720p quality: 300 points')
console.log('• Seeders: up to 200 points')
console.log('• Codec/Audio/Readiness: smaller bonuses')
