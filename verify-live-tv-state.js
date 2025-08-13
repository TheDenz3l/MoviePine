// Verify Live TV State Changes
// This script will open the browser, navigate to live TV, and log all state changes

const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting Live TV State Verification...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('🖥️ BROWSER:', msg.text());
  });
  
  try {
    console.log('📱 Navigating to Live TV page...');
    await page.goto('http://localhost:3000/?category=live-tv');
    await page.waitForTimeout(3000);
    
    console.log('📺 Looking for network cards...');
    const networkCards = await page.$$('.cursor-pointer');
    console.log(`📺 Found ${networkCards.length} network cards`);
    
    if (networkCards.length === 0) {
      console.error('❌ No network cards found!');
      return;
    }
    
    console.log('🖱️ Clicking first network card...');
    await networkCards[0].click();
    await page.waitForTimeout(2000);
    
    console.log('🔍 Looking for Watch Live buttons...');
    const watchLiveButtons = await page.$$('button');
    const watchButtons = [];
    
    for (const btn of watchLiveButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Watch Live')) {
        watchButtons.push(btn);
      }
    }
    
    console.log(`�� Found ${watchButtons.length} Watch Live buttons`);
    
    if (watchButtons.length === 0) {
      console.error('❌ No Watch Live buttons found!');
      return;
    }
    
    // Inject state monitoring
    await page.evaluate(() => {
      console.log('💉 Injecting state monitor...');
      
      // Monitor React state changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      window.stateChanges = [];
      
      // Override console.log to capture our debug messages
      const originalLog = console.log;
      console.log = function(...args) {
        if (args[0] && args[0].includes('[DEBUG]')) {
          window.stateChanges.push({
            timestamp: Date.now(),
            message: args.join(' ')
          });
        }
        return originalLog.apply(console, args);
      };
      
      console.log('✅ State monitor installed');
    });
    
    console.log('🎬 Clicking Watch Live button...');
    await watchButtons[0].click();
    
    // Wait and check for changes
    await page.waitForTimeout(3000);
    
    console.log('📊 Checking for modals and videos...');
    const modals = await page.$$('[role="dialog"], .fixed.inset-0, [data-testid*="modal"]');
    const videos = await page.$$('video');
    
    console.log(`📊 Found: ${modals.length} modals, ${videos.length} videos`);
    
    // Get state changes
    const stateChanges = await page.evaluate(() => window.stateChanges || []);
    console.log('📝 State changes captured:');
    stateChanges.forEach((change, i) => {
      console.log(`   ${i+1}. ${change.message}`);
    });
    
    // Check modal visibility
    for (let i = 0; i < modals.length; i++) {
      const styles = await page.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          zIndex: computed.zIndex
        };
      }, modals[i]);
      console.log(`📱 Modal ${i} styles:`, styles);
    }
    
    console.log('🏁 Test complete. Keeping browser open for manual inspection...');
    console.log('💡 Check the browser DevTools console for React state changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
