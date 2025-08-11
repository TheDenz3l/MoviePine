import { test, expect } from '@playwright/test';

test.describe('Search Overlay Button Fix Test', () => {
  test('should test search overlay buttons work after our fix', async ({ page }) => {
    console.log('🧪 Starting search overlay button test...');
    
    // Set up console logging to capture our debug messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log('📋 Console:', text);
    });
    
    // Handle dialogs (for add to list alerts)
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log('🚨 Dialog:', alertMessage);
      await dialog.accept();
    });
    
    try {
      console.log('🌐 Navigating to application...');
      await page.goto('http://localhost:3000');
      
      console.log('⏳ Waiting for page to load...');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Give time for everything to load
      
      console.log('🔍 Looking for search button...');
      // Try multiple selectors for the search button
      const searchButton = page.locator('button').filter({ hasText: /search/i }).first()
        .or(page.locator('button:has(svg)').first())
        .or(page.locator('[data-testid="search-button"]'))
        .or(page.locator('button').nth(4)); // Often the search is the 5th button
      
      await expect(searchButton).toBeVisible({ timeout: 10000 });
      console.log('✅ Found search button, clicking...');
      await searchButton.click();
      
      console.log('🔍 Waiting for search input to appear...');
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      
      console.log('⌨️ Typing search query...');
      await searchInput.fill('transform');
      
      console.log('⏳ Waiting for search results...');
      await page.waitForTimeout(3000); // Give time for API call and results
      
      console.log('🎬 Looking for movie cards...');
      const movieCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first()
        .or(page.locator('[data-search-content] > div > div').first())
        .or(page.locator('.grid > div').first());
      
      await expect(movieCard).toBeVisible({ timeout: 10000 });
      console.log('✅ Found movie card, hovering...');
      await movieCard.hover();
      
      console.log('🎯 Looking for play button...');
      const playButton = movieCard.locator('button[title="Play"], button:has-text("▶")').first();
      await expect(playButton).toBeVisible({ timeout: 3000 });
      
      console.log('🎮 Clicking play button...');
      await playButton.click();
      
      console.log('⏳ Waiting for console messages...');
      await page.waitForTimeout(2000);
      
      // Check if our debug messages appeared
      const playClicked = consoleMessages.some(msg => msg.includes('🔴 Play button clicked'));
      const playHandled = consoleMessages.some(msg => msg.includes('🎬 Playing movie'));
      
      console.log('📊 Test Results:');
      console.log(`- Play button clicked: ${playClicked}`);
      console.log(`- Play handler executed: ${playHandled}`);
      console.log(`- Console messages: ${consoleMessages.length}`);
      
      // Test passes if we got the expected console messages
      expect(playClicked || playHandled, 'Play button functionality should work').toBeTruthy();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      console.log('📋 All console messages:', consoleMessages);
      throw error;
    }
  });
});
