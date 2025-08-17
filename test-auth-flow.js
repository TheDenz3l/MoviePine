#!/usr/bin/env node

const { execSync } = require('child_process');

// Function to get direct auth link
async function getDirectAuthLink() {
  try {
    const result = execSync(`curl -s -X POST "http://localhost:3000/api/auth/direct-auth" -H "Content-Type: application/json" -d '{"email":"unlockfreedom1@gmail.com"}'`, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    console.error('Error getting auth link:', error);
    return null;
  }
}

// Function to extract session from magic link
async function extractSessionFromMagicLink(actionLink) {
  try {
    // Extract the token from the magic link
    const url = new URL(actionLink);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.error('No token found in magic link');
      return null;
    }

    // Simulate clicking the magic link by making a request to it
    const result = execSync(`curl -s -L "${actionLink}"`, { encoding: 'utf8' });
    
    // Look for session tokens in cookies or response
    console.log('Magic link response received');
    
    // For now, let's try to use the Supabase API directly to verify the token
    console.log('Token extracted:', token);
    return token;
  } catch (error) {
    console.error('Error extracting session:', error);
    return null;
  }
}

// Main test function
async function testAuthFlow() {
  console.log('=== Testing Auth Flow ===');
  
  // Step 1: Get direct auth link
  console.log('1. Getting direct auth link...');
  const authResponse = await getDirectAuthLink();
  
  if (!authResponse || !authResponse.success) {
    console.error('Failed to get auth link:', authResponse);
    return;
  }
  
  console.log('Auth link generated:', authResponse.actionLink);
  
  // Step 2: Test the /api/me/sessions endpoint without authentication
  console.log('\n2. Testing /api/me/sessions without auth...');
  try {
    const result = execSync(`curl -s -X GET "http://localhost:3000/api/me/sessions"`, { encoding: 'utf8' });
    console.log('Unauthenticated response:', result);
  } catch (error) {
    console.log('Expected error for unauthenticated request');
  }
  
  // Step 3: Try to get session info using Supabase admin API
  console.log('\n3. Instructions for manual testing:');
  console.log('Open this link in your browser to authenticate:');
  console.log(authResponse.actionLink);
  console.log('\nAfter authentication, check browser cookies for session tokens.');
  console.log('Then test: curl -H "Authorization: Bearer <token>" http://localhost:3000/api/me/sessions');
}

testAuthFlow().catch(console.error);
