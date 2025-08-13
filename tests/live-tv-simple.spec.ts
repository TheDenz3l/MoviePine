import { test, expect } from '@playwright/test'

test('Live TV - Quick Test', async ({ page }) => {
  // Disable JavaScript to avoid Fast Refresh issues
  await page.goto('http://localhost:3000?category=live-tv')
  
  // Wait for initial load
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(5000)
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/live-tv-initial.png', fullPage: true })
  
  // Look for any elements that could be network cards
  const allDivs = await page.locator('div').count()
  const allButtons = await page.locator('button').count()
  const cursorPointerElements = await page.locator('[class*="cursor-pointer"]').count()
  const backgroundElements = await page.locator('[class*="bg-gray"]').count()
  
  console.log('📊 Element counts:', {
    divs: allDivs,
    buttons: allButtons,
    cursorPointer: cursorPointerElements,
    backgrounds: backgroundElements
  })
  
  // Check if page loaded correctly
  const title = await page.title()
  const pageText = await page.textContent('body')
  const hasLiveTV = pageText?.includes('Live TV') || title.includes('Live TV')
  
  console.log('📄 Page info:', {
    title,
    hasLiveTV,
    bodyTextLength: pageText?.length || 0
  })
  
  // Look for specific text content
  const hasNetworks = pageText?.includes('Networks') || pageText?.includes('ABC') || pageText?.includes('CBS')
  const hasWatchLive = pageText?.includes('Watch Live')
  
  console.log('🔍 Content check:', {
    hasNetworks,
    hasWatchLive
  })
  
  expect(hasLiveTV).toBeTruthy()
})
