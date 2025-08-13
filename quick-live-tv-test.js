// Quick Live TV Test Script
// Run this in browser console when on the Live TV page

(function testLiveTVFlow() {
    console.clear();
    console.log('🔧 Quick Live TV Test Starting...');
    
    // Test 1: Check if we're on the right page
    console.log('1. Current URL:', window.location.href);
    
    // Test 2: Check for React components
    const reactRoot = document.querySelector('[data-reactroot]') || document.getElementById('__next');
    console.log('2. React app found:', !!reactRoot);
    
    // Test 3: Look for Live TV specific elements
    const liveTVElements = {
        networkCards: document.querySelectorAll('[class*="cursor-pointer"], .cursor-pointer'),
        watchButtons: Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent && btn.textContent.includes('Watch Live')),
        liveButtons: document.querySelectorAll('button[class*="live"], [data-testid*="live"]'),
        streamElements: document.querySelectorAll('[class*="stream"], [data-testid*="stream"]')
    };
    
    console.log('3. Live TV Elements:', {
        networkCards: liveTVElements.networkCards.length,
        watchButtons: liveTVElements.watchButtons.length,
        liveButtons: liveTVElements.liveButtons.length,
        streamElements: liveTVElements.streamElements.length
    });
    
    // Test 4: Check for modals and video elements
    const mediaElements = {
        modals: document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]'),
        videos: document.querySelectorAll('video'),
        players: document.querySelectorAll('[class*="video-player"], [data-testid*="player"]')
    };
    
    console.log('4. Media Elements:', {
        modals: mediaElements.modals.length,
        videos: mediaElements.videos.length,
        players: mediaElements.players.length
    });
    
    // Test 5: Direct test if we have Watch Live buttons
    if (liveTVElements.watchButtons.length > 0) {
        console.log('5. Found Watch Live buttons! Testing first one...');
        const button = liveTVElements.watchButtons[0];
        console.log('Button details:', {
            text: button.textContent?.trim(),
            disabled: button.disabled,
            visible: button.offsetParent !== null,
            className: button.className
        });
        
        // Add a click listener to see what happens
        const originalClick = button.onclick;
        console.log('Original onclick:', originalClick);
        
        // Test click
        console.log('🎬 Simulating click...');
        button.click();
        
        // Check for changes after a short delay
        setTimeout(() => {
            const newModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]');
            const newVideos = document.querySelectorAll('video');
            console.log('📊 After click:', {
                modals: newModals.length,
                videos: newVideos.length,
                change: newModals.length > mediaElements.modals.length || newVideos.length > mediaElements.videos.length
            });
        }, 1000);
        
    } else {
        console.log('5. No Watch Live buttons found. Available buttons:');
        const allButtons = document.querySelectorAll('button');
        Array.from(allButtons).forEach((btn, i) => {
            console.log(`   ${i}: "${btn.textContent?.trim()}" (${btn.disabled ? 'disabled' : 'enabled'})`);
        });
    }
    
    // Test 6: Check console for any errors
    const errorCount = window.onerror ? 1 : 0;
    console.log('6. Error handler present:', !!window.onerror);
    
    console.log('✅ Test complete. Check the logs above for details.');
    
    // Return useful functions for manual testing
    return {
        clickFirstButton: () => {
            const btn = liveTVElements.watchButtons[0];
            if (btn) {
                console.log('🖱️ Manual click triggered');
                btn.click();
                return true;
            }
            return false;
        },
        getElements: () => liveTVElements,
        refreshTest: () => testLiveTVFlow()
    };
})();
