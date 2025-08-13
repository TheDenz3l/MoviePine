import { test, expect, devices } from '@playwright/test';

test.describe('Safari Stream Transcoding Tests', () => {
  
  test('Safari browser stream playback test', async ({ browser }) => {
    // Create Safari context
    const context = await browser.newContext({
      ...devices['Desktop Safari'],
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    });
    
    const page = await context.newPage();
    
    // Track console logs and errors
    const logs: string[] = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Navigate to our test page
    await page.goto('http://localhost:3000/test-safari-playback.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check Safari detection
    const browserInfo = await page.textContent('#browser-info');
    console.log('Browser Info:', browserInfo);
    expect(browserInfo).toContain('Is Safari: ✅ Yes');
    
    // Test stream availability
    console.log('🔄 Testing stream availability...');
    await page.click('button:has-text("Test Stream Sources")');
    await page.waitForTimeout(3000);
    
    const streamStatus = await page.textContent('#stream-status');
    console.log('Stream Status:', streamStatus);
    expect(streamStatus).toContain('Stream availability test completed');
    
    // Test specific HEVC stream (Matrix)
    console.log('🎯 Testing Matrix HEVC stream...');
    await page.click('button:has-text("Test Matrix (HEVC)")');
    await page.waitForTimeout(5000);
    
    // Check if video element got a source
    const videoSrc = await page.getAttribute('#test-video', 'src');
    console.log('Video Source:', videoSrc);
    expect(videoSrc).toContain('/api/stream-transcoder');
    expect(videoSrc).toContain('safari=true');
    
    // Check stream info
    const contentType = await page.textContent('#content-type');
    const safariTranscoded = await page.textContent('#safari-transcoded');
    const originalFormat = await page.textContent('#original-format');
    
    console.log('Stream Info:');
    console.log('  Content-Type:', contentType);
    console.log('  Safari Transcoded:', safariTranscoded);
    console.log('  Original Format:', originalFormat);
    
    // Verify transcoding headers
    expect(contentType).toBe('video/mp4');
    expect(safariTranscoded).toContain('live-stream');
    expect(originalFormat).toBe('mkv');
    
    // Check video health
    await page.click('button:has-text("Check Video Health")');
    await page.waitForTimeout(2000);
    
    const videoStatus = await page.textContent('#video-status');
    console.log('Video Status:', videoStatus);
    
    // Wait for video to load metadata
    await page.waitForFunction(() => {
      const video = document.querySelector('#test-video') as HTMLVideoElement;
      return video && video.readyState >= 1; // HAVE_METADATA
    }, { timeout: 30000 });
    
    // Check video ready state
    const readyState = await page.evaluate(() => {
      const video = document.querySelector('#test-video') as HTMLVideoElement;
      return video.readyState;
    });
    
    console.log('Video Ready State:', readyState);
    expect(readyState).toBeGreaterThanOrEqual(1); // At least HAVE_METADATA
    
    // Try to play the video
    console.log('▶️ Attempting to play video...');
    const playResult = await page.evaluate(async () => {
      const video = document.querySelector('#test-video') as HTMLVideoElement;
      try {
        await video.play();
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    
    console.log('Play Result:', playResult);
    
    if (playResult.success) {
      console.log('✅ Video play() succeeded');
      
      // Wait a bit to see if it actually starts playing
      await page.waitForTimeout(3000);
      
      const isPlaying = await page.evaluate(() => {
        const video = document.querySelector('#test-video') as HTMLVideoElement;
        return !video.paused && !video.ended && video.readyState > 2;
      });
      
      console.log('Is Playing:', isPlaying);
      
      if (isPlaying) {
        console.log('🎬 SUCCESS: Video is actively playing!');
      } else {
        console.log('⚠️ Video play() succeeded but not actively playing');
      }
    } else {
      console.log('❌ Video play() failed:', playResult.error);
    }
    
    // Get event log
    const eventLog = await page.textContent('#event-log');
    console.log('Event Log:');
    console.log(eventLog);
    
    // Check for video errors
    const videoError = await page.evaluate(() => {
      const video = document.querySelector('#test-video') as HTMLVideoElement;
      return video.error ? {
        code: video.error.code,
        message: video.error.message
      } : null;
    });
    
    if (videoError) {
      console.log('❌ Video Error:', videoError);
    } else {
      console.log('✅ No video errors detected');
    }
    
    // Report any console errors
    if (errors.length > 0) {
      console.log('Page Errors:', errors);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/safari-transcoding-test.png', fullPage: true });
    
    await context.close();
  });

  test('Direct transcoder API test', async ({ request }) => {
    // Test the transcoder API directly
    const testStreamUrl = 'https://torrentio.strem.fun/resolve/realdebrid/LNWEQRH45NCRI52OTWOGJ24NFQDYTQRYTD6SSG3ZXVKUF7B5JFKQ/1a65cebb895ccd66a9f3fd2e76eb0958ba7a74db/null/0/The.Matrix.1999.UHD.BluRay.2160p.TrueHD.Atmos.7.1.DV.HEVC.REMUX-FraMeSToR.mkv';
    
    const response = await request.head(`http://localhost:3000/api/stream-transcoder?url=${encodeURIComponent(testStreamUrl)}&safari=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      }
    });
    
    console.log('Transcoder API Response:', response.status());
    console.log('Response Headers:', await response.headers());
    
    expect(response.status()).toBe(200);
    
    const headers = await response.headers();
    expect(headers['content-type']).toBe('video/mp4');
    expect(headers['x-safari-transcoded']).toBe('live-stream');
    expect(headers['x-original-format']).toBe('mkv');
    
    console.log('✅ Direct API test passed');
  });

  test('Safari stream filtering test', async ({ request }) => {
    // Test Safari stream filtering
    const response = await request.get('http://localhost:3000/api/torrentio?endpoint=https%3A%2F%2Ftorrentio.strem.fun%2Fproviders%3D1337x%7Crarbg%7Cthepiratebay%7Csort%3Dqualitysize%2Fstream%2Fmovie%2Ftt0133093.json&isSafari=true', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('Safari Streams Found:', data.streams?.length || 0);
    
    expect(data.streams).toBeDefined();
    expect(Array.isArray(data.streams)).toBe(true);
    
    if (data.streams.length > 0) {
      console.log('First stream:', data.streams[0].name);
      console.log('Stream URL:', data.streams[0].url);
    }
    
    console.log('✅ Safari filtering test passed');
  });
});
