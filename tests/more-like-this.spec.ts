import { test, expect } from '@playwright/test';

test('More Like This tiles expose hover UI (rating ring + play button bottom-right)', async ({ page }) => {
  await page.goto('/');
  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Find NetflixCard elements with more flexible selectors
  let firstCard;
  try {
    // Try the main selector first
    firstCard = page.locator('div.cursor-pointer.group').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
  } catch (error) {
    // Fallback to any NetflixCard-like element
    firstCard = page.locator('div.relative.flex-shrink-0.cursor-pointer').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
  }

  // Wait a bit more for all elements to be ready
  await page.waitForTimeout(1000);

  await firstCard.hover({ timeout: 5000 });
  // Click the "More info" button within the card
  await firstCard.locator('button[aria-label="More info"]').or(firstCard.locator('button[title="More Info"]')).click({ timeout: 10000 });

  // Wait for the modal to open and "More Like This" section to be visible
  await expect(page.getByText('More Like This')).toBeVisible({ timeout: 20000 });

  // Wait for similar movies to load
  await page.waitForTimeout(3000);

  // Now find the "More Like This" tiles within the modal
  const tile = page.locator('[data-testid="more-like-tile"]').first();
  await expect(tile).toBeVisible({ timeout: 15000 });

  // Hover over the tile to reveal the controls
  await tile.hover({ timeout: 5000 });

  // Check that the play button is visible
  const playButton = tile.locator('[data-testid="tile-play"]');
  await expect(playButton).toBeVisible({ timeout: 10000 });

  // Check that the rating ring is visible
  await expect(tile.locator('[data-testid="tmdb-rating"]')).toBeVisible({ timeout: 10000 });

  // Verify the play button size
  const box = await playButton.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.width).toBeLessThanOrEqual(40);
    expect(box.height).toBeLessThanOrEqual(40);
  }
});
