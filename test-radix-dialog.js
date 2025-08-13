// Test Radix Dialog State
// Run this in browser console after clicking Watch Live

(function testRadixDialog() {
    console.clear();
    console.log('🔍 Testing Radix Dialog State...');
    
    // Check for Radix Dialog elements
    const dataStateOpen = document.querySelectorAll('[data-state="open"]');
    console.log('✅ Elements with data-state="open":', dataStateOpen.length);
    
    const dataStateClosed = document.querySelectorAll('[data-state="closed"]');
    console.log('❌ Elements with data-state="closed":', dataStateClosed.length);
    
    // Check for any Radix primitives
    const radixElements = document.querySelectorAll('[data-radix-component]');
    console.log('⚛️ Radix components:', radixElements.length);
    
    // Check for portal elements (where modals often render)
    const portals = document.querySelectorAll('[data-radix-portal], [data-portal]');
    console.log('🌀 Portal elements:', portals.length);
    
    // Log details for open dialogs
    if (dataStateOpen.length > 0) {
        console.log('\nOpen dialog details:');
        dataStateOpen.forEach((el, i) => {
            const styles = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            console.log(`  Dialog ${i}:`);
            console.log(`    Element:`, el.tagName, el.className);
            console.log(`    Display: ${styles.display}`);
            console.log(`    Visibility: ${styles.visibility}`);
            console.log(`    Opacity: ${styles.opacity}`);
            console.log(`    Position: ${styles.position}`);
            console.log(`    Z-index: ${styles.zIndex}`);
            console.log(`    Transform: ${styles.transform}`);
            console.log(`    Bounds: width=${rect.width}, height=${rect.height}, top=${rect.top}, left=${rect.left}`);
            console.log(`    In viewport: ${rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0}`);
            console.log(`    Has children: ${el.children.length}`);
            
            // Check if it's actually visible
            const isVisible = rect.width > 0 && rect.height > 0 && 
                             styles.display !== 'none' && 
                             styles.visibility !== 'hidden' && 
                             parseFloat(styles.opacity) > 0;
            console.log(`    Actually visible: ${isVisible}`);
        });
    }
    
    // Check for specific VideoPlayer elements
    const videoPlayers = document.querySelectorAll('video, [class*="video"], [data-testid*="video"]');
    console.log(`�� Video elements: ${videoPlayers.length}`);
    
    // Check body and html for overflow/scroll issues
    const bodyStyles = window.getComputedStyle(document.body);
    const htmlStyles = window.getComputedStyle(document.documentElement);
    
    console.log('\nPage styles:');
    console.log(`  Body overflow: ${bodyStyles.overflow}`);
    console.log(`  HTML overflow: ${htmlStyles.overflow}`);
    console.log(`  Body position: ${bodyStyles.position}`);
    
    console.log('🏁 Radix Dialog test complete');
})();
