// Debug Safari detection and MP4 prioritization
console.log('🔍 Testing Safari detection and stream filtering...')

// Test 1: Check if we're in Safari
const isSafari = typeof navigator !== 'undefined' && /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent)
console.log(`🍎 Safari detected: ${isSafari}`)
console.log(`🍎 User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`)

// Test 2: Simulate stream filtering
const testStreams = [
  { name: 'Movie.2025.1080p.WEB-DL.H264.mp4', quality: '1080p' },
  { name: 'Movie.2025.1080p.WEB-DL.x264.mkv', quality: '1080p' },
  { name: 'Movie.2025.720p.WEB-DL.H264.mp4', quality: '720p' },
  { name: 'Movie.2025.4K.WEB-DL.HEVC.mkv', quality: '4K' }
]

console.log(`\n📊 Testing filter logic on ${testStreams.length} sample streams:`)

const filterSafariSources = (list) => {
  return list.filter(s => {
    const n = s.name.toLowerCase()
    
    // Safari compatibility checks
    const isMkv = /\.mkv\b|\bmkv\b/.test(n)
    const isAvi = /\.avi\b|\bavi\b/.test(n)
    const isWebm = /\.webm\b|\bwebm\b/.test(n)
    const hasUnsupportedCodec = /(av1|vp9|vvc)/.test(n)
    const hasUnsupportedAudio = /(dts|dts-hd|dts-ma|truehd|flac)/.test(n)
    
    const isCompatible = !isMkv && !isAvi && !isWebm && !hasUnsupportedCodec && !hasUnsupportedAudio
    
    console.log(`  ${isCompatible ? '✅' : '❌'} ${s.name} (${isCompatible ? 'KEEP' : 'DROP'})`)
    if (!isCompatible) {
      if (isMkv) console.log(`      Reason: MKV container`)
      if (isAvi) console.log(`      Reason: AVI container`)
      if (isWebm) console.log(`      Reason: WebM container`)
      if (hasUnsupportedCodec) console.log(`      Reason: Unsupported codec`)
      if (hasUnsupportedAudio) console.log(`      Reason: Unsupported audio`)
    }
    
    return isCompatible
  })
}

const safariFiltered = filterSafariSources(testStreams)
console.log(`\n🍎 Safari filtering result: ${safariFiltered.length}/${testStreams.length} streams kept`)
safariFiltered.forEach(s => console.log(`  ✅ ${s.name}`))

// Test 3: Check if there are any issues with the current implementation
console.log(`\n🔧 Debug suggestions:`)
if (!isSafari) {
  console.log(`  • Safari not detected - test with actual Safari browser`)
} else {
  console.log(`  • Safari detected correctly`)
}

if (safariFiltered.length === 0) {
  console.log(`  • No streams would pass Safari filtering - check if MP4 streams are available`)
} else {
  console.log(`  • ${safariFiltered.length} streams would pass Safari filtering`)
}
