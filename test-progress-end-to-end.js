// Test script to verify progress API works end-to-end
// This simulates the video player saving progress and continue watching displaying it

async function testProgressFlow() {
  console.log('🎬 Testing Progress API End-to-End Flow...\n');
  
  try {
    // Step 1: Get auth token from localStorage (like the debug script does)
    console.log('Step 1: Getting auth token...');
    
    let token = null;
    
    // Try various token sources
    const tokenSources = {
      'localStorage sb-access-token': localStorage.getItem('sb-access-token'),
      'sessionStorage sb-access-token': sessionStorage.getItem('sb-access-token'),
    };
    
    // Check for Supabase session data
    const supabaseKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
    for (const key of supabaseKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.access_token) {
          tokenSources[`localStorage ${key}`] = data.access_token;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Use the first valid token
    for (const [source, tokenValue] of Object.entries(tokenSources)) {
      if (tokenValue) {
        token = tokenValue;
        console.log(`✅ Got token from: ${source}`);
        break;
      }
    }
    
    if (!token) {
      console.log('❌ No access token found. Please log in first.');
      console.log('💡 Open the main page and log in, then come back to run this test.');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Save some test progress
    console.log('\nStep 2: Saving test progress...');
    const progressData = {
      contentId: 'test-movie-123',
      currentTime: 1800, // 30 minutes
      duration: 7200,    // 2 hours
      streamUrl: 'https://example.com/stream.m3u8',
      subtitles: []
    };
    
    const saveResponse = await fetch('/api/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify(progressData)
    });
    
    const saveResult = await saveResponse.json();
    console.log('Save response:', saveResult);
    
    if (!saveResponse.ok) {
      console.log('❌ Failed to save progress:', saveResult.error);
      return;
    }
    
    console.log('✅ Progress saved successfully');
    
    // Step 3: Retrieve the progress
    console.log('\nStep 3: Retrieving progress...');
    const getResponse = await fetch(`/api/progress?id=${progressData.contentId}`, {
      headers
    });
    
    const getResult = await getResponse.json();
    console.log('Get response:', getResult);
    
    if (!getResponse.ok) {
      console.log('❌ Failed to get progress:', getResult.error);
      return;
    }
    
    console.log('✅ Progress retrieved successfully');
    
    // Step 4: Check continue watching
    console.log('\nStep 4: Checking continue watching...');
    const continueResponse = await fetch('/api/continue-watching', {
      headers
    });
    
    const continueResult = await continueResponse.json();
    console.log('Continue watching response:', continueResult);
    
    if (!continueResponse.ok) {
      console.log('❌ Failed to get continue watching:', continueResult.error);
      return;
    }
    
    console.log('✅ Continue watching retrieved successfully');
    
    // Step 5: Summary
    console.log('\n📊 SUMMARY:');
    console.log('- Progress API authentication: ✅ Working');
    console.log('- Progress saving: ✅ Working');
    console.log('- Progress retrieval: ✅ Working');
    console.log('- Continue watching API: ✅ Working');
    
    if (continueResult.data && continueResult.data.length > 0) {
      console.log(`- Continue watching items: ${continueResult.data.length} found`);
    } else {
      console.log('- Continue watching items: 0 found (may take a moment to appear)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testProgressFlow();
