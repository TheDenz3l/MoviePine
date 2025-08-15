import { test, expect } from '@playwright/test'

// Basic regression: plus -> check toggle persists after reload on a poster.
// Assumes a seed movie grid is visible at /. Adjust selectors to actual DOM if needed.

test.describe('Watchlist toggle', () => {
  test('adds and removes item with persistent visual state', async ({ page }) => {
    await page.goto('/')
    // Find first card toggle button (data-testid recommended; fallback to role+label)
    const toggle = page.locator('[aria-label="Add to Watchlist"]').first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    // After click, aria-label should switch to remove
    const removeToggle = page.locator('[aria-label="Remove from Watchlist"]').first()
    await expect(removeToggle).toBeVisible()

    // Reload and ensure still present (optimistic + server persisted)
    await page.reload()
    await expect(page.locator('[aria-label="Remove from Watchlist"]').first()).toBeVisible()

    // Remove
    await page.locator('[aria-label="Remove from Watchlist"]').first().click()
    await expect(page.locator('[aria-label="Add to Watchlist"]').first()).toBeVisible()
  })
})
