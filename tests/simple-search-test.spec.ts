import { test, expect } from '@playwright/test';

test.describe('Search Overlay Button Fix Test', () => {
  test('should open search overlay and test info button click', async ({ page }) => {
    // Set up console logging to track our debug messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Find and click the search button (look for any button with svg/search icon)
    const searchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await searchButton.click();
    
    // Wait for search overlay to open and input to be visible
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Type a search query
    await page.fill('input[placeholder*="Search"]', 'inception');
    
    // Wait for search results to load
    await page.waitForTimeout(3000);
    
    // Find first movie card
    const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
    await expect(firstCard).toBeVisible();
    
    // Hover over the card to show buttons
    await firstCard.hover();
    
    // Wait for hover overlay to appear
    await page.waitForTimeout(500);
    
    // Click the info button (the "i" button)
    const infoButton = firstCard.locator('button[title="More Info"]');
    await expect(infoButton).toBeVisible();
    await infoButton.click();
    
    // Wait for the action to complete
    await page.waitForTimeout(2000);
    
    // Check console logs for our debug messages
    const hasInfoClick = consoleMessages.some(msg => 
      msg.includes('ℹ️ Info button clicked for:')
    );
    const hasTMDBFetch = consoleMessages.some(msg => 
      msg.includes('🔍 Fetching movie details from TMDB')
    );
    
    // Log all console messages for debugging
    console.log('Console messages:', consoleMessages);
    
    // Assertions
    expect(hasInfoClick).toBeTruthy();
    expect(hasTMDBFetch).toBeTruthy();
    
    // Check if modal opened (look for common modal patterns)
    const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });
});
