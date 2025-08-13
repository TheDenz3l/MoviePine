// Test Network Click and Stream Loading
// Run this in browser console on the Live TV page

(function testNetworkClick() {
    console.clear();
    console.log('🔧 Testing Network Click and Stream Loading...');
    
    // Find network cards (ABC, CBS, etc.)
    const networkCards = document.querySelectorAll('[class*="cursor-pointer"], .cursor-pointer');
    console.log('📺 Found', networkCards.length, 'network cards');
    
    if (networkCards.length === 0) {
        console.error('❌ No network cards found!');
        return;
    }
    
    // Try to click the first network (ABC)
    const firstNetwork = networkCards[0];
    console.log('🖱️ Clicking first network:', firstNetwork.textContent?.trim());
    
    // Set up monitoring for changes
    let checkCount = 0;
    const maxChecks = 10; // 5 seconds max
    
    const monitor = setInterval(() => {
        checkCount++;
        
        // Look for Watch Live buttons
        const watchButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent && btn.textContent.includes('Watch Live')
        );
        
        console.log(`⏰ Check ${checkCount}: Found ${watchButtons.length} Watch Live buttons`);
        
        if (watchButtons.length > 0) {
            clearInterval(monitor);
            console.log('✅ SUCCESS! Found Watch Live buttons');
            
            // Test the first Watch Live button
            const button = watchButtons[0];
            console.log('🎬 Testing first Watch Live button:', {
                text: button.textContent?.trim(),
                disabled: button.disabled,
                visible: !!button.offsetParent
            });
            
            // Monitor for modal/video changes
            const beforeModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]').length;
            const beforeVideos = document.querySelectorAll('video').length;
            
            console.log('📊 Before click:', { modals: beforeModals, videos: beforeVideos });
            
            // Click the Watch Live button
            console.log('🎬 Clicking Watch Live button...');
            button.click();
            
            // Check for changes
            setTimeout(() => {
                const afterModals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]').length;
                const afterVideos = document.querySelectorAll('video').length;
                
                console.log('📊 After click:', { 
                    modals: afterModals, 
                    videos: afterVideos,
                    modalChange: afterModals > beforeModals,
                    videoChange: afterVideos > beforeVideos
                });
                
                if (afterModals > beforeModals || afterVideos > beforeVideos) {
                    console.log('🎉 SUCCESS! Video player opened!');
                } else {
                    console.log('❌ No modal/video changes detected');
                    
                    // Check for any error messages
                    const errors = document.querySelectorAll('[class*="error"], [data-testid*="error"]');
                    if (errors.length > 0) {
                        console.log('🚨 Found error elements:', errors.length);
                    }
                }
            }, 2000);
            
            return;
        }
        
        if (checkCount >= maxChecks) {
            clearInterval(monitor);
            console.log('⏰ Timeout: No Watch Live buttons appeared after 5 seconds');
            
            // Show what buttons we do have
            const allButtons = document.querySelectorAll('button');
            console.log('🔍 Available buttons:');
            Array.from(allButtons).forEach((btn, i) => {
                console.log(`   ${i}: "${btn.textContent?.trim()}" (${btn.disabled ? 'disabled' : 'enabled'})`);
            });
        }
    }, 500);
    
    // Click the network
    firstNetwork.click();
    console.log('🖱️ Network clicked, waiting for streams to load...');
    
})();
