// Test Modal DOM Presence
// Run this in browser console after clicking Watch Live

(function testModalPresence() {
    console.clear();
    console.log('🔍 Testing Modal DOM Presence...');
    
    // Check for any dialog elements
    const dialogs = document.querySelectorAll('dialog, [role="dialog"]');
    console.log('📱 Dialog elements:', dialogs.length);
    
    // Check for any fixed positioned elements (modals usually use this)
    const fixedElements = document.querySelectorAll('.fixed, [style*="position: fixed"]');
    console.log('📌 Fixed positioned elements:', fixedElements.length);
    
    // Check for z-index elements
    const highZIndex = document.querySelectorAll('[style*="z-index"], [class*="z-"]');
    console.log('🔝 Z-index elements:', highZIndex.length);
    
    // Check for VideoPlayerModal specifically
    const modalContainers = document.querySelectorAll('[class*="modal"], [data-testid*="modal"], [aria-modal="true"]');
    console.log('🎬 Modal containers:', modalContainers.length);
    
    // Check for any elements with "inset-0" class (common for overlays)
    const overlays = document.querySelectorAll('.inset-0, [class*="inset-0"]');
    console.log('🖼️ Overlay elements:', overlays.length);
    
    // Log all potentially relevant elements
    [dialogs, fixedElements, modalContainers, overlays].forEach((collection, type) => {
        const typeNames = ['Dialog', 'Fixed', 'Modal', 'Overlay'];
        if (collection.length > 0) {
            console.log(`\n${typeNames[type]} elements found:`);
            Array.from(collection).forEach((el, i) => {
                const styles = window.getComputedStyle(el);
                console.log(`  ${i}: ${el.tagName} - ${el.className}`);
                console.log(`      display: ${styles.display}, visibility: ${styles.visibility}, opacity: ${styles.opacity}`);
                console.log(`      position: ${styles.position}, z-index: ${styles.zIndex}`);
            });
        }
    });
    
    // Check React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('⚛️ React DevTools available');
    }
    
    console.log('🏁 Modal presence test complete');
})();
