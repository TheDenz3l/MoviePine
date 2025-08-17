import { test, expect } from '@playwright/test';

test('Debug page elements', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(5000);

  // Log all div elements with cursor-pointer class
  const cursorPointerDivs = await page.locator('div.cursor-pointer').all();
  console.log('Found', cursorPointerDivs.length, 'div elements with cursor-pointer class');
  
  // Log all div elements with group class
  const groupDivs = await page.locator('div.group').all();
  console.log('Found', groupDivs.length, 'div elements with group class');
  
  // Log all NetflixCard-like elements
  const netflixCards = await page.locator('div.cursor-pointer.group').all();
  console.log('Found', netflixCards.length, 'NetflixCard elements');
  
  // Try to find any elements with data-testid
  const testIds = await page.locator('[data-testid]').all();
  console.log('Found', testIds.length, 'elements with data-testid');
  
  // Log the first few NetflixCard elements
  if (netflixCards.length > 0) {
    for (let i = 0; i < Math.min(3, netflixCards.length); i++) {
      const card = netflixCards[i];
      const className = await card.getAttribute('class');
      console.log('Card', i, 'class:', className);
    }
  }
});
