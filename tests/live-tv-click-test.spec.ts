import { test, expect } from '@playwright/test'

test('Live TV - Network Click Test', async ({ page }) => {
  console.log('🚀 Starting Live TV Network Click Test')
  
  // Navigate to Live TV
  await page.goto('http://localhost:3000?category=live-tv')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)
  
  console.log('✅ Page loaded, taking initial screenshot')
  await page.screenshot({ path: 'test-results/01-networks-page.png', fullPage: true })
  
  // Find network elements
  const networkCards = await page.locator('[class*="cursor-pointer"]').all()
  console.log(`📺 Found ${networkCards.length} network cards`)
  
  if (networkCards.length > 0) {
    // Get text content of first few networks
    for (let i = 0; i < Math.min(3, networkCards.length); i++) {
      const text = await networkCards[i].textContent()
      console.log(`📺 Network ${i}: ${text?.trim()}`)
    }
    
    // Click the first network
    console.log('🖱️ Clicking first network...')
    await networkCards[0].click()
    await page.waitForTimeout(2000) // Wait for navigation/loading
    
    console.log('✅ Network clicked, taking screenshot')
    await page.screenshot({ path: 'test-results/02-after-network-click.png', fullPage: true })
    
    // Check what happened after click
    const currentUrl = page.url()
    const pageText = await page.textContent('body')
    const hasWatchLive = pageText?.includes('Watch Live')
    const hasStreamOffline = pageText?.includes('Stream Offline')
    const hasLoading = pageText?.includes('Loading') || pageText?.includes('loading')
    
    console.log('📊 After network click:', {
      url: currentUrl,
      hasWatchLive,
      hasStreamOffline,
      hasLoading,
      bodyTextLength: pageText?.length
    })
    
    // Look for buttons
    const buttons = await page.locator('button').all()
    console.log(`🔍 Found ${buttons.length} buttons after network click`)
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent()
      console.log(`  Button ${i}: "${buttonText?.trim()}"`)
      
      if (buttonText?.includes('Watch Live')) {
        console.log('🎉 FOUND Watch Live button!')
        
        // Take screenshot before clicking
        await page.screenshot({ path: 'test-results/03-before-watch-live-click.png', fullPage: true })
        
        // Click the Watch Live button
        console.log('🎬 Clicking Watch Live button...')
        await buttons[i].click()
        await page.waitForTimeout(3000)
        
        // Take screenshot after clicking
        await page.screenshot({ path: 'test-results/04-after-watch-live-click.png', fullPage: true })
        
        // Check for modal/video
        const modals = await page.locator('[role="dialog"], .fixed.inset-0').count()
        const videos = await page.locator('video').count()
        
        console.log('📺 After Watch Live click:', {
          modals,
          videos
        })
        
        break
      }
    }
  }
  
  expect(networkCards.length).toBeGreaterThan(0)
})
