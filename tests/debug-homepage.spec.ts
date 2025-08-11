import { test, expect } from '@playwright/test';

test.describe('Homepage Debug', () => {
  test('should load homepage and take screenshot', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3000');
    
    // Wait for basic load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Take a screenshot to see the actual layout
    await page.screenshot({ path: 'homepage-debug.png', fullPage: true });
    
    // Log page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Log all buttons on the page with their position and text
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on the page`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const isVisible = await button.isVisible();
      const text = await button.textContent();
      const boundingBox = await button.boundingBox();
      
      console.log(`Button ${i}: "${text}" (visible: ${isVisible}) position: ${JSON.stringify(boundingBox)}`);
    }
    
    // Also check for any search-related elements
    const searchElements = await page.locator('[placeholder*="search" i], [aria-label*="search" i], [title*="search" i]').all();
    console.log(`Found ${searchElements.length} search-related elements`);
    
    for (let i = 0; i < searchElements.length; i++) {
      const element = searchElements[i];
      const tagName = await element.evaluate(el => el.tagName);
      const text = await element.textContent();
      const placeholder = await element.getAttribute('placeholder');
      const isVisible = await element.isVisible();
      
      console.log(`Search element ${i}: ${tagName} "${text}" placeholder: "${placeholder}" (visible: ${isVisible})`);
    }
  });
});
