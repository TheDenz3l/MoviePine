import { test, expect } from '@playwright/test';

test('Debug modal functionality', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Try to find any elements on the page
  const allDivs = await page.locator('div').all();
  console.log('Total div elements:', allDivs.length);

  // Try to find NetflixCard elements with different selectors
  const netflixCards = await page.locator('div.cursor-pointer').all();
  console.log('Cursor pointer divs:', netflixCards.length);

  const groupCards = await page.locator('div.group').all();
  console.log('Group divs:', groupCards.length);

  const netflixStyleCards = await page.locator('div.relative.flex-shrink-0').all();
  console.log('Netflix style divs:', netflixStyleCards.length);

  // Try to click on the first available card
  if (netflixCards.length > 0) {
    const firstCard = netflixCards[0];
    console.log('Attempting to hover on first card...');
    await firstCard.hover({ timeout: 5000 });
    
    // Try to find and click the info button
    try {
      const infoButton = firstCard.locator('button[aria-label="More info"]').or(firstCard.locator('button[title="More Info"]'));
      console.log('Info button found, clicking...');
      await infoButton.click({ timeout: 10000 });
      
      // Wait for modal
      await page.waitForTimeout(3000);
      
      // Check if modal opened
      const modalTitle = page.getByText('More Like This');
      const isVisible = await modalTitle.isVisible();
      console.log('Modal "More Like This" section visible:', isVisible);
      
      if (isVisible) {
        // Try to find similar tiles
        const tiles = await page.locator('[data-testid="more-like-tile"]').all();
        console.log('Found similar tiles in modal:', tiles.length);
        
        if (tiles.length > 0) {
          const firstTile = tiles[0];
          await firstTile.hover({ timeout: 5000 });
          
          const playButton = firstTile.locator('[data-testid="tile-play"]');
          const playVisible = await playButton.isVisible();
          console.log('Play button visible:', playVisible);
          
          const ratingElement = firstTile.locator('[data-testid="tmdb-rating"]');
          const ratingVisible = await ratingElement.isVisible();
          console.log('Rating visible:', ratingVisible);
        }
      }
    } catch (error) {
      console.log('Error clicking info button:', (error as Error).message);
    }
  } else {
    console.log('No Netflix cards found on page');
  }
});
