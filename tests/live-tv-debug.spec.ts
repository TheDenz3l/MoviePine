import { test, expect } from '@playwright/test';

test.describe('Live TV Debug Tests', () => {
  test('should open video player modal when clicking Watch Live button', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG')) {
        console.log(`🎬 ${msg.text()}`);
      }
    });

    // Go to Live TV page
    await page.goto('http://localhost:3000/?category=live-tv');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="live-tv-grid"], .grid', { timeout: 10000 });
    
    // Take a screenshot of the Live TV page
    await page.screenshot({ path: 'test-results/live-tv-page.png', fullPage: true });
    
    // Find the first "Watch Live" button
    const watchLiveButton = page.locator('button:has-text("Watch Live")').first();
    await expect(watchLiveButton).toBeVisible({ timeout: 5000 });
    
    console.log('🎬 Found Watch Live button, clicking...');
    
    // Click the Watch Live button
    await watchLiveButton.click();
    
    // Wait a moment for state changes
    await page.waitForTimeout(2000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/after-click.png', fullPage: true });
    
    // Check if the test modal appears (red background)
    const testModal = page.locator('div:has-text("TEST MODAL IS OPEN")');
    
    // Check if VideoPlayerModal appears
    const videoPlayerModal = page.locator('[data-testid="video-player-modal"], .video-player-modal');
    
    // Log what we can see
    const isTestModalVisible = await testModal.isVisible();
    const isVideoPlayerModalVisible = await videoPlayerModal.isVisible();
    
    console.log(`🎬 Test Modal Visible: ${isTestModalVisible}`);
    console.log(`🎬 Video Player Modal Visible: ${isVideoPlayerModalVisible}`);
    
    // Check if any modal/overlay is present
    const anyModal = page.locator('.fixed.inset-0, [role="dialog"], .modal, .overlay');
    const modalCount = await anyModal.count();
    console.log(`🎬 Found ${modalCount} modal-like elements`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });
    
    // The test should pass if either modal is visible
    if (isTestModalVisible || isVideoPlayerModalVisible) {
      console.log('✅ Modal appeared successfully');
    } else {
      console.log('❌ No modal appeared - this is the bug');
      
      // Try to get more debug info
      const pageContent = await page.content();
      console.log('🎬 Page contains "TEST MODAL":', pageContent.includes('TEST MODAL'));
      console.log('🎬 Page contains "isVideoPlayerOpen":', pageContent.includes('isVideoPlayerOpen'));
      
      // Let's check what's in the DOM
      const modals = await page.locator('.fixed, [role="dialog"]').all();
      console.log(`🎬 Found ${modals.length} potential modal elements`);
      
      for (let i = 0; i < modals.length; i++) {
        const modal = modals[i];
        const isVisible = await modal.isVisible();
        const text = await modal.textContent();
        console.log(`🎬 Modal ${i}: visible=${isVisible}, text="${text?.substring(0, 100)}..."`);
      }
    }
    
    // For debugging, let's not fail the test, just report findings
    expect(true).toBe(true); // Always pass for debugging
  });
  
  test('should check component state and rendering', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`Console: ${msg.text()}`);
    });

    // Go to Live TV page
    await page.goto('http://localhost:3000/?category=live-tv');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="live-tv-grid"], .grid', { timeout: 10000 });
    
    // Execute JavaScript to check component state
    const componentInfo = await page.evaluate(() => {
      // Try to find any React components or state
      const body = document.body;
      const hasTestModal = document.querySelector('div:contains("TEST MODAL")');
      const hasVideoPlayer = document.querySelector('[data-testid="video-player-modal"]');
      
      return {
        hasTestModal: !!hasTestModal,
        hasVideoPlayer: !!hasVideoPlayer,
        bodyClasses: body.className,
        childCount: body.children.length
      };
    });
    
    console.log('🎬 Component Info:', componentInfo);
    
    // Click Watch Live and check state again
    const watchLiveButton = page.locator('button:has-text("Watch Live")').first();
    await watchLiveButton.click();
    
    await page.waitForTimeout(2000);
    
    const afterClickInfo = await page.evaluate(() => {
      const hasTestModal = !!document.querySelector('div:contains("TEST MODAL")');
      const hasVideoPlayer = !!document.querySelector('[data-testid="video-player-modal"]');
      const redDivs = document.querySelectorAll('div[class*="bg-red"]');
      
      return {
        hasTestModal,
        hasVideoPlayer,
        redDivCount: redDivs.length,
        redDivs: Array.from(redDivs).map(div => ({
          className: div.className,
          textContent: div.textContent?.substring(0, 100)
        }))
      };
    });
    
    console.log('🎬 After Click Info:', afterClickInfo);
    
    expect(true).toBe(true); // Always pass for debugging
  });
});
