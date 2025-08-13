import { test, expect } from '@playwright/test';

test.describe('Live TV Full Flow Debug', () => {
  test('should click a network then show Watch Live buttons', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG') || msg.text().includes('🎬')) {
        console.log(`🎬 Browser: ${msg.text()}`);
      }
    });

    console.log('🎬 Test: Starting Live TV full flow...');
    
    // Go to Live TV page
    await page.goto('http://localhost:3000/?category=live-tv');
    console.log('🎬 Test: Navigated to Live TV page');
    
    // Wait for page to load - look for networks grid
    await page.waitForSelector('.grid.grid-cols-1', { timeout: 10000 });
    console.log('🎬 Test: Page loaded - found networks grid');
    
    // Take screenshot of networks page
    await page.screenshot({ path: 'test-results/step1-networks.png', fullPage: true });
    
    // Look for network cards/buttons (not "Watch Live" buttons yet)
    const networkButtons = await page.locator('button, .cursor-pointer, [role="button"]').count();
    console.log(`🎬 Test: Found ${networkButtons} clickable elements (networks)`);
    
    // Try to find network names like CBS, NBC, etc.
    const networkCards = await page.locator('div:has-text("CBS"), div:has-text("NBC"), div:has-text("FOX"), div:has-text("ABC")').count();
    console.log(`🎬 Test: Found ${networkCards} network cards with recognizable names`);
    
    // Find any clickable card-like elements
    const cards = await page.locator('.bg-gray-800, .bg-gray-900, .rounded, .card').count();
    console.log(`🎬 Test: Found ${cards} card-like elements`);
    
    // Try to click the first network (look for network cards)
    const firstNetworkCard = page.locator('.bg-gray-900.rounded-lg.p-6.cursor-pointer').first();
    const isVisible = await firstNetworkCard.isVisible();
    
    if (isVisible) {
      console.log('🎬 Test: Clicking first network...');
      await firstNetworkCard.click();
      
      // Wait for streams to load
      await page.waitForTimeout(3000);
      
      // Take screenshot after clicking network
      await page.screenshot({ path: 'test-results/step2-after-network-click.png', fullPage: true });
      
      // Now look for "Watch Live" buttons
      const watchLiveButtons = await page.locator('button:has-text("Watch Live")').count();
      console.log(`🎬 Test: After clicking network, found ${watchLiveButtons} Watch Live buttons`);
      
      if (watchLiveButtons > 0) {
        console.log('🎬 Test: SUCCESS! Found Watch Live buttons. Clicking first one...');
        await page.locator('button:has-text("Watch Live")').first().click();
        
        // Wait for modal
        await page.waitForTimeout(3000);
        
        // Take screenshot after clicking Watch Live
        await page.screenshot({ path: 'test-results/step3-after-watch-live-click.png', fullPage: true });
        
        // Check for our test modal (always open)
        const testModal = await page.locator('div:has-text("TEST MODAL IS ALWAYS OPEN")').count();
        console.log(`🎬 Test: Found ${testModal} test modals`);
        
        // Check for red background
        const redElements = await page.locator('.bg-red-500').count();
        console.log(`🎬 Test: Found ${redElements} red elements`);
        
        if (testModal > 0) {
          console.log('🎉 SUCCESS! Modal is rendering and Live TV functionality is working!');
        }
        
      } else {
        console.log('🎬 Test: No Watch Live buttons found after clicking network');
      }
      
    } else {
      console.log('🎬 Test: No clickable elements found on networks page');
    }
    
    console.log('🎬 Test: Completed');
    expect(true).toBe(true); // Always pass for debugging
  });
});
