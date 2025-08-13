import { test, expect, Page } from '@playwright/test';

test.describe('Live TV Video Player Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the live TV page
    await page.goto('/?category=live-tv');
    
    // Wait for the page to load and networks to be fetched
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for any async operations to complete
    await page.waitForTimeout(3000);
  });

  test('should open video player when clicking Watch Live button', async ({ page }) => {
    console.log('🧪 Testing Live TV Video Player Fix...');
    
    // Wait for networks to load by checking for watch buttons
    await expect(page.locator('button:has-text("Watch")')).toBeVisible({ timeout: 30000 });
    
    // Get all watch buttons
    const watchButtons = page.locator('button:has-text("Watch")');
    const watchButtonCount = await watchButtons.count();
    
    console.log(`📺 Found ${watchButtonCount} watch buttons`);
    expect(watchButtonCount).toBeGreaterThan(0);
    
    // Set up console monitoring to track state changes
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('[DEBUG STATE] isVideoPlayerOpen changed to:')) {
        console.log(`🎬 State change detected: ${text}`);
      }
    });
    
    // Click the first watch button
    const firstWatchButton = watchButtons.first();
    const buttonText = await firstWatchButton.textContent();
    console.log(`🖱️ Clicking watch button: ${buttonText}`);
    
    await firstWatchButton.click();
    
    // Wait for video player modal to appear
    console.log('⏳ Waiting for video player modal...');
    
    // Check for various possible selectors for the video player modal
    const videoModalSelectors = [
      '[role="dialog"]',
      '.video-player-modal',
      '[data-testid="video-player-modal"]',
      '[data-state="open"]',
      '[data-radix-dialog-content]'
    ];
    
    let modalFound = false;
    let modalElement = null;
    
    for (const selector of videoModalSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        modalElement = page.locator(selector);
        if (await modalElement.isVisible()) {
          modalFound = true;
          console.log(`✅ Video player modal found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Assert that the modal was found and is visible
    expect(modalFound).toBe(true);
    if (modalElement) {
      await expect(modalElement).toBeVisible();
    }
    
    // Additional checks for modal content
    if (modalElement) {
      const modalClasses = await modalElement.getAttribute('class');
      console.log(`🎬 Modal classes: ${modalClasses}`);
      
      // Check if modal has expected attributes
      const hasRoleDialog = await modalElement.getAttribute('role') === 'dialog';
      const hasDataState = await modalElement.getAttribute('data-state');
      
      console.log(`🔍 Modal has role="dialog": ${hasRoleDialog}`);
      console.log(`🔍 Modal data-state: ${hasDataState}`);
    }
    
    // Verify no state mismatch errors occurred
    const stateMismatchErrors = consoleMessages.filter(msg => 
      msg.includes('STATE MISMATCH DETECTED')
    );
    
    expect(stateMismatchErrors.length).toBe(0);
    console.log(`✅ No state mismatch errors detected`);
    
    // Verify state changes happened correctly
    const stateChangesToTrue = consoleMessages.filter(msg => 
      msg.includes('isVideoPlayerOpen changed to: true')
    );
    
    expect(stateChangesToTrue.length).toBeGreaterThan(0);
    console.log(`✅ Video player state correctly changed to true ${stateChangesToTrue.length} time(s)`);
  });

  test('should handle multiple watch button clicks without issues', async ({ page }) => {
    console.log('🧪 Testing multiple watch button clicks...');
    
    // Wait for networks to load
    await expect(page.locator('button:has-text("Watch")')).toBeVisible({ timeout: 30000 });
    
    const watchButtons = page.locator('button:has-text("Watch")');
    const buttonCount = await watchButtons.count();
    
    // Test up to 3 buttons or all available buttons (whichever is less)
    const testCount = Math.min(3, buttonCount);
    
    for (let i = 0; i < testCount; i++) {
      console.log(`🖱️ Testing button ${i + 1}/${testCount}`);
      
      const button = watchButtons.nth(i);
      const buttonText = await button.textContent();
      console.log(`Clicking: ${buttonText}`);
      
      await button.click();
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      console.log(`✅ Modal opened for button ${i + 1}`);
      
      // Close the modal by pressing Escape or clicking close button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      
      // Verify modal is closed
      await expect(modal).not.toBeVisible();
      console.log(`✅ Modal closed for button ${i + 1}`);
      
      // Wait a bit before next test
      await page.waitForTimeout(1000);
    }
    
    console.log(`✅ Successfully tested ${testCount} watch buttons`);
  });

  test('should display video player with correct streaming URL', async ({ page }) => {
    console.log('🧪 Testing video player streaming URL...');
    
    // Wait for networks to load
    await expect(page.locator('button:has-text("Watch")')).toBeVisible({ timeout: 30000 });
    
    // Monitor network requests for streaming URLs
    const streamingRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/stream-transcoder') || url.includes('.m3u8')) {
        streamingRequests.push(url);
        console.log(`📡 Streaming request: ${url}`);
      }
    });
    
    // Click a watch button
    const firstWatchButton = page.locator('button:has-text("Watch")').first();
    await firstWatchButton.click();
    
    // Wait for modal and video element
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Look for video element within the modal
    const videoElement = modal.locator('video');
    
    // Wait for video element to be present (it might take time to load)
    await expect(videoElement).toBeVisible({ timeout: 15000 });
    
    // Check if video has a source
    const videoSrc = await videoElement.getAttribute('src');
    console.log(`🎬 Video source: ${videoSrc}`);
    
    // Verify streaming requests were made
    expect(streamingRequests.length).toBeGreaterThan(0);
    console.log(`✅ ${streamingRequests.length} streaming request(s) made`);
    
    // Verify video element properties
    const videoProperties = await videoElement.evaluate((video: HTMLVideoElement) => ({
      src: video.src,
      currentTime: video.currentTime,
      readyState: video.readyState,
      networkState: video.networkState
    }));
    
    console.log(`🎬 Video properties:`, videoProperties);
    expect(videoProperties.src).toBeTruthy();
  });

  test('should handle network loading states correctly', async ({ page }) => {
    console.log('🧪 Testing network loading states...');
    
    // Navigate to live TV page
    await page.goto('/?category=live-tv');
    
    // Check for loading state initially
    const loadingIndicator = page.locator('text=Loading, text=loading, [data-testid="loading"]');
    
    // Either loading should be visible initially, or networks should load quickly
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      console.log('✅ Loading indicator detected');
      
      // Wait for loading to finish
      await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });
      console.log('✅ Loading finished');
    } catch (e) {
      console.log('ℹ️ Loading indicator not found or networks loaded quickly');
    }
    
    // Verify networks loaded successfully
    await expect(page.locator('button:has-text("Watch")')).toBeVisible({ timeout: 30000 });
    
    const networkCount = await page.locator('button:has-text("Watch")').count();
    console.log(`📺 Loaded ${networkCount} networks with watch buttons`);
    expect(networkCount).toBeGreaterThan(0);
  });

  test('should maintain proper console logging for debugging', async ({ page }) => {
    console.log('🧪 Testing console logging...');
    
    const debugLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[DEBUG]') || text.includes('🎬') || text.includes('📺')) {
        debugLogs.push(text);
      }
    });
    
    // Wait for networks to load
    await expect(page.locator('button:has-text("Watch")')).toBeVisible({ timeout: 30000 });
    
    // Click a watch button
    const firstWatchButton = page.locator('button:has-text("Watch")').first();
    await firstWatchButton.click();
    
    // Wait for modal
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Wait a bit for all logs to be captured
    await page.waitForTimeout(2000);
    
    // Verify debug logs were generated
    expect(debugLogs.length).toBeGreaterThan(0);
    console.log(`✅ Captured ${debugLogs.length} debug log entries`);
    
    // Look for specific important log entries
    const stateChangeLogs = debugLogs.filter(log => log.includes('setVideoPlayerOpen'));
    const functionalUpdateLogs = debugLogs.filter(log => log.includes('Functional update'));
    
    expect(stateChangeLogs.length).toBeGreaterThan(0);
    expect(functionalUpdateLogs.length).toBeGreaterThan(0);
    
    console.log(`✅ Found ${stateChangeLogs.length} state change logs`);
    console.log(`✅ Found ${functionalUpdateLogs.length} functional update logs`);
    
    // Verify no error logs
    const errorLogs = debugLogs.filter(log => 
      log.toLowerCase().includes('error') || 
      log.includes('❌') ||
      log.includes('MISMATCH')
    );
    
    expect(errorLogs.length).toBe(0);
    console.log(`✅ No error logs detected`);
  });
});
