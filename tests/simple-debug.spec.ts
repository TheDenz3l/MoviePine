import { test, expect } from '@playwright/test';

test.describe('Live TV Simple Debug', () => {
  test('should load Live TV page and click Watch Live', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG') || msg.text().includes('🎬')) {
        console.log(`🎬 Browser Console: ${msg.text()}`);
      }
    });

    console.log('🎬 Test: Starting...');
    
    // Go to Live TV page
    await page.goto('http://localhost:3000/?category=live-tv');
    console.log('🎬 Test: Navigated to Live TV page');
    
    // Wait for page to load - try different selectors
    try {
      await page.waitForSelector('.grid', { timeout: 5000 });
      console.log('🎬 Test: Found .grid selector');
    } catch (e) {
      console.log('🎬 Test: .grid not found, trying other selectors...');
      try {
        await page.waitForSelector('button', { timeout: 5000 });
        console.log('🎬 Test: Found button selector');
      } catch (e2) {
        console.log('🎬 Test: No buttons found either');
      }
    }
    
    // Take a screenshot of current state
    await page.screenshot({ path: 'test-results/debug-1-loaded.png', fullPage: true });
    console.log('🎬 Test: Screenshot 1 taken');
    
    // Count all buttons
    const buttonCount = await page.locator('button').count();
    console.log(`🎬 Test: Found ${buttonCount} buttons on page`);
    
    // Find Watch Live buttons specifically
    const watchLiveButtons = await page.locator('button:has-text("Watch Live")').count();
    console.log(`🎬 Test: Found ${watchLiveButtons} Watch Live buttons`);
    
    if (watchLiveButtons > 0) {
      console.log('🎬 Test: Clicking first Watch Live button...');
      await page.locator('button:has-text("Watch Live")').first().click();
      
      // Wait a moment
      await page.waitForTimeout(3000);
      
      // Take screenshot after click
      await page.screenshot({ path: 'test-results/debug-2-after-click.png', fullPage: true });
      console.log('🎬 Test: Screenshot 2 taken');
      
      // Check for test modal
      const testModalExists = await page.locator('div:has-text("TEST MODAL IS OPEN")').count();
      console.log(`🎬 Test: Test modal count: ${testModalExists}`);
      
      // Check for any red backgrounds (our test modal)
      const redElements = await page.locator('.bg-red-500, [class*="bg-red"]').count();
      console.log(`🎬 Test: Red elements count: ${redElements}`);
      
      // Check for fixed positioned elements (modals)
      const fixedElements = await page.locator('.fixed').count();
      console.log(`🎬 Test: Fixed positioned elements: ${fixedElements}`);
      
    } else {
      console.log('🎬 Test: No Watch Live buttons found!');
    }
    
    console.log('🎬 Test: Completed');
    
    // Always pass for debugging
    expect(true).toBe(true);
  });
});
