// Comprehensive Live TV Debug Test
// Paste this into browser console on the Live TV page to get detailed debugging

(function() {
    console.clear();
    console.log('🚀 Starting Comprehensive Live TV Debug...');
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    let testState = {
        networksFound: 0,
        networkClicked: false,
        streamsFound: 0,
        buttonClicked: false,
        modalOpened: false,
        videoElementFound: false,
        errors: []
    };
    
    function logStep(step, success, details = '') {
        const status = success ? '✅' : '❌';
        const message = `${status} ${step}${details ? ': ' + details : ''}`;
        console.log(message);
        return success;
    }
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async function runFullTest() {
        try {
            // Step 1: Check page state
            logStep('Page loaded', true, window.location.href);
            
            // Step 2: Wait for React to load
            await delay(3000);
            logStep('Waiting for React components', true);
            
            // Step 3: Find network cards
            const networkCards = document.querySelectorAll('[class*="cursor-pointer"], .cursor-pointer');
            testState.networksFound = networkCards.length;
            logStep('Networks found', networkCards.length > 0, `${networkCards.length} networks`);
            
            if (networkCards.length === 0) {
                // Check for alternative selectors
                const altNetworks = document.querySelectorAll('.bg-gray-900, [class*="network"], [class*="card"]');
                logStep('Alternative network elements', altNetworks.length > 0, `${altNetworks.length} found`);
                
                // Check if page is still loading
                const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], .animate-spin');
                logStep('Loading indicators', loadingElements.length > 0, `${loadingElements.length} loading elements`);
                
                return;
            }
            
            // Step 4: Click first network
            console.log('🖱️ Clicking first network...');
            networkCards[0].click();
            testState.networkClicked = true;
            logStep('Network clicked', true, networkCards[0].textContent?.trim().substring(0, 30));
            
            // Step 5: Wait for streams to load
            await delay(4000);
            
            // Step 6: Find Watch Live buttons
            const watchButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.textContent && btn.textContent.includes('Watch Live') && !btn.disabled
            );
            testState.streamsFound = watchButtons.length;
            logStep('Watch Live buttons found', watchButtons.length > 0, `${watchButtons.length} active buttons`);
            
            if (watchButtons.length === 0) {
                // Debug: Check for any buttons
                const allButtons = document.querySelectorAll('button');
                console.log('🔍 All buttons found:', Array.from(allButtons).map(b => b.textContent?.trim()));
                
                // Check for disabled buttons
                const disabledButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                    btn.textContent && btn.textContent.includes('Watch Live') && btn.disabled
                );
                logStep('Disabled Watch Live buttons', disabledButtons.length > 0, `${disabledButtons.length} disabled`);
                
                return;
            }
            
            // Step 7: Set up monitoring before click
            const startModalCount = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid="video-player-modal"]').length;
            const startVideoCount = document.querySelectorAll('video').length;
            
            console.log('📊 Pre-click state:', {
                modals: startModalCount,
                videos: startVideoCount,
                currentURL: window.location.href
            });
            
            // Step 8: Click Watch Live button with detailed monitoring
            console.log('🎬 About to click Watch Live button...');
            console.log('📺 Button details:', {
                text: watchButtons[0].textContent,
                className: watchButtons[0].className,
                disabled: watchButtons[0].disabled,
                offsetParent: !!watchButtons[0].offsetParent
            });
            
            // Add event listener to catch any errors
            window.addEventListener('error', (e) => {
                testState.errors.push(e.message);
                console.error('🚨 Error caught:', e.message, e.filename, e.lineno);
            });
            
            // Click the button
            watchButtons[0].click();
            testState.buttonClicked = true;
            logStep('Watch Live button clicked', true);
            
            // Step 9: Monitor for changes
            let checkCount = 0;
            const maxChecks = 20; // 10 seconds
            
            const monitor = setInterval(() => {
                checkCount++;
                
                const modals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid="video-player-modal"]');
                const videos = document.querySelectorAll('video');
                
                console.log(`🔍 Check ${checkCount}: Modals=${modals.length}, Videos=${videos.length}`);
                
                if (modals.length > startModalCount || videos.length > startVideoCount) {
                    clearInterval(monitor);
                    testState.modalOpened = modals.length > startModalCount;
                    testState.videoElementFound = videos.length > startVideoCount;
                    
                    logStep('Modal appeared', testState.modalOpened);
                    logStep('Video element appeared', testState.videoElementFound);
                    
                    if (videos.length > 0) {
                        const video = videos[videos.length - 1]; // Latest video
                        console.log('📺 Video details:', {
                            src: video.src,
                            currentSrc: video.currentSrc,
                            readyState: video.readyState,
                            networkState: video.networkState,
                            error: video.error
                        });
                    }
                    
                    console.log('✅ SUCCESS: Video player detected!');
                    printSummary();
                    return;
                }
                
                if (checkCount >= maxChecks) {
                    clearInterval(monitor);
                    logStep('Timeout reached', false, '10 seconds elapsed');
                    printSummary();
                }
            }, 500);
            
        } catch (error) {
            console.error('🚨 Test error:', error);
            testState.errors.push(error.message);
            printSummary();
        }
    }
    
    function printSummary() {
        console.log('\n📊 TEST SUMMARY:');
        console.log('==================');
        Object.entries(testState).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });
        
        if (testState.errors.length > 0) {
            console.log('\n🚨 ERRORS:');
            testState.errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
        }
        
        // Diagnostic info
        console.log('\n🔍 DIAGNOSTIC INFO:');
        console.log('Current URL:', window.location.href);
        console.log('React detected:', !!(window.React || document.querySelector('[data-reactroot]')));
        console.log('Console errors present:', !!window.onerror);
        
        // Check localStorage for any relevant data
        try {
            const keys = Object.keys(localStorage).filter(k => k.includes('movie') || k.includes('video') || k.includes('stream'));
            if (keys.length > 0) {
                console.log('Relevant localStorage keys:', keys);
            }
        } catch (e) {
            console.log('Could not access localStorage');
        }
    }
    
    // Make functions available globally
    window.liveDebug = {
        runFullTest,
        testState,
        printSummary
    };
    
    console.log('🔧 Starting test in 2 seconds...');
    console.log('🔧 Manual controls: window.liveDebug.runFullTest()');
    
    setTimeout(runFullTest, 2000);
})();
