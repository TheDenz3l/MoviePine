// Debug script for Continue Watching functionality
// Run this in browser console to test the complete flow

console.log('🔍 Debugging Continue Watching functionality...')

// Step 1: Check if user is authenticated
async function checkAuth() {
  try {
    const response = await fetch('/api/continue-watching', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || 'test'}`,
      },
    })
    
    console.log('Auth Status:', response.status)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ User authenticated, current continue watching items:', data.items?.length || 0)
      return data.items || []
    } else {
      console.log('❌ Authentication failed:', response.status)
      return []
    }
  } catch (error) {
    console.log('❌ Auth check failed:', error)
    return []
  }
}

// Step 2: Simulate progress save
async function simulateProgressSave(contentId = 'test-movie-123') {
  try {
    const progressData = {
      contentId: contentId,
      currentTime: 1800, // 30 minutes
      duration: 7200,    // 2 hours
      streamUrl: 'https://example.com/stream.mp4',
      subtitles: []
    }

    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || 'test'}`,
      },
      body: JSON.stringify(progressData)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Progress saved successfully:', result)
      return true
    } else {
      console.log('❌ Progress save failed:', response.status, await response.text())
      return false
    }
  } catch (error) {
    console.log('❌ Progress save error:', error)
    return false
  }
}

// Step 3: Check if progress appears in continue watching
async function checkContinueWatching() {
  try {
    const response = await fetch('/api/continue-watching', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || 'test'}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('📊 Continue Watching Items:', data.items)
      return data.items || []
    } else {
      console.log('❌ Failed to fetch continue watching:', response.status)
      return []
    }
  } catch (error) {
    console.log('❌ Continue watching fetch error:', error)
    return []
  }
}

// Step 4: Check component presence
function checkComponent() {
  const component = document.querySelector('[data-testid="continue-watching"]') || 
                   document.querySelector('h2:contains("Continue Watching")') ||
                   Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Continue Watching'))
  
  if (component) {
    console.log('✅ Continue Watching component found on page')
    return true
  } else {
    console.log('❌ Continue Watching component not found on page')
    return false
  }
}

// Step 5: Check database schema
async function checkDatabaseSchema() {
  try {
    // This will fail if the migration hasn't been applied
    const response = await fetch('/api/progress?id=test-schema-check', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || 'test'}`,
      },
    })

    if (response.ok) {
      console.log('✅ Database schema appears to be working')
      return true
    } else {
      console.log('⚠️ Database schema check failed:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Database schema error:', error)
    return false
  }
}

// Main debug function
async function runCompleteDebug() {
  console.log('🚀 Starting complete Continue Watching debug...')
  
  // Check auth first
  const initialItems = await checkAuth()
  console.log(`Initial items count: ${initialItems.length}`)
  
  // Check database schema
  const schemaOk = await checkDatabaseSchema()
  
  // Check component presence
  const componentExists = checkComponent()
  
  // Simulate saving progress
  console.log('🎬 Simulating video progress save...')
  const progressSaved = await simulateProgressSave()
  
  // Wait a moment for database to process
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Check if progress now appears
  const finalItems = await checkContinueWatching()
  
  console.log('\n📋 DEBUG SUMMARY:')
  console.log('- Database Schema:', schemaOk ? '✅' : '❌')
  console.log('- Component Present:', componentExists ? '✅' : '❌')
  console.log('- Progress Save:', progressSaved ? '✅' : '❌')
  console.log('- Initial Items:', initialItems.length)
  console.log('- Final Items:', finalItems.length)
  console.log('- New Item Added:', finalItems.length > initialItems.length ? '✅' : '❌')
  
  if (finalItems.length > 0) {
    console.log('\n📺 Continue Watching Items:')
    finalItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title || item.content_id} - ${Math.round(item.progress * 100)}% complete`)
    })
  }
  
  return {
    schemaOk,
    componentExists,
    progressSaved,
    initialCount: initialItems.length,
    finalCount: finalItems.length,
    working: progressSaved && finalItems.length > initialItems.length
  }
}

// Auto-run debug
runCompleteDebug().then(result => {
  if (result.working) {
    console.log('\n🎉 Continue Watching appears to be working correctly!')
  } else {
    console.log('\n⚠️ Continue Watching has issues. Check the summary above.')
  }
})

// Export for manual use
window.debugContinueWatching = {
  runCompleteDebug,
  checkAuth,
  simulateProgressSave,
  checkContinueWatching,
  checkComponent,
  checkDatabaseSchema
}

console.log('💡 You can also run individual checks using window.debugContinueWatching.*')
