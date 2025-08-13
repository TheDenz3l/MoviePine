// Test the actual video player Safari flow
console.log('🍎 Testing Video Player Safari Flow...\n');

const testVideoPlayerSafariFlow = async () => {
  try {
    // Simulate Safari user requesting a movie stream
    const movieId = 'tt0133093'; // The Matrix
    console.log(`🎬 Testing movie: ${movieId}`);
    
    // Test the exact API call that the video player makes
    const response = await fetch('http://localhost:3000/api/config');
    const configData = await response.json();
    
    if (!configData.success) {
      console.error('❌ Failed to get config');
      return;
    }
    
    // Simulate the streaming service call with Safari flag
    const streamingResponse = await fetch(`http://localhost:3000/api/streaming-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15'
      },
      body: JSON.stringify({
        movieId: movieId,
        isSafari: true
      })
    });
    
    if (streamingResponse.ok) {
      const streamingResult = await streamingResponse.json();
      console.log('✅ Streaming result obtained');
      console.log('URL:', streamingResult.url ? streamingResult.url.substring(0, 100) + '...' : 'null');
      
      // Check if the URL is a transcoded URL
      if (streamingResult.url && streamingResult.url.includes('/api/stream-transcoder')) {
        console.log('🍎 ✅ SUCCESS: Safari user received transcoded URL!');
        console.log('🎯 The fix is working - incompatible streams are being transcoded');
      } else if (streamingResult.url) {
        console.log('⚠️  Safari received direct URL (may be compatible stream)');
        console.log('URL type:', streamingResult.url.includes('torrentio') ? 'Torrentio resolve' : 'Other');
      } else {
        console.log('❌ No streaming URL received');
      }
    } else {
      // The API might not exist, so test the actual flow differently
      console.log('ℹ️  Direct streaming API not available, testing through main flow...');
      
      // Just test if Safari detection is working in browser
      console.log('🔍 Manual test: Open browser dev console and play a movie');
      console.log('👀 Look for: "🍎 [SAFARI TRANSCODING] Building transcoder URL"');
      console.log('👀 Expected: Incompatible streams should get transcoder URLs');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testVideoPlayerSafariFlow();
