// Test script to verify the live TV video player fix
// This script simulates clicking "Watch Live" and checks if the video player opens

const testLiveTVVideoPlayer = () => {
  console.log('🧪 Testing Live TV Video Player Fix...')
  
  // Wait for the page to load
  setTimeout(() => {
    // Check if we're on the live TV page
    if (!window.location.href.includes('category=live-tv')) {
      console.log('❌ Not on live TV page, redirecting...')
      window.location.href = '/?category=live-tv'
      return
    }
    
    console.log('✅ On live TV page, looking for watch buttons...')
    
    // Wait a bit more for the page to fully load
    setTimeout(() => {
      // Look for "Watch Live" buttons
      const watchButtons = Array.from(document.querySelectorAll('button'))
        .filter(btn => btn.textContent && btn.textContent.toLowerCase().includes('watch'))
      
      console.log(`📺 Found ${watchButtons.length} watch buttons`)
      
      if (watchButtons.length === 0) {
        console.log('❌ No watch buttons found. Make sure networks are loaded.')
        return
      }
      
      // Try to click the first watch button
      const firstWatchButton = watchButtons[0]
      console.log('🖱️ Clicking first watch button:', firstWatchButton.textContent)
      
      // Set up observers to monitor state changes
      let stateChangeCount = 0
      const originalLog = console.log
      console.log = (...args) => {
        originalLog(...args)
        if (args[0] && args[0].includes('[DEBUG STATE] isVideoPlayerOpen changed to:')) {
          stateChangeCount++
          if (args[0].includes('true')) {
            console.log('✅ Video player state changed to TRUE - Fix working!')
          } else if (args[0].includes('false') && stateChangeCount > 1) {
            console.log('❌ Video player state forced back to FALSE - Issue still exists!')
          }
        }
      }
      
      // Click the button
      firstWatchButton.click()
      
      // Check after a delay if video player modal is visible
      setTimeout(() => {
        const videoModal = document.querySelector('[role="dialog"]') || 
                          document.querySelector('.video-player-modal') ||
                          document.querySelector('[data-testid="video-player-modal"]')
        
        if (videoModal) {
          console.log('✅ SUCCESS: Video player modal is visible!')
          console.log('🎬 Modal element:', videoModal)
        } else {
          console.log('❌ FAILURE: Video player modal not found')
          console.log('🔍 Checking for any dialogs...')
          const allDialogs = document.querySelectorAll('[role="dialog"]')
          console.log('Found dialogs:', allDialogs.length, allDialogs)
        }
        
        // Restore original console.log
        console.log = originalLog
      }, 2000)
      
    }, 3000)
  }, 1000)
}

// Auto-run the test
testLiveTVVideoPlayer()
