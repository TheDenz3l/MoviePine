import { test, expect } from '@playwright/test';

test('Debug page elements v2', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(10000);

  // Check for specific text that should be on the page
  const trendingText = page.getByText('Trending');
  const popularText = page.getByText('Popular');
  const moviesText = page.getByText('Movies');
  
  console.log('Trending text visible:', await trendingText.isVisible());
  console.log('Popular text visible:', await popularText.isVisible());
  console.log('Movies text visible:', await moviesText.isVisible());

  // Try to find any div with specific classes that should exist
  const allElements = await page.locator('*').all();
  console.log('Total elements:', allElements.length);

  // Try to find elements by more specific selectors
  const carouselElements = await page.locator('[aria-label*="Carousel"]').all();
  console.log('Carousel elements:', carouselElements.length);

  const sectionElements = await page.locator('section').all();
  console.log('Section elements:', sectionElements.length);

  // Try to find images which should be present
  const images = await page.locator('img').all();
  console.log('Image elements:', images.length);

  // Try to find the NetflixCard elements by their specific structure
  const netflixCards = await page.locator('div.relative.flex-shrink-0.cursor-pointer.outline-none.group').all();
  console.log('NetflixCard elements (full selector):', netflixCards.length);

  // Try a broader selector
  const broadCards = await page.locator('div.cursor-pointer, div.group').all();
  console.log('Broad cursor-pointer/group elements:', broadCards.length);
});
