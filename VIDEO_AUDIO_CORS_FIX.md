# Video Audio CORS Issue - Root Cause Analysis

## Problem
Video plays but has no audio. Browser console shows CORS errors when trying to load Real-Debrid URLs directly.

## Root Cause
The Real-Debrid URLs are being accessed directly by the browser instead of going through our `/api/stream-proxy` endpoint. This causes:
1. **CORS blocking** - Real-Debrid doesn't allow cross-origin requests from localhost
2. **Audio tracks blocked** - Even if video loads, audio may be blocked separately due to CORS
3. **Mixed content** - The direct URLs bypass our proxy's CORS headers

## Evidence from Console Errors

```
❌ Access to fetch at 'https://nyk4-4.download.real-debrid.com/d/FS4IHG...'
   from origin 'http://localhost:3000' has been blocked by CORS policy:
   No 'Access-Control-Allow-Origin' header is present on the requested resource.

❌ HEAD https://nyk4-4.download.real-debrid.com/d/FS4IHG... 
   net::ERR_FAILED 200 (OK)
```

## The Flow Issue

### Current (Broken) Flow:
1. User clicks play
2. `streaming.ts` resolves Torrentio/Debridio URL to Real-Debrid URL
3. Real-Debrid URL is returned directly: `https://nyk4-4.download.real-debrid.com/...`
4. NetflixPlayer receives the direct URL
5. Browser tries to load it → **CORS BLOCKED** ❌

### Expected (Working) Flow:
1. User clicks play
2. `streaming.ts` resolves Torrentio/Debridio URL to Real-Debrid URL
3. Real-Debrid URL is **wrapped** in proxy: `/api/stream-proxy?url=https://nyk4-4...`
4. NetflixPlayer receives the proxied URL
5. Browser loads from our proxy → **CORS ALLOWED** ✅
6. Our proxy fetches from Real-Debrid with proper headers
7. Our proxy returns stream with CORS headers

## The Fix Needed

In `src/lib/services/streaming.ts`, the `prepareStream()` method has this code:

```typescript
// Use stream proxy for Real-Debrid URLs
if (data.resolvedUrl.includes('real-debrid.com') || data.resolvedUrl.includes('download.')) {
  const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(data.resolvedUrl)}`
  console.log(`🔄 Using stream proxy for Real-Debrid URL: ${proxiedUrl.substring(0, 100)}...`)
  return proxiedUrl
}
```

**BUT** - This code is only inside the Torrentio resolve URL block. It doesn't catch all Real-Debrid URLs!

## Missing Coverage

The proxy wrapping is only applied when:
- URL is a Torrentio resolve URL (`/resolve/`)
- AND it successfully resolves to a Real-Debrid URL

It's **NOT** applied when:
- Direct Real-Debrid URLs are returned
- Debridio URLs resolve to Real-Debrid
- Other code paths return Real-Debrid URLs

## Solution

We need to ensure **ALL** Real-Debrid URLs are proxied before being returned to the player, regardless of which code path they came from.

### Option 1: Centralized URL Wrapping
Add a final check at the end of `prepareStream()`:

```typescript
async prepareStream(source: StreamingSource, isSafariBrowser?: boolean): Promise<string | null> {
  // ... existing code ...
  
  // Get the final URL
  let finalUrl = await /* ... existing logic ... */
  
  // ALWAYS proxy Real-Debrid URLs before returning
  if (finalUrl && (finalUrl.includes('real-debrid.com') || finalUrl.includes('download.'))) {
    if (!finalUrl.startsWith('/api/stream-proxy')) {
      finalUrl = `/api/stream-proxy?url=${encodeURIComponent(finalUrl)}`
      console.log(`🔄 [FINAL WRAP] Proxying Real-Debrid URL`)
    }
  }
  
  return finalUrl
}
```

### Option 2: Player-Level Wrapping
Add check in NetflixPlayer before loading:

```typescript
// In NetflixPlayer initialization
if (sourceUrl.includes('real-debrid.com') && !sourceUrl.startsWith('/api/')) {
  sourceUrl = `/api/stream-proxy?url=${encodeURIComponent(sourceUrl)}`
}
```

## Why This Causes No Audio

1. **Video loads partially** - Browser may cache some video data before CORS block
2. **Audio requests blocked** - Separate audio track requests hit CORS policy
3. **Mixed results** - Some chunks load, some don't, causing inconsistent playback
4. **Silent failure** - Video element doesn't explicitly report "no audio", just fails to load audio tracks

## Implementation Priority

**Option 1** is better because:
- Centralizes the logic
- Catches all code paths
- Easier to maintain
- Single source of truth for URL proxying

## Testing After Fix

After implementing, verify:
1. ✅ No CORS errors in console
2. ✅ All URLs go through `/api/stream-proxy`
3. ✅ Video plays with audio
4. ✅ Seeking works (range requests)
5. ✅ No duplicate proxying (avoid `/api/stream-proxy?url=/api/stream-proxy...`)
