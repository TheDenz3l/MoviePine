#!/usr/bin/env node

const { execSync } = require('child_process');

// Function to create a session using Supabase admin API
async function createTestSession() {
  try {
    console.log('Creating test session using Supabase admin API...');
    
    // Use the direct auth endpoint to get a magic link
    const authResponse = JSON.parse(execSync(`curl -s -X POST "http://localhost:3000/api/auth/direct-auth" -H "Content-Type: application/json" -d '{"email":"unlockfreedom1@gmail.com"}'`, { encoding: 'utf8' }));
    
    if (!authResponse.success) {
      throw new Error('Failed to get auth link: ' + JSON.stringify(authResponse));
    }
    
    const actionLink = authResponse.actionLink;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token');
    
    console.log('Magic link token extracted:', token);
    
    // Now let's create a test session by simulating the token verification
    // We'll make a request to our own API to handle the token exchange
    
    return token;
  } catch (error) {
    console.error('Error creating test session:', error);
    return null;
  }
}

// Function to test with a mock access token  
async function testWithMockToken() {
  console.log('=== Testing with Mock Authorization ===');
  
  // Create a simple test token (this won't work with real Supabase but will test our header parsing)
  const mockToken = 'test-token-12345';
  
  try {
    const result = execSync(`curl -s -X GET "http://localhost:3000/api/me/sessions" -H "Authorization: Bearer ${mockToken}"`, { encoding: 'utf8' });
    console.log('Mock token response:', result);
  } catch (error) {
    console.error('Mock token test failed:', error);
  }
}

// Function to test the endpoint behavior
async function runTests() {
  console.log('=== API Authentication Tests ===\n');
  
  // Test 1: No authentication
  console.log('Test 1: No authentication');
  try {
    const result = execSync(`curl -s -X GET "http://localhost:3000/api/me/sessions"`, { encoding: 'utf8' });
    console.log('Response:', result);
  } catch (error) {
    console.log('Error (expected):', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Invalid bearer token
  console.log('Test 2: Invalid bearer token');
  try {
    const result = execSync(`curl -s -X GET "http://localhost:3000/api/me/sessions" -H "Authorization: Bearer invalid-token"`, { encoding: 'utf8' });
    console.log('Response:', result);
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Create and test with real session
  console.log('Test 3: Creating real session token...');
  const token = await createTestSession();
  
  if (token) {
    console.log('Token created, testing magic link verification...');
    // Note: For a complete test, you'd need to follow the magic link in a browser
    // or implement the full OAuth flow programmatically
  }
  
  console.log('\n=== Manual Testing Instructions ===');
  console.log('1. Open the magic link in a browser');
  console.log('2. Check browser dev tools for session cookies');
  console.log('3. Copy the access token from the cookie or local storage');
  console.log('4. Test with: curl -H "Authorization: Bearer <real-token>" http://localhost:3000/api/me/sessions');
}

runTests().catch(console.error);
