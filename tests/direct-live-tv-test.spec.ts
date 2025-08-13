import { test, expect } from '@playwright/test'

test.describe('Direct Live TV Implementation', () => {
  test('should load live TV page and display networks', async ({ page }) => {
    // Go to the live TV page
    await page.goto('http://localhost:3000/?category=live-tv')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check if the Live TV title is visible
    await expect(page.getByText('Live TV')).toBeVisible()
    
    // Check if the direct streaming indicator is visible
    await expect(page.getByText('DIRECT STREAMING')).toBeVisible()
    
    // Check if networks are loaded (should have at least 1)
    const networkCards = page.locator('.bg-gray-900')
    const networkCount = await networkCards.count()
    expect(networkCount).toBeGreaterThan(0)
    
    // Check if we can see some network names
    await expect(page.getByText('CBS News')).toBeVisible()
    await expect(page.getByText('ABC News Live')).toBeVisible()
    
    // Check if Watch Live buttons are present
    await expect(page.getByText('Watch Live').first()).toBeVisible()
    
    console.log('✅ Direct Live TV page loaded successfully with networks')
  })

  test('should open video player when clicking Watch Live', async ({ page }) => {
    // Go to the live TV page
    await page.goto('http://localhost:3000/?category=live-tv')
    
    // Wait for networks to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Click on the first "Watch Live" button
    const watchButton = page.getByText('Watch Live').first()
    await expect(watchButton).toBeVisible()
    
    console.log('🎬 Clicking Watch Live button...')
    await watchButton.click()
    
    // Wait for the video player modal to open
    await page.waitForTimeout(3000)
    
    // Check if video player is opened (look for video element or modal)
    const videoModal = page.locator('[role="dialog"], .fixed.inset-0')
    await expect(videoModal).toBeVisible({ timeout: 10000 })
    
    // Check if the video element exists
    const videoElement = page.locator('video')
    await expect(videoElement).toBeVisible({ timeout: 5000 })
    
    console.log('✅ Video player modal opened successfully')
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/direct-live-tv-player.png', fullPage: true })
  })

  test('should filter networks by category', async ({ page }) => {
    // Go to the live TV page
    await page.goto('http://localhost:3000/?category=live-tv')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Click on News category
    await page.getByText('News').click()
    await page.waitForTimeout(1000)
    
    // Verify that networks are shown after filtering
    const networks = page.locator('.bg-gray-900')
    const networkCount = await networks.count()
    expect(networkCount).toBeGreaterThan(0)
    
    // All visible network cards should contain news networks
    await expect(page.getByText('CBS News')).toBeVisible()
    
    console.log('✅ Category filtering works correctly')
  })
})
