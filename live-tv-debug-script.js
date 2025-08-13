// Live TV Click Debugging Script
// Copy and paste this into the browser console on the Live TV page

(function() {
    console.log('🚀 Starting Live TV Click Debug...');
    
    let debugState = {
        networkClicked: false,
        streamsLoaded: false,
        watchButtonClicked: false,
        modalOpened: false
    };
    
    // Helper function to log state changes
    function logState(action) {
        console.log(`🔍 [${action}] Debug state:`, debugState);
    }
    
    // Function to find and click network
    function findAndClickNetwork() {
        console.log('📺 Looking for network cards...');
        const networkCards = document.querySelectorAll('[class*="cursor-pointer"], .cursor-pointer');
        console.log(`Found ${networkCards.length} network cards`);
        
        if (networkCards.length > 0) {
            console.log('🖱️ Clicking first network...');
            networkCards[0].click();
            debugState.networkClicked = true;
            logState('NETWORK_CLICKED');
            
            // Wait for streams to load
            setTimeout(findAndClickWatchButton, 3000);
        } else {
            console.log('❌ No network cards found');
        }
    }
    
    // Function to find and click Watch Live button
    function findAndClickWatchButton() {
        console.log('🔍 Looking for Watch Live buttons...');
        const watchButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent && btn.textContent.includes('Watch Live') && !btn.disabled
        );
        console.log(`Found ${watchButtons.length} active Watch Live buttons`);
        
        if (watchButtons.length > 0) {
            debugState.streamsLoaded = true;
            logState('STREAMS_LOADED');
            
            console.log('🖱️ About to click Watch Live button...');
            console.log('📺 Button details:', {
                text: watchButtons[0].textContent,
                disabled: watchButtons[0].disabled,
                className: watchButtons[0].className
            });
            
            // Set up monitoring for modal opening
            setupModalMonitoring();
            
            // Click the button
            console.log('🎬 CLICKING WATCH LIVE BUTTON NOW!');
            watchButtons[0].click();
            debugState.watchButtonClicked = true;
            logState('WATCH_BUTTON_CLICKED');
            
        } else {
            console.log('❌ No active Watch Live buttons found');
            // Try again in case they're still loading
            setTimeout(findAndClickWatchButton, 2000);
        }
    }
    
    // Function to monitor for modal opening
    function setupModalMonitoring() {
        console.log('👀 Setting up modal monitoring...');
        
        const checkForModal = () => {
            const videoModal = document.querySelector('[role="dialog"], .fixed.inset-0');
            const videoElement = document.querySelector('video');
            
            if (videoModal || videoElement) {
                debugState.modalOpened = true;
                logState('MODAL_OPENED');
                console.log('✅ SUCCESS: Video player opened!');
                
                if (videoElement) {
                    console.log('📺 Video element details:', {
                        src: videoElement.src,
                        currentSrc: videoElement.currentSrc,
                        readyState: videoElement.readyState,
                        networkState: videoElement.networkState
                    });
                }
                return true;
            }
            return false;
        };
        
        // Check immediately and then repeatedly
        setTimeout(() => {
            if (!checkForModal()) {
                console.log('⏳ Modal not found immediately, checking repeatedly...');
                const intervalId = setInterval(() => {
                    if (checkForModal() || debugState.modalOpened) {
                        clearInterval(intervalId);
                    }
                }, 500);
                
                // Stop checking after 10 seconds
                setTimeout(() => {
                    clearInterval(intervalId);
                    if (!debugState.modalOpened) {
                        console.log('❌ TIMEOUT: Modal did not open within 10 seconds');
                        console.log('🔍 Final state:', debugState);
                        
                        // Check for any error messages or state issues
                        console.log('🔍 Checking for console errors...');
                        console.log('🔍 Current URL:', window.location.href);
                        
                        // Check if any video player state exists
                        const anyModal = document.querySelector('[data-testid="video-player-modal"], .video-player-modal, [class*="modal"]');
                        console.log('🔍 Any modal found:', !!anyModal);
                    }
                }, 10000);
            }
        }, 100);
    }
    
    // Start the test
    console.log('🎬 Starting automated Live TV test in 2 seconds...');
    setTimeout(findAndClickNetwork, 2000);
    
    // Make functions available globally for manual testing
    window.debugLiveTV = {
        findAndClickNetwork,
        findAndClickWatchButton,
        debugState,
        logState
    };
    
    console.log('🔧 Manual functions available: window.debugLiveTV');
})();
