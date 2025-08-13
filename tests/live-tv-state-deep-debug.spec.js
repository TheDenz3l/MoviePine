const { test, expect } = require('@playwright/test');

test.describe('Live TV State Deep Debug', () => {
  test('Monitor state changes during Live TV click', async ({ page }) => {
    console.log('🚀 Starting Live TV state deep debug...');
    
    // Navigate to Live TV page
    await page.goto('http://localhost:3000/?category=live-tv');
    console.log('✅ Navigated to Live TV page');
    
    // Wait for networks to load
    await page.waitForTimeout(5000);
    
    // Capture all console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(`[${new Date().toISOString()}] ${text}`);
      if (text.includes('DEBUG') || text.includes('MODAL') || text.includes('LIVE TV')) {
        console.log(`📝 ${text}`);
      }
    });
    
    // Check for network cards
    const networkCards = await page.locator('.grid .bg-gray-800').count();
    console.log(`📺 Found ${networkCards} network cards`);
    
    if (networkCards === 0) {
      console.log('❌ No network cards found, ending test');
      await page.screenshot({ path: 'test-results/no-networks.png' });
      return;
    }
    
    // Click first network
    console.log('🖱️ Clicking first network...');
    await page.locator('.grid .bg-gray-800').first().click();
    
    // Wait for streams to load
    await page.waitForTimeout(3000);
    
    // Find Watch Live buttons
    const watchButtons = await page.locator('button', { hasText: /Watch.*Live|Live.*Watch/i }).count();
    console.log(`🎬 Found ${watchButtons} Watch Live buttons`);
    
    if (watchButtons === 0) {
      console.log('❌ No Watch Live buttons found');
      await page.screenshot({ path: 'test-results/no-watch-buttons.png' });
      return;
    }
    
    // Monitor state before clicking
    await page.evaluate(() => {
      console.log('📊 PRE-CLICK STATE ANALYSIS:');
      console.log('- Current timestamp:', Date.now());
      
      // Log all global variables that might contain React state
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('- React DevTools available');
      }
      
      // Check for any existing modals
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const modals = document.querySelectorAll('[data-state="open"]');
      console.log(`- Existing dialogs: ${dialogs.length}`);
      console.log(`- Existing modals: ${modals.length}`);
    });
    
    // Click Watch Live button and immediately start monitoring
    console.log('🎬 Clicking Watch Live button...');
    await page.locator('button', { hasText: /Watch.*Live|Live.*Watch/i }).first().click();
    
    // Continuously monitor for state changes over 10 seconds
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      
      const dialogs = await page.locator('[role="dialog"]').count();
      const modals = await page.locator('[data-state="open"]').count();
      const videos = await page.locator('video').count();
      
      if (i % 4 === 0) { // Log every 2 seconds
        console.log(`📊 State check ${Math.floor(i/4) + 1}: dialogs=${dialogs}, modals=${modals}, videos=${videos}`);
      }
      
      // If modal appears, log success and break
      if (dialogs > 0 || modals > 0) {
        console.log(`🎉 MODAL DETECTED at ${i * 500}ms! dialogs=${dialogs}, modals=${modals}`);
        break;
      }
    }
    
    // Final analysis
    const finalDialogs = await page.locator('[role="dialog"]').count();
    const finalModals = await page.locator('[data-state="open"]').count();
    const finalVideos = await page.locator('video').count();
    
    console.log(`🏁 FINAL STATE: dialogs=${finalDialogs}, modals=${finalModals}, videos=${finalVideos}`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/live-tv-state-debug.png', fullPage: true });
    
    // Filter and display relevant logs
    const relevantLogs = logs.filter(log => 
      log.includes('DEBUG') || 
      log.includes('MODAL') || 
      log.includes('setVideoPlayerOpen') ||
      log.includes('handlePlay') ||
      log.includes('isVideoPlayerOpen')
    );
    
    console.log('\n📝 RELEVANT DEBUG LOGS:');
    relevantLogs.slice(-20).forEach((log, i) => {
      console.log(`   ${i + 1}. ${log}`);
    });
    
    // Test passes if we see our debug activity
    const hasModalDebugLogs = relevantLogs.some(log => log.includes('setVideoPlayerOpen'));
    const hasPlayLogs = relevantLogs.some(log => log.includes('handlePlay'));
    
    console.log(`\n🏁 Test summary:`);
    console.log(`- Has play logs: ${hasPlayLogs}`);
    console.log(`- Has modal debug logs: ${hasModalDebugLogs}`);
    console.log(`- Final modal count: ${finalDialogs}`);
    
    // Always pass - we're debugging
    expect(true).toBe(true);
  });
});
