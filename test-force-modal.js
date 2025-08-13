// Force Modal Test - Inject and render modal directly
// Run this in browser console on any page to test modal rendering

(function testForceModal() {
    console.clear();
    console.log('🔧 Force Modal Test...');
    
    // Create a test dialog element manually
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 z-[9999] bg-black bg-opacity-50';
    dialog.style.zIndex = '9999';
    dialog.style.position = 'fixed';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100vw';
    dialog.style.height = '100vh';
    dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    dialog.setAttribute('data-test', 'forced-modal');
    
    const content = document.createElement('div');
    content.className = 'w-full h-full flex items-center justify-center text-white text-4xl';
    content.innerHTML = '🎬 TEST MODAL - If you see this, modals can render';
    content.style.cursor = 'pointer';
    
    content.onclick = () => {
        console.log('✅ Modal is clickable and visible');
        dialog.remove();
        console.log('✅ Modal removed');
    };
    
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    console.log('✅ Test modal injected');
    console.log('🖱️ Click the modal to close it');
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(dialog)) {
            dialog.remove();
            console.log('⏰ Test modal auto-removed');
        }
    }, 5000);
    
    // Check if it's actually visible
    setTimeout(() => {
        const rect = dialog.getBoundingClientRect();
        const styles = window.getComputedStyle(dialog);
        console.log('�� Test modal visibility check:', {
            width: rect.width,
            height: rect.height,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            position: styles.position,
            inDOM: document.body.contains(dialog)
        });
    }, 100);
    
})();
