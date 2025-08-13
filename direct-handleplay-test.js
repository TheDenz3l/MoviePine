// Direct handlePlay Test Script
// Run this in the browser console on any page to test the video player modal

console.log('🧪 Testing direct handlePlay function...');

// Try to find the handlePlay function in the global scope or React dev tools
function testDirectHandlePlay() {
    const testUrl = '/api/stream-transcoder?url=' + encodeURIComponent('https://fl1.moveonjoy.com/ABC_EAST/index.m3u8');
    const testTitle = 'Test Live Stream';
    
    console.log('🎬 Testing with URL:', testUrl);
    console.log('🎬 Testing with title:', testTitle);
    
    // Try to access React component state
    try {
        // Find the React root element
        const appElement = document.querySelector('#__next') || document.querySelector('.app') || document.body;
        
        if (appElement && appElement._reactInternalInstance) {
            console.log('✅ Found React instance');
        } else if (appElement && appElement._reactInternalFiber) {
            console.log('✅ Found React fiber');
        } else {
            console.log('❌ Could not find React instance');
        }
        
        // Try to trigger a modal open by simulating the state
        console.log('🎬 Attempting to simulate modal open...');
        
        // Check if there's already a modal state
        const existingModal = document.querySelector('[data-testid="video-player-modal"], .video-player-modal, [role="dialog"]');
        console.log('Existing modal found:', !!existingModal);
        
        // Try to directly manipulate the DOM to see if the modal would work
        if (existingModal) {
            console.log('✅ Modal element exists, trying to make it visible');
            existingModal.style.display = 'block';
            existingModal.style.visibility = 'visible';
            existingModal.style.opacity = '1';
        }
        
    } catch (error) {
        console.log('❌ Error accessing React:', error);
    }
    
    // Alternative: Try to create a custom event
    console.log('🎬 Trying custom event approach...');
    const customEvent = new CustomEvent('testLiveTV', {
        detail: { url: testUrl, title: testTitle }
    });
    document.dispatchEvent(customEvent);
}

// Run the test
testDirectHandlePlay();

// Also provide manual trigger
console.log('🔧 Run testDirectHandlePlay() to test again');
window.testDirectHandlePlay = testDirectHandlePlay;
