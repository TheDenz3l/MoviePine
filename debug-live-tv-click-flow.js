// Debug Live TV Click Flow
// Copy and paste this into browser console on the Live TV page

(function debugLiveTVFlow() {
    console.clear();
    console.log('🔧 Live TV Click Flow Debugger');
    console.log('📍 Current URL:', window.location.href);
    
    // Step 1: Check if we're on the Live TV page
    if (!window.location.href.includes('live-tv')) {
        console.log('❌ Not on Live TV page, navigating...');
        window.location.href = '/?category=live-tv';
        return;
    }
    
    console.log('✅ On Live TV page');
    
    // Step 2: Find network cards
    const networkCards = document.querySelectorAll('.cursor-pointer');
    console.log(`📺 Found ${networkCards.length} network cards`);
    
    if (networkCards.length === 0) {
        console.log('❌ No network cards found. Waiting 3 seconds and retrying...');
        setTimeout(() => debugLiveTVFlow(), 3000);
        return;
    }
    
    // Step 3: Click first network
    const firstNetwork = networkCards[0];
    const networkText = firstNetwork.textContent?.trim();
    console.log(`🖱️ Clicking network: ${networkText}`);
    
    // Monitor for console logs
    const originalLog = console.log;
    const logMessages = [];
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('[DEBUG]') || message.includes('🎬')) {
            logMessages.push({
                timestamp: Date.now(),
                message: message
            });
        }
        return originalLog.apply(console, args);
    };
    
    // Click the network
    firstNetwork.click();
    
    // Step 4: Wait for streams to load and check for Watch Live buttons
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        
        const watchButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent && btn.textContent.includes('Watch Live')
        );
        
        console.log(`⏰ Check ${checkCount}: ${watchButtons.length} Watch Live buttons found`);
        
        if (watchButtons.length > 0) {
            clearInterval(checkInterval);
            console.log('✅ Watch Live buttons found!');
            
            // Step 5: Test clicking the first Watch Live button
            const watchButton = watchButtons[0];
            console.log('🎬 About to click Watch Live button...');
            
            // Monitor React state and DOM changes
            let initialModalCount = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]').length;
            let initialVideoCount = document.querySelectorAll('video').length;
            
            console.log('📊 Before click:', { 
                modals: initialModalCount, 
                videos: initialVideoCount,
                bodyClasses: document.body.className,
                timestamp: Date.now()
            });
            
            // Clear captured logs
            logMessages.length = 0;
            
            // Click the Watch Live button
            watchButton.click();
            
            // Check for changes every 500ms for 5 seconds
            let changeCheckCount = 0;
            const changeInterval = setInterval(() => {
                changeCheckCount++;
                
                const currentModalCount = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]').length;
                const currentVideoCount = document.querySelectorAll('video').length;
                
                console.log(`📊 Check ${changeCheckCount} (${changeCheckCount * 500}ms after click):`, {
                    modals: currentModalCount,
                    videos: currentVideoCount,
                    modalChange: currentModalCount > initialModalCount,
                    videoChange: currentVideoCount > initialVideoCount,
                    bodyClasses: document.body.className
                });
                
                // Show captured debug logs
                if (logMessages.length > 0) {
                    console.log('📝 Debug messages captured:');
                    logMessages.forEach((log, i) => {
                        console.log(`   ${i+1}. ${log.message}`);
                    });
                    logMessages.length = 0; // Clear after showing
                }
                
                if (changeCheckCount >= 10) { // Stop after 5 seconds
                    clearInterval(changeInterval);
                    
                    // Final analysis
                    if (currentModalCount > initialModalCount || currentVideoCount > initialVideoCount) {
                        console.log('🎉 SUCCESS! Modal/video detected');
                    } else {
                        console.log('❌ No modal/video changes detected');
                        
                        // Check for hidden modals
                        const allModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"], [class*="modal"]');
                        console.log('🔍 Checking for hidden modals...');
                        allModals.forEach((modal, i) => {
                            const styles = window.getComputedStyle(modal);
                            console.log(`   Modal ${i}:`, {
                                display: styles.display,
                                visibility: styles.visibility,
                                opacity: styles.opacity,
                                zIndex: styles.zIndex,
                                position: styles.position,
                                classes: modal.className
                            });
                        });
                    }
                    
                    // Restore console.log
                    console.log = originalLog;
                    console.log('🏁 Debug session complete');
                }
            }, 500);
            
        } else if (checkCount >= 10) { // Stop after 5 seconds
            clearInterval(checkInterval);
            console.log('⏰ Timeout: No Watch Live buttons found');
            
            // Show available buttons
            const allButtons = document.querySelectorAll('button');
            console.log('🔍 Available buttons:');
            Array.from(allButtons).forEach((btn, i) => {
                const text = btn.textContent?.trim();
                if (text) {
                    console.log(`   ${i}: "${text}"`);
                }
            });
            
            // Restore console.log
            console.log = originalLog;
        }
    }, 500);
    
})();
