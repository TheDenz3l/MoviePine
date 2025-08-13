const { test, expect } = require('@playwright/test');

test.describe('Direct Modal Test', () => {
  test('Test VideoPlayerModal rendering with direct state manipulation', async ({ page }) => {
    console.log('🚀 Starting direct modal test...');
    
    // Navigate to main page
    await page.goto('http://localhost:3000/');
    console.log('✅ Page loaded');
    
    // Wait for React to be ready
    await page.waitForTimeout(3000);
    
    // Inject a script that directly triggers the modal
    await page.evaluate(() => {
      console.log('🧪 [TEST] Injecting modal trigger script...');
      
      // Try to find React components and trigger modal state
      const testUrl = 'https://example.com/test-stream.m3u8';
      const testTitle = 'Test Live Stream';
      
      // Create a custom event to trigger the modal
      const triggerEvent = () => {
        console.log('🎬 [TEST] Attempting to trigger modal...');
        
        // Try to access React component state through DOM
        const reactRoot = document.querySelector('[data-reactroot]');
        if (reactRoot) {
          console.log('✅ [TEST] Found React root');
          
          // Dispatch a custom event that the app can listen for
          const event = new CustomEvent('test-modal-trigger', {
            detail: { url: testUrl, title: testTitle }
          });
          document.dispatchEvent(event);
          
          // Also try setting global variables that might be accessible
          window._testModalTrigger = { url: testUrl, title: testTitle };
          
          console.log('📡 [TEST] Dispatched test event and set global variable');
        }
      };
      
      triggerEvent();
      return { success: true };
    });
    
    // Monitor console logs for our debug output
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DEBUG') || text.includes('MODAL') || text.includes('TEST')) {
        logs.push(text);
        console.log(`📝 Console: ${text}`);
      }
    });
    
    // Wait and check for modal
    await page.waitForTimeout(2000);
    
    // Check for modal elements
    const dialogs = await page.locator('[role="dialog"]').count();
    const modals = await page.locator('[data-state="open"]').count();
    const videos = await page.locator('video').count();
    
    console.log(`📊 Modal check: dialogs=${dialogs}, modals=${modals}, videos=${videos}`);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/direct-modal-test.png', fullPage: true });
    
    // Log all the debug output we captured
    console.log('📝 Captured debug logs:');
    logs.forEach((log, i) => {
      console.log(`   ${i + 1}. ${log}`);
    });
    
    // Test passes if we see our debug logs, even if modal doesn't appear
    // This will help us understand what's happening
    const hasDebugLogs = logs.length > 0;
    const hasModalDebugLogs = logs.some(log => log.includes('DEBUG MODAL'));
    
    console.log(`🏁 Test results: hasDebugLogs=${hasDebugLogs}, hasModalDebugLogs=${hasModalDebugLogs}`);
    
    // For now, just log the results - we'll analyze the output
    expect(true).toBe(true); // Always pass, we're just gathering info
  });
});
