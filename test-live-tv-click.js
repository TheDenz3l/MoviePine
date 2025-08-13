// Test script to simulate Live TV "Watch Live" button click
// Run this in the browser console when on the Live TV page

console.log('🧪 Starting Live TV click test...');

// Wait for the page to load
setTimeout(() => {
  console.log('🔍 Looking for Live TV networks...');
  
  // Find all network cards
  const networkCards = document.querySelectorAll('[class*="cursor-pointer"]');
  console.log(`Found ${networkCards.length} network cards`);
  
  if (networkCards.length > 0) {
    console.log('🖱️ Clicking first network...');
    networkCards[0].click();
    
    // Wait for streams to load
    setTimeout(() => {
      console.log('🔍 Looking for Watch Live buttons...');
      const watchLiveButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent?.includes('Watch Live')
      );
      
      console.log(`Found ${watchLiveButtons.length} Watch Live buttons`);
      
      if (watchLiveButtons.length > 0) {
        console.log('🖱️ Clicking first Watch Live button...');
        console.log('📺 Button text:', watchLiveButtons[0].textContent);
        
        // Add event listeners to track what happens
        const originalConsoleLog = console.log;
        window.testLogs = [];
        console.log = function(...args) {
          window.testLogs.push(args.join(' '));
          originalConsoleLog.apply(console, args);
        };
        
        watchLiveButtons[0].click();
        
        // Check what happened after click
        setTimeout(() => {
          console.log('🔍 Checking for video player modal...');
          const videoModal = document.querySelector('[role="dialog"]');
          console.log('Video modal found:', !!videoModal);
          
          // Check for video element
          const videoElement = document.querySelector('video');
          console.log('Video element found:', !!videoElement);
          
          if (videoElement) {
            console.log('Video src:', videoElement.src);
            console.log('Video currentSrc:', videoElement.currentSrc);
          }
          
          // Show collected logs
          console.log('🔬 Test logs collected:', window.testLogs);
          
        }, 2000);
      } else {
        console.log('❌ No Watch Live buttons found');
      }
    }, 3000);
  } else {
    console.log('❌ No network cards found');
  }
}, 1000);
