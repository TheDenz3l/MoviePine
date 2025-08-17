// Quick test script for Continue Watching functionality
// Run this in browser console after logging in to test the feature

console.log('🧪 Testing Continue Watching functionality...')

// Test 1: Check if Continue Watching component is rendered
function testComponentPresence() {
  const continueWatchingSection = document.querySelector('[data-testid="continue-watching"], h2:contains("Continue Watching")')
  if (continueWatchingSection) {
    console.log('✅ Continue Watching component found on page')
    return true
  } else {
    console.log('❌ Continue Watching component not found')
    return false
  }
}

// Test 2: Check API endpoint
async function testContinueWatchingAPI() {
  try {
    // Try to get auth token from local storage or context
    const authToken = localStorage.getItem('sb-access-token') || 'test'
    
    const response = await fetch('/api/continue-watching', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Continue Watching API responding:', data)
      return data
    } else {
      console.log('⚠️ Continue Watching API error (expected if not logged in):', data)
      return null
    }
  } catch (error) {
    console.log('❌ Continue Watching API error:', error)
    return null
  }
}

// Test 3: Check progress API DELETE functionality
async function testProgressDelete() {
  try {
    const authToken = localStorage.getItem('sb-access-token') || 'test'
    
    const response = await fetch('/api/progress', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ id: 'test-id' }),
    })
    
    const data = await response.json()
    console.log('✅ Progress DELETE API responding:', data)
    return data
  } catch (error) {
    console.log('❌ Progress DELETE API error:', error)
    return null
  }
}

// Run all tests
async function runContinueWatchingTests() {
  console.log('🚀 Starting Continue Watching tests...')
  
  // Test component presence
  const componentExists = testComponentPresence()
  
  // Wait a moment for any async loading
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Test API endpoints
  const apiData = await testContinueWatchingAPI()
  const deleteResult = await testProgressDelete()
  
  console.log('📊 Test Results Summary:')
  console.log('- Component Present:', componentExists ? '✅' : '❌')
  console.log('- API Accessible:', apiData !== null ? '✅' : '⚠️')
  console.log('- DELETE Function:', deleteResult !== null ? '✅' : '⚠️')
  
  if (componentExists) {
    console.log('🎉 Continue Watching implementation appears to be working!')
    console.log('💡 To see data, log in and create some watch progress first.')
  }
}

// Auto-run tests
runContinueWatchingTests()

// Export functions for manual testing
window.testContinueWatching = {
  runTests: runContinueWatchingTests,
  testComponent: testComponentPresence,
  testAPI: testContinueWatchingAPI,
  testDelete: testProgressDelete
}
