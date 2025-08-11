// Test script to verify the "Trending This Week" modal fix
// This script can be run in the browser console to test the functionality

console.log('🧪 Testing "Trending This Week" modal functionality...')

// Function to simulate clicking info buttons on trending movies
function testTrendingInfoButtons() {
  console.log('🔍 Looking for trending section...')
  
  // Find the trending section
  const trendingSection = document.querySelector('[aria-label="Trending This Week Carousel"]')
  if (!trendingSection) {
    console.error('❌ Trending This Week section not found')
    return
  }
  
  console.log('✅ Found trending section')
  
  // Find all movie cards in the trending section
  const movieCards = trendingSection.querySelectorAll('[data-testid]:not([data-testid=""])')
  console.log(`📊 Found ${movieCards.length} movie cards in trending section`)
  
  if (movieCards.length === 0) {
    // Try alternative selector
    const allCards = trendingSection.querySelectorAll('.group')
    console.log(`📊 Alternative: Found ${allCards.length} cards with .group class`)
  }
  
  // Find info buttons
  const infoButtons = trendingSection.querySelectorAll('button[aria-label="More info"]')
  console.log(`🔘 Found ${infoButtons.length} info buttons`)
  
  if (infoButtons.length > 0) {
    console.log('🎯 Testing first info button...')
    const firstButton = infoButtons[0]
    
    // Simulate hover to show buttons
    const card = firstButton.closest('.group')
    if (card) {
      card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    }
    
    // Click the info button
    firstButton.click()
    
    // Check if modal opened
    setTimeout(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')
      if (modal) {
        console.log('✅ Modal opened successfully!')
      } else {
        console.error('❌ Modal did not open')
      }
    }, 500)
  } else {
    console.error('❌ No info buttons found')
  }
}

// Run the test
testTrendingInfoButtons()

// Also log current state for debugging
console.log('📋 Current page state:')
console.log('- URL:', window.location.href)
console.log('- Title:', document.title)

// Wait for React components to load
setTimeout(() => {
  console.log('🔄 Running test again after delay...')
  testTrendingInfoButtons()
}, 2000)
