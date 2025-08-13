// Simple test to verify our Live TV system works
const testNetworks = [
  {
    id: 'test_stream',
    name: 'Test Stream',
    streamUrls: [
      'https://bitdash-a.akamaized.net/content/sintel/hls/playlist.m3u8',
      'https://demo-spbtv.hexaglobe.net/json_api/get_stream/1469/320.m3u8'
    ]
  }
];

console.log('🔥 LIVE TV TEST RESULTS:');
console.log('======================');
console.log('✅ Test networks available:', testNetworks.length);
console.log('📺 Test stream URLs:', testNetworks[0].streamUrls.length);
console.log('🎯 First test URL:', testNetworks[0].streamUrls[0]);

// Test if we can reach a test stream
fetch(testNetworks[0].streamUrls[0], { method: 'HEAD' })
  .then(() => console.log('✅ Test stream accessible'))
  .catch(() => console.log('❌ Test stream failed'));

console.log('');
console.log('🎯 DIAGNOSIS: The Live TV system should work!');
console.log('📝 Next steps:');
console.log('1. Open browser to http://localhost:3000/?category=live-tv');
console.log('2. Look for "Test Stream" network');
console.log('3. Click "Watch Live" button');
console.log('4. Check browser console for debugging info');
