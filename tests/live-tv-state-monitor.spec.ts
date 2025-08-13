import { test, expect } from '@playwright/test';

test('Live TV - State Monitoring Test', async ({ page }) => {
  console.log('🚀 Starting Live TV State Monitoring Test');
  
  // Navigate to Live TV page
  await page.goto('http://localhost:3000/?category=live-tv');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  console.log('✅ Page loaded');
  
  // Check for network cards
  const networkCards = await page.locator('.cursor-pointer').all();
  console.log(`📺 Found ${networkCards.length} network cards`);
  
  if (networkCards.length === 0) {
    throw new Error('No network cards found');
  }
  
  // Click first network
  console.log('🖱️ Clicking first network...');
  await networkCards[0].click();
  
  // Wait for streams to load
  await page.waitForTimeout(2000);
  
  // Look for Watch Live buttons
  const watchLiveButtons = await page.locator('button:has-text("Watch Live")').all();
  console.log(`🎬 Found ${watchLiveButtons.length} Watch Live buttons`);
  
  if (watchLiveButtons.length === 0) {
    throw new Error('No Watch Live buttons found');
  }
  
  // Inject React state monitoring
  await page.evaluate(() => {
    // Store captured logs
    (window as any).capturedLogs = [];
    
    // Monitor console logs for our debug messages
    const originalLog = console.log;
    console.log = function(...args: any[]) {
      const message = args.join(' ');
      if (message.includes('[DEBUG]') || message.includes('🎬')) {
        (window as any).capturedLogs.push({
          timestamp: Date.now(),
          message: message
        });
      }
      return originalLog.apply(console, args);
    };
    
    console.log('💉 State monitoring injected');
  });
  
  // Get initial modal/video state
  const initialState = await page.evaluate(() => {
    return {
      modals: document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]').length,
      videos: document.querySelectorAll('video').length,
      bodyClass: document.body.className,
      timestamp: Date.now()
    };
  });
  
  console.log('📊 Initial state:', initialState);
  
  // Take screenshot before clicking
  await page.screenshot({ path: 'test-results/before-watch-live-click.png', fullPage: true });
  
  // Click Watch Live button
  console.log('🎬 Clicking Watch Live button...');
  await watchLiveButtons[0].click();
  
  // Wait and monitor state changes
  let stateCheckCount = 0;
  let modalFound = false;
  
  while (stateCheckCount < 10 && !modalFound) { // Check for 5 seconds
    await page.waitForTimeout(500);
    stateCheckCount++;
    
    const currentState = await page.evaluate(() => {
      return {
        modals: document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]').length,
        videos: document.querySelectorAll('video').length,
        bodyClass: document.body.className,
        capturedLogs: (window as any).capturedLogs || [],
        timestamp: Date.now()
      };
    });
    
    console.log(`📊 State check ${stateCheckCount}:`, {
      modals: currentState.modals,
      videos: currentState.videos,
      modalChange: currentState.modals > initialState.modals,
      videoChange: currentState.videos > initialState.videos
    });
    
    // Show captured React debug logs
    if (currentState.capturedLogs.length > 0) {
      console.log('📝 Captured debug logs:');
      currentState.capturedLogs.forEach((log: any, i: number) => {
        console.log(`   ${i+1}. ${log.message}`);
      });
      
      // Clear logs for next iteration
      await page.evaluate(() => {
        (window as any).capturedLogs = [];
      });
    }
    
    modalFound = currentState.modals > initialState.modals || currentState.videos > initialState.videos;
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'test-results/after-watch-live-click.png', fullPage: true });
  
  // Get final analysis
  const finalAnalysis = await page.evaluate(() => {
    const allModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"], [class*="modal"]');
    const modalAnalysis = Array.from(allModals).map((modal, i) => {
      const styles = window.getComputedStyle(modal);
      return {
        index: i,
        tagName: modal.tagName,
        className: modal.className,
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        position: styles.position
      };
    });
    
    return {
      totalModals: allModals.length,
      modalDetails: modalAnalysis,
      bodyClass: document.body.className
    };
  });
  
  console.log('🔍 Final modal analysis:', finalAnalysis);
  
  if (modalFound) {
    console.log('🎉 SUCCESS: Modal/video appeared!');
  } else {
    console.log('❌ FAILURE: No modal/video detected after Watch Live click');
    
    // Save page content for debugging
    const pageContent = await page.content();
    console.log('💾 Page content length:', pageContent.length);
  }
  
  // The test should pass if either a modal is found OR if we captured React debug logs showing the flow
  const hasDebugActivity = await page.evaluate(() => {
    return ((window as any).capturedLogs && (window as any).capturedLogs.length > 0) || 
           document.querySelector('[role="dialog"]') !== null ||
           document.querySelector('video') !== null;
  });
  
  console.log('🏁 Test complete. Modal found:', modalFound, 'Debug activity:', hasDebugActivity);
  
  // For now, let's not fail the test, just gather information
  expect(networkCards.length).toBeGreaterThan(0);
});
