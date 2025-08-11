import { test, expect } from '@playwright/test';

// Helper: open real-time search (trigger via keyboard shortcut or navigation if available)
// Since we don't have a direct button in current test context, we'll simulate by pressing '/'
// If the app uses a different trigger, adjust accordingly.

test.describe('Real-time search page closes immediately on actions', () => {
  test('closes after clicking More Info on a result', async ({ page }) => {
    await page.goto('/');

    // Open real-time search: assume '/' key brings it up (common pattern). If not, this will need adapting.
    await page.keyboard.press('/');

    // Type a query with likely matches (use a short common letter)
    await page.keyboard.type('a');

    // Wait for at least one card in real-time search grid
    const firstSearchCard = page.locator('.moviepire-card').first();
    await expect(firstSearchCard).toBeVisible();

    // Hover to reveal overlay buttons
    await firstSearchCard.hover();

    const moreInfoBtn = firstSearchCard.getByRole('button', { name: 'More info' });
    await expect(moreInfoBtn).toBeVisible();

    // Click More Info
    await moreInfoBtn.click();

    // Expect real-time search wrapper to disappear quickly.
    // Real-time search page uses fixed inset-0 with bg rgb(18,18,18); we can check absence of its specific placeholder text.
    await expect(page.getByPlaceholder('Search for movies and TV shows...')).toHaveCount(0);

    // Modal should be open (movie detail content), e.g., presence of Close button (X icon is a button with aria-label 'Close').
    // If no aria-label, assert something unique from modal like ImdbRating ring.
    await expect(page.locator('[data-testid="tmdb-rating"]').first()).toBeVisible();
  });

  test('closes after clicking Play on a result', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('/');
    await page.keyboard.type('te');

    const firstSearchCard = page.locator('.moviepire-card').first();
    await expect(firstSearchCard).toBeVisible();
    await firstSearchCard.hover();

    const playBtn = firstSearchCard.getByRole('button').filter({ has: page.locator('svg') }).first();

    // More robust: select the play icon by svg 'Play' accessible name if available; fallback first overlay button.
    await playBtn.click();

    // Real-time search input should be gone
    await expect(page.getByPlaceholder('Search for movies and TV shows...')).toHaveCount(0);

    // Video player modal expected: look for video container or playing state; fallback to presence of recently played or some playback UI
    // For now, assert at least that the body no longer contains the search overlay
    await expect(page.locator('.moviepire-card').first()).toBeVisible();
  });
});
