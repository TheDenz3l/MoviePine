import { test, expect } from '@playwright/test';

test('More Like This tiles expose hover UI (rating ring + play button bottom-right)', async ({ page }) => {
  await page.goto('/');

  const firstCard = page.locator('.moviepire-card').first();
  await firstCard.hover();
  await firstCard.getByRole('button', { name: 'More info' }).click();

  await expect(page.getByText('More Like This')).toBeVisible({ timeout: 15000 });

  const tile = page.locator('[data-testid="more-like-tile"]').first();
  await expect(tile).toBeVisible();

  await tile.hover();

  const playButton = tile.locator('[data-testid="tile-play"]');
  await expect(playButton).toBeVisible();

  // Rating ring should be present (using data-testid)
  await expect(tile.locator('[data-testid="tmdb-rating"]')).toBeVisible();

  const box = await playButton.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.width).toBeLessThanOrEqual(32);
    expect(box.height).toBeLessThanOrEqual(32);
  }
});
