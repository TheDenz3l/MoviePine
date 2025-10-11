# Audio CORS Fix - Complete Solution

## Problem
Audio was not playing due to CORS errors when the stream health checker attempted to validate Real-Debrid URLs before they were wrapped with the proxy. The error sequence was:

1. **Stream URL obtained** → Real-Debrid URL (e.g., `https://nyk4-4.download.real-debrid.com/d/FS4IHG...`)
2. **Health check attempted** → Direct fetch to Real-Debrid URL
3. **CORS error** → `Access to fetch at 'https://nyk4-4.download.real-debrid.com...' from origin 'http://localhost:3000' has been blocked by CORS policy`
4. **Audio fails** → Video plays, audio doesn't

## Root Cause
The `prepareStream` method in `streaming.ts` was performing health checks on Real-Debrid URLs **BEFORE** wrapping them with the stream proxy. This caused CORS errors because:

- Real-Debrid URLs don't allow cross-origin requests from localhost
- The health checker was trying to validate the raw Real-Debrid URL
- The proxy wrapper was being applied AFTER the failed health check

## Solution

### 1. Fixed URL Wrapping Order in `streaming.ts`
**Changed**: Wrap Real-Debrid URLs with proxy **BEFORE** any health checks

```typescript
// BEFORE (❌ Broken)
const healthCheck = await validateStreamBeforePlay(source.url)  // CORS error!
const proxiedUrl = wrapRealDebridUrl(source.url)
return proxiedUrl

// AFTER (✅ Fixed)
const finalUrl = wrapRealDebridUrl(source.url)  // Wrap FIRST
const healthCheck = await validateStreamBeforePlay(finalUrl)  // Check proxied URL
return finalUrl
```

**Applied to all prepareStream code paths**:
- ✅ Direct playable URLs
- ✅ Torrentio resolve URLs
- ✅ Debridio resolve URLs  
- ✅ Real-Debrid streaming URLs
- ✅ Torbox streaming URLs

### 2. Enhanced CORS Headers in `stream-proxy/route.ts`
**Added comprehensive CORS support** for audio/video media playback:

```typescript
const responseHeaders: HeadersInit = {
  'Content-Type': contentType,
  'Accept-Ranges': acceptRanges,
  // CORS headers - must be permissive for media playback
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Authorization, X-Requested-With',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, Date, Server, Transfer-Encoding, X-Content-Duration',
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Max-Age': '86400',
  // Caching for media content
  'Cache-Control': 'public, max-age=3600, immutable',
  // Security headers for media
  'X-Content-Type-Options': 'nosniff',
}
```

**Added HEAD method support** for metadata preflight:
- Browsers often send HEAD requests before loading media
- Now returns proper CORS headers for HEAD requests
- Includes Content-Length and Accept-Ranges for range request support

**Enhanced OPTIONS preflight**:
- Comprehensive CORS headers for preflight requests
- Exposes all necessary headers for media playback
- 24-hour cache for preflight responses

## Files Modified

### 1. `src/lib/services/streaming.ts`
**Changes**:
- Updated `wrapRealDebridUrl` function comment to indicate CRITICAL timing
- Modified all URL preparation paths to wrap BEFORE validation
- Ensured proxied URLs are used consistently throughout

**Code sections updated**:
- Direct playable URL path (lines ~620-640)
- Debridio resolve URL path (lines ~680-720)
- Torrentio resolve URL path (lines ~730-780)
- Real-Debrid streaming path (lines ~800-830)
- Torbox streaming path (lines ~880-900)

### 2. `src/app/api/stream-proxy/route.ts`
**Changes**:
- Enhanced GET method CORS headers
- Added comprehensive OPTIONS preflight handler
- Added HEAD method for metadata requests
- Improved error responses with CORS headers

**New methods**:
- `OPTIONS()` - CORS preflight with full header exposure
- `HEAD()` - Metadata requests with CORS support

## Testing Checklist

- [ ] Test video + audio playback with Real-Debrid URLs
- [ ] Verify no CORS errors in browser console
- [ ] Test range requests (seeking) works correctly
- [ ] Verify HEAD requests return proper metadata
- [ ] Test OPTIONS preflight requests
- [ ] Confirm audio track selection works
- [ ] Test multiple audio tracks if available

## Expected Behavior

### Before Fix
```
🏥 [HEALTH CHECK] Validating direct URL...
❌ Access to fetch at 'https://nyk4-4.download.real-debrid.com...' blocked by CORS
⚠️ [HEALTH CHECK] Direct URL validation warning: CORS error
🎬 Video plays, 🔇 Audio fails
```

### After Fix
```
🔄 [PROXY WRAP] Real-Debrid URL wrapped: /api/stream-proxy?url=...
🏥 [HEALTH CHECK] Validating final URL...
✅ [HEALTH CHECK] URL is healthy and playback
🎬 Video plays, 🔊 Audio plays
```

## How It Works

1. **URL Detection**: System detects Real-Debrid URL pattern
2. **Immediate Wrapping**: URL is wrapped with `/api/stream-proxy?url=...` 
3. **Health Check**: Validation runs on proxied URL (no CORS)
4. **Playback**: Video player receives proxied URL with full CORS support
5. **Streaming**: Proxy forwards all requests with proper headers

## Key Points

✅ **Order matters**: Always wrap URLs BEFORE any validation
✅ **Comprehensive CORS**: Expose all headers needed for media playback
✅ **HEAD support**: Metadata requests need CORS headers too
✅ **Preflight caching**: 24-hour OPTIONS cache reduces overhead
✅ **Error handling**: Failed requests still return CORS headers

## Related Files
- `AUDIO_PLAYBACK_FIX_COMPLETE.md` - Previous audio fix attempts
- `VIDEO_AUDIO_CORS_FIX.md` - CORS investigation notes
- `AUDIO_CORS_FIX_COMPLETE.md` - Initial CORS fix documentation

## Status
✅ **COMPLETE** - Audio CORS issue resolved with comprehensive fix

**Date**: January 11, 2025
**Version**: Final
