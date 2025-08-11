import { test, expect } from '@playwright/test'

// Assumptions:
// - Home page shows hero then multiple rail sections with headings matching titles.
// - New rails: Trending movies this week, Popular movies, Popular Series, Top Rated Movies, Top Rated Series, On The Air Series
// - Each rail uses MoviepireMovieGrid producing a section with h2.section-title text.
// - Cards have class .moviepire-card (re-using existing selectors from other tests) once movies are loaded.
// - Some rails load asynchronously; we verify eventual presence.

const RAIL_TITLES = [
  'Trending movies this week',
  'Popular movies',
  'Popular Series',
  'Top Rated Movies',
  'Top Rated Series',
  'On The Air Series'
]

test.describe('Home rails layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('hero section remains at top and rails render underneath', async ({ page }) => {
    // Hero title should exist (use large heading). Use :first-of-type h1.
    const heroTitle = page.locator('section.hero-section h1')
    await expect(heroTitle).toBeVisible()

    // First rail heading appears below hero (scroll slightly to ensure in view)
    const firstRail = page.getByRole('heading', { name: 'Trending movies this week' })
    await firstRail.scrollIntoViewIfNeeded()
    await expect(firstRail).toBeVisible({ timeout: 15000 })

    // Ensure hero still visible at top via bounding boxes (optional soft assertion)
    const heroBox = await heroTitle.boundingBox()
    const railBox = await firstRail.boundingBox()
    expect(heroBox && railBox && heroBox.y < railBox.y).toBeTruthy()
  })

  test('all expected rail headings eventually appear', async ({ page }) => {
    for (const title of RAIL_TITLES) {
      await expect(page.getByRole('heading', { name: new RegExp('^' + title) })).toBeVisible({ timeout: 20000 })
    }
  })

  test('each rail has at least one card', async ({ page }) => {
    for (const title of RAIL_TITLES) {
      const heading = page.getByRole('heading', { name: new RegExp('^' + title) })
      await heading.scrollIntoViewIfNeeded()
      await expect(heading).toBeVisible({ timeout: 20000 })
      // Find the section ancestor and within it look for cards
      const section = heading.locator('xpath=ancestor::section[1]')
      const firstCard = section.locator('.moviepire-card').first()
      await expect(firstCard).toBeVisible({ timeout: 20000 })
    }
  })

  test('hovering over a card does not shift hero (layout stability)', async ({ page }) => {
    const hero = page.locator('section.hero-section')
    const heroBoxBefore = await hero.boundingBox()

    // Hover first card in first rail
    const firstRailCard = page.locator('section:has(> h2:has-text("Trending movies this week")) .moviepire-card').first()
    await firstRailCard.scrollIntoViewIfNeeded()
    await firstRailCard.hover()

  const heroBoxAfter = await hero.boundingBox()
  // Assert hero stays near top (y < 5) and maintains substantial height
  expect(heroBoxBefore && heroBoxBefore.y < 5).toBeTruthy()
  expect(heroBoxAfter && heroBoxAfter.y < 5).toBeTruthy()
  // Height should not collapse below 50% of original
  const heightStable = !!(heroBoxBefore && heroBoxAfter && heroBoxAfter.height > heroBoxBefore.height * 0.5)
  expect(heightStable).toBeTruthy()
  })
})
