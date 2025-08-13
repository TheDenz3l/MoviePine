// Test script to inject into browser console to manually test state setting
console.log('🧪 Starting manual state test...');

// Try to access React components and set state directly
const testModalState = () => {
  console.log('🔍 Looking for React component state...');
  
  // Try to find React fiber nodes
  const reactElements = document.querySelectorAll('[data-reactroot] *');
  console.log(`Found ${reactElements.length} React elements`);
  
  // Look for React internals
  for (let element of reactElements) {
    const keys = Object.keys(element);
    const reactKey = keys.find(key => 
      key.startsWith('__reactInternalInstance') || 
      key.startsWith('_reactInternalFiber') ||
      key.startsWith('__reactFiber')
    );
    
    if (reactKey) {
      console.log(`✅ Found React fiber: ${reactKey}`);
      const fiber = element[reactKey];
      
      // Try to find the component with setVideoPlayerOpen
      const findComponentWithState = (fiber) => {
        if (!fiber) return null;
        
        // Check if this fiber has hooks with our state
        if (fiber.memoizedState) {
          console.log('🔍 Found component with state:', fiber.type?.name || 'Unknown');
          
          // Try to access the state directly
          let currentHook = fiber.memoizedState;
          let hookIndex = 0;
          
          while (currentHook && hookIndex < 20) {
            console.log(`Hook ${hookIndex}:`, currentHook.memoizedState);
            
            // If this looks like a boolean (could be isVideoPlayerOpen)
            if (typeof currentHook.memoizedState === 'boolean') {
              console.log(`🎯 Found boolean state at hook ${hookIndex}: ${currentHook.memoizedState}`);
              
              // Try to trigger the setter
              if (currentHook.queue && currentHook.queue.dispatch) {
                console.log('🚀 Attempting to set state to true...');
                try {
                  currentHook.queue.dispatch(true);
                  console.log('✅ State setter called successfully');
                  
                  // Check again after a delay
                  setTimeout(() => {
                    console.log('🔍 State after 500ms:', currentHook.memoizedState);
                  }, 500);
                  
                } catch (e) {
                  console.log('❌ Error calling state setter:', e);
                }
              }
            }
            
            currentHook = currentHook.next;
            hookIndex++;
          }
        }
        
        // Recursively check children
        if (fiber.child) {
          const result = findComponentWithState(fiber.child);
          if (result) return result;
        }
        
        // Check sibling
        if (fiber.sibling) {
          const result = findComponentWithState(fiber.sibling);
          if (result) return result;
        }
        
        return null;
      };
      
      findComponentWithState(fiber);
      break; // Only check the first one
    }
  }
};

// Also check the DOM for any modal elements that might be hidden
const checkModalDOM = () => {
  console.log('🔍 Checking DOM for hidden modals...');
  
  const allElements = document.querySelectorAll('*');
  const hiddenModals = [];
  
  allElements.forEach(el => {
    const styles = window.getComputedStyle(el);
    const className = el.className || '';
    
    // Look for modal-like elements
    if (className.includes('modal') || 
        className.includes('dialog') || 
        el.getAttribute('role') === 'dialog' ||
        el.tagName === 'DIALOG') {
      
      hiddenModals.push({
        element: el,
        visible: el.offsetParent !== null,
        display: styles.display,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        className: className
      });
    }
  });
  
  console.log(`Found ${hiddenModals.length} modal-like elements:`);
  hiddenModals.forEach((modal, i) => {
    console.log(`  ${i + 1}. ${modal.element.tagName} - visible: ${modal.visible}, display: ${modal.display}, opacity: ${modal.opacity}`);
  });
};

testModalState();
checkModalDOM();
