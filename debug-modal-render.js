// Debug script to check modal rendering on Live TV page
console.log('🔍 Starting modal render debug...')

// Function to wait for element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    function check() {
      const element = document.querySelector(selector)
      if (element) {
        resolve(element)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`))
      } else {
        setTimeout(check, 100)
      }
    }
    
    check()
  })
}

// Wait for page to load
setTimeout(async () => {
  try {
    // First load Live TV page
    if (!window.location.href.includes('live-tv')) {
      console.log('🔄 Navigating to Live TV page...')
      window.location.href = '/?category=live-tv'
      return
    }

    console.log('📺 On Live TV page, waiting for networks...')
    
    // Wait for network cards to load
    const networkCards = await waitForElement('.grid .bg-gray-800')
    console.log(`✅ Found ${document.querySelectorAll('.grid .bg-gray-800').length} network cards`)
    
    // Click first network
    const firstNetwork = document.querySelector('.grid .bg-gray-800')
    if (firstNetwork) {
      console.log('🖱️ Clicking first network...')
      firstNetwork.click()
      
      // Wait for streams to load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Find Watch Live button
      const watchButton = document.querySelector('button:contains("Watch Live")') || 
                         document.querySelector('button[class*="green"]') ||
                         document.querySelector('.flex.space-x-2 button:first-child')
      
      if (watchButton) {
        console.log('🎬 Found Watch Live button, analyzing before click...')
        
        // Check initial state
        console.log('📊 PRE-CLICK Analysis:')
        console.log('- Dialogs:', document.querySelectorAll('[role="dialog"]').length)
        console.log('- Modals:', document.querySelectorAll('[data-state="open"]').length)
        console.log('- Z-index elements:', document.querySelectorAll('[style*="z-index"]').length)
        
        // Click and monitor for changes
        console.log('🖱️ Clicking Watch Live button...')
        watchButton.click()
        
        // Monitor for changes over time
        for (let i = 1; i <= 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const dialogs = document.querySelectorAll('[role="dialog"]')
          const modals = document.querySelectorAll('[data-state="open"]')
          const videoPlayers = document.querySelectorAll('video')
          const zIndexElements = document.querySelectorAll('[style*="z-index"]')
          
          console.log(`📊 Check ${i}:`, {
            dialogs: dialogs.length,
            modals: modals.length,
            videos: videoPlayers.length,
            zIndexElements: zIndexElements.length,
            timestamp: Date.now()
          })
          
          if (dialogs.length > 0) {
            console.log('🎉 MODAL FOUND! Details:')
            dialogs.forEach((dialog, idx) => {
              console.log(`  Dialog ${idx}:`, {
                visible: dialog.offsetParent !== null,
                display: window.getComputedStyle(dialog).display,
                zIndex: window.getComputedStyle(dialog).zIndex,
                opacity: window.getComputedStyle(dialog).opacity,
                transform: window.getComputedStyle(dialog).transform
              })
            })
            break
          }
        }
        
        // Final analysis
        console.log('🔍 FINAL Analysis:')
        console.log('- Total dialogs:', document.querySelectorAll('[role="dialog"]').length)
        console.log('- Radix dialogs:', document.querySelectorAll('[data-radix-collection-item]').length)
        console.log('- Portal containers:', document.querySelectorAll('[data-radix-portal]').length)
        console.log('- React components with "dialog":', document.querySelectorAll('[class*="dialog"]').length)
        
        // Check if React components exist in DOM
        const reactComponents = document.querySelectorAll('[data-reactroot], [data-reactid]')
        console.log('- React components:', reactComponents.length)
        
      } else {
        console.log('❌ No Watch Live button found')
      }
    } else {
      console.log('❌ No network cards found')
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}, 2000)
