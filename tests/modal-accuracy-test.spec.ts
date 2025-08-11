import { test, expect } from '@playwright/test';

test.describe('Modal Accuracy Investigation', () => {
  test('should display correct movie information in modals', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load with a more forgiving approach
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Give extra time for dynamic content
    
    // Look for the search button in the upper right corner
    // Try different possible selectors for the search button
    const searchSelectors = [
      'button[aria-label*="search" i]',
      'button[title*="search" i]',
      '[data-testid="search-button"]',
      'button:has-text("Search")',
      'button:has(svg)', // Search icon might be an SVG
      '.search-button',
      'header button', // Button in header area
      'nav button' // Button in navigation
    ];
    
    let searchButton = null;
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        searchButton = element;
        console.log(`Found search button with selector: ${selector}`);
        break;
      }
    }
    
    if (!searchButton) {
      // If we can't find a specific search button, let's screenshot and examine the page
      await page.screenshot({ path: 'homepage-debug.png', fullPage: true });
      
      // Look for any clickable elements in the upper right area
      const headerElements = await page.locator('header, nav, .header, .navigation').all();
      for (const header of headerElements) {
        console.log('Header element found:', await header.textContent());
      }
      
      // Look for all buttons on the page
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on the page`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        const buttonVisible = await allButtons[i].isVisible();
        console.log(`Button ${i}: "${buttonText}" (visible: ${buttonVisible})`);
      }
      
      throw new Error('Could not find search button in upper right corner');
    }
    
    // Click the search button
    await searchButton.click();
    
    // Wait for search overlay to appear
    await page.waitForSelector('[data-testid="search-overlay"], .search-overlay, input[placeholder*="search" i]', { timeout: 5000 });
    
    // Find the search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[name*="search"]').first();
    await expect(searchInput).toBeVisible();
    
    // Search for a specific movie to test
    await searchInput.fill('The Matrix');
    
    // Wait for search results
    await page.waitForTimeout(2000);
    
    // Look for movie cards or results
    const movieCards = page.locator('[data-testid="movie-card"], .movie-card, .search-result').first();
    await expect(movieCards).toBeVisible();
    
    // Find and click the info button for the first result
    const infoButton = page.locator('button:has-text("Info"), button[aria-label*="info" i], .info-button').first();
    await infoButton.click();
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="movie-modal"], .modal, .movie-detail-modal', { timeout: 5000 });
    
    // Get the modal content
    const modalTitle = await page.locator('.modal h1, .modal h2, .modal .title, [data-testid="modal-title"]').textContent();
    console.log('Modal title:', modalTitle);
    
    // Verify the modal shows Matrix-related content
    expect(modalTitle?.toLowerCase()).toContain('matrix');
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'modal-test-matrix.png' });
    
    // Close the modal
    const closeButton = page.locator('button:has-text("×"), button:has-text("Close"), .close-button, [aria-label*="close" i]').first();
    await closeButton.click();
    
    // Test another movie to verify consistency
    await searchInput.fill('Inception');
    await page.waitForTimeout(2000);
    
    // Click info on another movie
    const secondInfoButton = page.locator('button:has-text("Info"), button[aria-label*="info" i], .info-button').first();
    await secondInfoButton.click();
    
    // Wait for modal
    await page.waitForSelector('[data-testid="movie-modal"], .modal, .movie-detail-modal', { timeout: 5000 });
    
    // Get modal content for second movie
    const secondModalTitle = await page.locator('.modal h1, .modal h2, .modal .title, [data-testid="modal-title"]').textContent();
    console.log('Second modal title:', secondModalTitle);
    
    // Verify it shows Inception-related content, not Matrix
    expect(secondModalTitle?.toLowerCase()).toContain('inception');
    expect(secondModalTitle?.toLowerCase()).not.toContain('matrix');
    
    // Take screenshot for comparison
    await page.screenshot({ path: 'modal-test-inception.png' });
  });
  
  test('should investigate header structure', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Take a full page screenshot to see the layout
    await page.screenshot({ path: 'full-page-layout.png', fullPage: true });
    
    // Get all text content from the page to understand structure
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 500));
    
    // Check for common header elements
    const headerElements = await page.locator('header, .header, nav, .navigation, .top-bar').all();
    console.log(`Found ${headerElements.length} potential header elements`);
    
    // Look specifically in the upper right area
    const upperRightElements = await page.locator('div:nth-child(n):has(button)').all();
    for (let i = 0; i < Math.min(upperRightElements.length, 5); i++) {
      const boundingBox = await upperRightElements[i].boundingBox();
      if (boundingBox && boundingBox.x > 500) { // Elements on the right side
        const content = await upperRightElements[i].textContent();
        console.log(`Right-side element: "${content}"`);
      }
    }
  });
});
