// Simple test to check Live TV clicking behavior
// Run this in browser console on Live TV page

console.log('🧪 Starting Live TV click debug test...');

// Wait for networks to load
setTimeout(() => {
  console.log('🔍 Looking for network cards...');
  
  // Find network cards first
  const networkCards = document.querySelectorAll('[class*="cursor-pointer"], .cursor-pointer');
  console.log(`Found ${networkCards.length} network cards`);
  
  if (networkCards.length > 0) {
    console.log('🖱️ Clicking first network card...');
    networkCards[0].click();
    
    // Wait for streams to load
    setTimeout(() => {
      console.log('🔍 Looking for Watch Live buttons...');
      const watchLiveButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent && btn.textContent.includes('Watch Live')
      );
      
      console.log(`Found ${watchLiveButtons.length} Watch Live buttons`);
      
      if (watchLiveButtons.length > 0) {
        console.log('🖱️ About to click first Watch Live button...');
        console.log('📺 Button text:', watchLiveButtons[0].textContent);
        console.log('📺 Button disabled?', watchLiveButtons[0].disabled);
        
        // Add event listener to track what happens
        let logs = [];
        const originalConsoleLog = console.log;
        console.log = function(...args) {
          logs.push(args.join(' '));
          originalConsoleLog.apply(console, args);
        };
        
        // Click the button
        console.log('🎬 CLICKING WATCH LIVE BUTTON NOW...');
        watchLiveButtons[0].click();
        
        // Check results after click
        setTimeout(() => {
          console.log('🔍 Checking results after click...');
          
          // Look for video player modal
          const videoModal = document.querySelector('[role="dialog"]');
          const videoModalAlt = document.querySelector('.fixed.inset-0');
          console.log('Video modal (role=dialog) found:', !!videoModal);
          console.log('Video modal (fixed inset) found:', !!videoModalAlt);
          
          // Look for video element
          const videoElement = document.querySelector('video');
          console.log('Video element found:', !!videoElement);
          
          if (videoElement) {
            console.log('Video src:', videoElement.src);
            console.log('Video currentSrc:', videoElement.currentSrc);
          }
          
          // Check for any modal overlay
          const anyModal = document.querySelector('[data-testid="video-player-modal"], .video-player-modal, [class*="modal"]');
          console.log('Any modal found:', !!anyModal);
          
          // Show collected logs
          console.log('🔬 Logs collected during click:', logs);
          
        }, 3000);
      } else {
        console.log('❌ No Watch Live buttons found after network selection');
      }
    }, 3000);
  } else {
    console.log('❌ No network cards found');
  }
}, 5000);
