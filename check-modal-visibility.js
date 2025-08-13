// Check if Video Player Modal is in DOM but hidden
// Run this in browser console after clicking Watch Live

(function checkModalVisibility() {
    console.clear();
    console.log('🔍 Checking Video Player Modal Visibility...');
    
    // Look for video player modal elements
    const modalSelectors = [
        '[role="dialog"]',
        '.fixed.inset-0',
        '[data-testid*="modal"]',
        '[class*="video-player"]',
        '[class*="modal"]',
        'div[class*="z-"]', // z-index classes
        '.modal',
        '#video-player-modal'
    ];
    
    modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`📋 Found ${elements.length} elements with selector: ${selector}`);
            Array.from(elements).forEach((el, i) => {
                const styles = window.getComputedStyle(el);
                console.log(`  Element ${i}:`, {
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    zIndex: styles.zIndex,
                    position: styles.position,
                    transform: styles.transform,
                    className: el.className,
                    textContent: el.textContent?.substring(0, 50) + '...'
                });
            });
        }
    });
    
    // Look specifically for video elements
    const videos = document.querySelectorAll('video');
    console.log(`📺 Found ${videos.length} video elements:`);
    videos.forEach((video, i) => {
        const styles = window.getComputedStyle(video);
        console.log(`  Video ${i}:`, {
            src: video.src,
            currentSrc: video.currentSrc,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            readyState: video.readyState,
            networkState: video.networkState,
            paused: video.paused,
            parentElement: video.parentElement?.className
        });
    });
    
    // Check document body for any overlays
    const body = document.body;
    console.log('📄 Body children with high z-index:');
    Array.from(body.children).forEach((child, i) => {
        const styles = window.getComputedStyle(child);
        const zIndex = parseInt(styles.zIndex);
        if (zIndex > 1000 || styles.position === 'fixed') {
            console.log(`  Child ${i}:`, {
                tagName: child.tagName,
                className: child.className,
                zIndex: styles.zIndex,
                position: styles.position,
                display: styles.display,
                visibility: styles.visibility
            });
        }
    });
    
    // Try to find the actual VideoPlayerModal by React component patterns
    const reactElements = document.querySelectorAll('[data-reactroot] *');
    console.log('🔍 Searching for VideoPlayerModal in React tree...');
    
    let foundModal = false;
    Array.from(reactElements).forEach(el => {
        if (el.textContent && (
            el.textContent.includes('Video Player') ||
            el.textContent.includes('Live TV') ||
            el.className.includes('video') ||
            el.className.includes('player')
        )) {
            console.log('🎯 Potential modal element:', {
                tagName: el.tagName,
                className: el.className,
                textContent: el.textContent.substring(0, 100),
                display: window.getComputedStyle(el).display,
                visibility: window.getComputedStyle(el).visibility
            });
            foundModal = true;
        }
    });
    
    if (!foundModal) {
        console.log('❌ No VideoPlayerModal elements found in DOM');
    }
    
    console.log('✅ Modal visibility check complete');
})();
