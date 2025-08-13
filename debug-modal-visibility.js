// Test Modal Visibility after Watch Live Click
// Run this in browser console on the Live TV page

(function debugModalVisibility() {
    console.clear();
    console.log('🔧 Debugging Modal Visibility...');
    
    // First, let's check the current state
    const checkModalState = () => {
        const modals = document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-testid*="modal"], [class*="modal"]');
        const videos = document.querySelectorAll('video');
        const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"]');
        
        console.log('📊 Current state:', {
            modals: modals.length,
            videos: videos.length,
            overlays: overlays.length,
            bodyClass: document.body.className,
            hasDialogOpen: !!document.querySelector('[data-state="open"]')
        });
        
        // Check for hidden modals
        modals.forEach((modal, i) => {
            const styles = window.getComputedStyle(modal);
            console.log(`   Modal ${i}:`, {
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity,
                zIndex: styles.zIndex,
                position: styles.position,
                transform: styles.transform
            });
        });
    };
    
    console.log('🔍 Initial state:');
    checkModalState();
    
    // Find and click network
    const networkCards = document.querySelectorAll('[class*="cursor-pointer"], .cursor-pointer');
    if (networkCards.length === 0) {
        console.error('❌ No network cards found!');
        return;
    }
    
    console.log('🖱️ Clicking first network...');
    networkCards[0].click();
    
    // Wait for streams to load and check for Watch Live button
    setTimeout(() => {
        const watchButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.textContent && btn.textContent.includes('Watch Live')
        );
        
        if (watchButtons.length === 0) {
            console.error('❌ No Watch Live buttons found after network click');
            return;
        }
        
        console.log('✅ Found Watch Live button, clicking...');
        
        // Monitor state changes continuously
        let changeCount = 0;
        const monitor = setInterval(() => {
            changeCount++;
            console.log(`⏰ State check ${changeCount}:`);
            checkModalState();
            
            if (changeCount >= 10) { // Stop after 5 seconds
                clearInterval(monitor);
                console.log('🏁 Monitoring complete');
            }
        }, 500);
        
        // Click the Watch Live button
        watchButtons[0].click();
        
    }, 2000);
    
})();
