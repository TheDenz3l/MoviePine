import { test, expect } from '@playwright/test';

test.describe('Search Overlay Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for the navigation to be visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should open search overlay and display search results', async ({ page }) => {
    // Click the search button in navigation
    await page.click('[data-testid="search-button"], button:has([data-testid="search-icon"]), button:has(svg)');
    
    // Wait for search overlay to open
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Type a search query
    await page.fill('input[placeholder*="Search"]', 'transform');
    
    // Wait for search results to load
    await page.waitForTimeout(2000); // Give time for API call
    
    // Check that search results are displayed
    await expect(page.locator('[data-search-content]')).toBeVisible();
    
    // Verify that movie cards are present
    const movieCards = page.locator('.group.relative.aspect-\\[2\\/3\\]');
    await expect(movieCards.first()).toBeVisible();
  });

  test('should display hover buttons on movie cards', async ({ page }) => {
    // Open search overlay and search
    await page.click('button:has(svg)');
    await page.fill('input[placeholder*="Search"]', 'transform');
    await page.waitForTimeout(2000);
    
    // Find first movie card
    const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
    await expect(firstCard).toBeVisible();
    
    // Hover over the first card
    await firstCard.hover();
    
    // Check that hover overlay appears
    const hoverOverlay = firstCard.locator('.absolute.inset-0.bg-black\\/60');
    await expect(hoverOverlay).toBeVisible();
    
    // Check that all three buttons are visible on hover
    const playButton = firstCard.locator('button[title="Play"]');
    const addToListButton = firstCard.locator('button[title="Add to List"]');
    const infoButton = firstCard.locator('button[title="More Info"]');
    
    await expect(playButton).toBeVisible();
    await expect(addToListButton).toBeVisible();
    await expect(infoButton).toBeVisible();
  });

  test('should handle play button click and open video player', async ({ page }) => {
    // Set up console logging to track our debug messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Open search overlay and search
    await page.click('button:has(svg)');
    await page.fill('input[placeholder*="Search"]', 'transform');
    await page.waitForTimeout(2000);
    
    // Find first movie card and hover
    const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
    await firstCard.hover();
    
    // Click the play button
    const playButton = firstCard.locator('button[title="Play"]');
    await playButton.click();
    
    // Wait a moment for the action to process
    await page.waitForTimeout(1000);
    
    // Check console logs for our debug messages
    const playButtonClicked = consoleMessages.some(msg => 
      msg.includes('🔴 Play button clicked for:')
    );
    const playingMovie = consoleMessages.some(msg => 
      msg.includes('🎬 Playing movie:')
    );
    
    expect(playButtonClicked).toBeTruthy();
    expect(playingMovie).toBeTruthy();
    
    // Check if video player modal opened (look for video player elements)
    const videoPlayerModal = page.locator('[data-testid="video-player-modal"], .video-player, video');
    await expect(videoPlayerModal).toBeVisible({ timeout: 5000 });
  });

  test('should handle info button click and open movie modal', async ({ page }) => {
    // Set up console logging
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Open search overlay and search
    await page.click('button:has(svg)');
    await page.fill('input[placeholder*="Search"]', 'transform');
    await page.waitForTimeout(2000);
    
    // Find first movie card and hover
    const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
    await firstCard.hover();
    
    // Click the info button
    const infoButton = firstCard.locator('button[title="More Info"]');
    await infoButton.click();
    
    // Wait for the action to process
    await page.waitForTimeout(2000);
    
    // Check console logs
    const infoButtonClicked = consoleMessages.some(msg => 
      msg.includes('ℹ️ Info button clicked for:')
    );
    const fetchingTMDB = consoleMessages.some(msg => 
      msg.includes('🔍 Fetching movie details from TMDB')
    );
    
    expect(infoButtonClicked).toBeTruthy();
    expect(fetchingTMDB).toBeTruthy();
    
    // Check if movie detail modal opened
    const movieModal = page.locator('[data-testid="movie-modal"], .movie-detail-modal, [role="dialog"]');
    await expect(movieModal).toBeVisible({ timeout: 10000 });
  });

  test('should handle add to list button click', async ({ page }) => {
    // Set up console logging
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Set up dialog handler for alert
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });
    
    // Open search overlay and search
    await page.click('button:has(svg)');
    await page.fill('input[placeholder*="Search"]', 'transform');
    await page.waitForTimeout(2000);
    
    // Find first movie card and hover
    const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
    await firstCard.hover();
    
    // Click the add to list button
    const addToListButton = firstCard.locator('button[title="Add to List"]');
    await addToListButton.click();
    
    // Wait for the action to process
    await page.waitForTimeout(1000);
    
    // Check console logs
    const addToListClicked = consoleMessages.some(msg => 
      msg.includes('➕ Add to list button clicked for:')
    );
    
    expect(addToListClicked).toBeTruthy();
    
    // Check that alert was shown
    expect(alertMessage).toContain('Added movie');
  });

  test('should handle card click and open movie modal', async ({ page }) => {
    // Set up console logging
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Open search overlay and search
    await page.click('button:has(svg)');
    await page.fill('input[placeholder*="Search"]', 'transform');
    await page.waitForTimeout(2000);
    
    // Find first movie card and click on it (not on buttons)
    const firstCard = page.locator('.group.relative.aspect-\\[2\\/3\\]').first();
    
    // Click on the card itself (center of the card, away from buttons)
    await firstCard.click({ position: { x: 50, y: 50 } });
    
    // Wait for the action to process
    await page.waitForTimeout(2000);
    
    // Check console logs
    const cardClicked = consoleMessages.some(msg => 
      msg.includes('🖱️ Card clicked for:')
    );
    
    expect(cardClicked).toBeTruthy();
    
    // Check if movie detail modal opened
    const movieModal = page.locator('[data-testid="movie-modal"], .movie-detail-modal, [role="dialog"]');
    await expect(movieModal).toBeVisible({ timeout: 10000 });
  });

  test('should close search overlay when clicking outside', async ({ page }) => {
    // Open search overlay
    await page.click('button:has(svg)');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Click outside the search area
    await page.click('body', { position: { x: 10, y: 10 } });
    
    // Search overlay should close
    await expect(page.locator('input[placeholder*="Search"]')).not.toBeVisible();
  });

  test('should handle escape key to close search overlay', async ({ page }) => {
    // Open search overlay
    await page.click('button:has(svg)');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Press escape key
    await page.keyboard.press('Escape');
    
    // Search overlay should close
    await expect(page.locator('input[placeholder*="Search"]')).not.toBeVisible();
  });
});
