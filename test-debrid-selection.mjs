#!/usr/bin/env node

// Final analysis: Check what happens when our debrid services process MKV vs MP4 torrents

async function testDebridFileSelection() {
  console.log('🔍 Testing Debrid Service File Selection Logic...\n')
  
  // Simulate what happens with different torrent contents
  const testTorrents = [
    {
      name: 'MKV Torrent Example',
      files: [
        { 
          path: 'Movie.2024.2160p.BluRay.x265.HDR.DTS-HD.MA.5.1.mkv', 
          size: 15000000000,  // 15 GB
          selected: 1 
        },
        { 
          path: 'Sample.mkv', 
          size: 100000000,    // 100 MB
          selected: 0 
        },
        { 
          path: 'RARBG.txt', 
          size: 1000,         // 1 KB
          selected: 0 
        }
      ]
    },
    {
      name: 'MP4 Torrent Example',
      files: [
        { 
          path: 'Movie.2024.1080p.BluRay.H264.AAC.mp4', 
          size: 3000000000,   // 3 GB
          selected: 1 
        },
        { 
          path: 'Sample.mp4', 
          size: 50000000,     // 50 MB
          selected: 0 
        }
      ]
    },
    {
      name: 'Mixed Format Torrent',
      files: [
        { 
          path: 'Movie.2024.2160p.BluRay.x265.mkv', 
          size: 20000000000,  // 20 GB
          selected: 0 
        },
        { 
          path: 'Movie.2024.1080p.BluRay.H264.mp4', 
          size: 4000000000,   // 4 GB  
          selected: 0 
        },
        { 
          path: 'Movie.2024.720p.BluRay.H264.mp4', 
          size: 2000000000,   // 2 GB
          selected: 0 
        }
      ]
    }
  ]
  
  // Simulate our current MP4 prioritization logic
  function getLargestVideoFile(files) {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']
    
    const videoFiles = files.filter(file => {
      const extension = file.path.toLowerCase().split('.').pop()
      return videoExtensions.includes('.' + extension) && file.size > 100000000 // > 100MB
    })
    
    if (videoFiles.length === 0) return null
    
    // Calculate scores with MP4 prioritization
    const scoredFiles = videoFiles.map(file => {
      const extension = file.path.toLowerCase().split('.').pop()
      let score = file.size // Base score is file size
      
      // Format preference (MP4 gets huge bonus)
      if (extension === 'mp4' || extension === 'm4v') {
        score += 100000000000 // 100GB bonus for MP4
      } else if (extension === 'mkv') {
        score += 0 // No bonus for MKV
      } else {
        score -= 10000000000 // 10GB penalty for other formats
      }
      
      return { file, score, extension }
    })
    
    // Sort by score (highest first)
    scoredFiles.sort((a, b) => b.score - a.score)
    
    return {
      selectedFile: scoredFiles[0].file,
      allScores: scoredFiles.map(s => ({
        path: s.file.path,
        size: (s.file.size / 1000000000).toFixed(2) + ' GB',
        extension: s.extension,
        score: s.score,
        reason: s.extension === 'mp4' || s.extension === 'm4v' ? 'MP4 Priority' : 
                s.extension === 'mkv' ? 'Standard' : 'Other Format Penalty'
      }))
    }
  }
  
  console.log('🎬 TESTING DEBRID FILE SELECTION:')
  console.log('=====================================\n')
  
  testTorrents.forEach((torrent, index) => {
    console.log(`Test ${index + 1}: ${torrent.name}`)
    console.log('Available files:')
    torrent.files.forEach(file => {
      console.log(`  📁 ${file.path} (${(file.size / 1000000000).toFixed(2)} GB)`)
    })
    
    const result = getLargestVideoFile(torrent.files)
    
    if (result) {
      console.log('\n🎯 Selection Result:')
      console.log(`   Selected: ${result.selectedFile.path}`)
      console.log(`   Size: ${(result.selectedFile.size / 1000000000).toFixed(2)} GB`)
      
      console.log('\n📊 All File Scores:')
      result.allScores.forEach(score => {
        const selected = score.path === result.selectedFile.path ? ' ✅' : '   '
        console.log(`${selected} ${score.path}`)
        console.log(`     Size: ${score.size}, Format: ${score.extension.toUpperCase()}, Reason: ${score.reason}`)
      })
    } else {
      console.log('❌ No suitable video file found')
    }
    
    console.log('\n' + '='.repeat(50) + '\n')
  })
  
  console.log('🎯 KEY FINDINGS:')
  console.log('=====================================')
  console.log('1. MKV-only torrents: Will select MKV (no choice)')
  console.log('2. MP4-only torrents: Will select MP4 (optimal)')
  console.log('3. Mixed torrents: Will prefer MP4 even if smaller')
  console.log('4. Quality impact: 4GB MP4 chosen over 20GB MKV')
  console.log('')
  console.log('💡 BROWSER COMPATIBILITY IMPACT:')
  console.log('• MP4: Works in ALL browsers natively')
  console.log('• MKV: Requires transcoding or special handling')
  console.log('• User Experience: MP4 = instant play, MKV = potential issues')
  console.log('')
  console.log('✅ CONCLUSION: MP4 prioritization is ESSENTIAL for browser compatibility!')
}

testDebridFileSelection().catch(console.error)
