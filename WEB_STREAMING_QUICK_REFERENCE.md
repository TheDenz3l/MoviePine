# Web Streaming Quick Reference

## TL;DR

We now filter streams like Stremio does - prioritizing MP4+H.264+AAC formats that work reliably in browsers, and automatically filtering out incompatible formats like MKV files.

## What Changed

### New Files
- `src/lib/utils/stream-compatibility.ts` - Core compatibility checker
- `STREMIO_WEB_STREAMING_IMPLEMENTATION.md` - Full documentation

### Modified Files
- `src/lib/config.ts` - Added `webSafeMode` and `allowTranscoding` options
- `src/lib/api/torrentio.ts` - Integrated compatibility filtering
- `src/lib/api/debridio.ts` - Integrated compatibility filtering

## Quick Start

### Enable Web-Safe Mode (Optional)

Add to `.env.local`:
```bash
# Only show ultra-safe streams (MP4+H.264+AAC)
NEXT_PUBLIC_WEB_SAFE_MODE=true
```

### Use Compatibility Checker

```typescript
import { StreamCompatibilityChecker } from '@/lib/utils/stream-compatibility'

// Analyze a stream
const result = StreamCompatibilityChecker.analyze(
  streamName,
  isSafari  // true if Safari browser
)

console.log(result.tier)        // 'ultra-safe', 'safe', 'risky', etc.
console.log(result.canPlay)     // true/false
console.log(result.issues)      // Array of compatibility issues
```

### Automatic Filtering

Both Torrentio and Debridio now automatically filter streams:

```typescript
// Torrentio - automatically filtered
const streams = await torrentioAPI.getMovieStreams(imdbId, isSafari)

// Debridio - automatically filtered  
const streams = await debridioAPI.getMovieStreams(tmdbId, isSafari)
```

## Compatibility Tiers

| Tier | Description | Example | Works In |
|------|-------------|---------|----------|
| **ultra-safe** | MP4 + H.264 + AAC | `Movie.1080p.x264.AAC.mp4` | All browsers ✅ |
| **safe** | MP4 + H.264 + compatible audio | `Movie.1080p.x264.AC3.mp4` | Most browsers ✅ |
| **risky** | MP4 with potential issues | `Movie.2160p.x265.AAC.mp4` | Some browsers ⚠️ |
| **transcoding** | Needs server conversion | `Movie.1080p.x264.mkv` | With transcoding ⚙️ |
| **incompatible** | Cannot play | `Movie.REMUX.mkv` | Never ❌ |

## Safari Special Cases

Safari is more restrictive:

### ✅ Works
- MP4 + H.264 + AAC
- MP4 + H.264 + MP3

### ⚠️ Might Work
- MP4 + HEVC + AAC (hardware dependent)

### ❌ Won't Work
- MKV containers
- 10-bit encoding
- HDR metadata
- DTS/AC3/Opus audio
- Remux files

## Debug Logging

Check browser console for filtering decisions:

```javascript
// You'll see logs like:
🎯 [COMPATIBILITY] Analyzing 42 streams (Safari: true, WebSafe: false)
🎯 [COMPATIBILITY] Using tier: safe (18 streams)
🎯 [TORRENTIO] Filtering complete: 18 compatible streams
🎯 [TORRENTIO] Sample streams: [
  'Movie.2024.1080p.x264.AAC.mp4 [ultra-safe]',
  'Movie.2024.720p.h264.aac.mp4 [ultra-safe]'
]
```

## Common Issues

### No Streams Found

**Problem**: All streams filtered out

**Solutions**:
1. Disable web-safe mode: `NEXT_PUBLIC_WEB_SAFE_MODE=false`
2. Check source - may only have MKV/incompatible streams
3. Review console logs to see why streams were filtered

### Stream Won't Play

**Problem**: Stream marked compatible but fails

**Possible Causes**:
1. Stream name misleading (says MP4 but actually MKV)
2. Network/CORS issues
3. Unsupported codec profile

**Solutions**:
1. Try different stream
2. Check network tab for errors
3. Enable transcoding if available

## Format Detection Patterns

Quick reference for what the system looks for:

```typescript
// Containers
MP4:  /\.mp4\b/i
MKV:  /\.mkv\b/i
WebM: /\.webm\b/i

// Video Codecs
H.264: /(x264|h\.?264|avc)/i
HEVC:  /(x265|h\.?265|hevc)/i
AV1:   /av1/i

// Audio Codecs  
AAC:   /aac/i
AC3:   /ac3|dd5\.1/i
DTS:   /dts/i
```

## Best Practices

### 1. Always Pass Safari Flag
```typescript
const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
const streams = await api.getMovieStreams(id, isSafari)
```

### 2. Handle Empty Results
```typescript
const streams = await api.getMovieStreams(id, isSafari)
if (streams.length === 0) {
  // Show "no compatible streams" message
  // Offer to disable filtering or try transcoding
}
```

### 3. Show Compatibility Info to Users
```typescript
streams.forEach(stream => {
  const compat = StreamCompatibilityChecker.analyze(stream.name, isSafari)
  
  // Show tier badge or warning if risky
  if (compat.tier === 'risky') {
    console.warn('⚠️ This stream may not work:', compat.issues)
  }
})
```

### 4. Log Filtering Decisions
The system automatically logs detailed information - check browser console during development.

## Environment Variables

```bash
# Only return ultra-safe and safe tier streams
NEXT_PUBLIC_WEB_SAFE_MODE=true

# Allow transcoding for incompatible formats (default: true)
NEXT_PUBLIC_ALLOW_TRANSCODING=false
```

## Performance Tips

1. **Filtering is fast** - O(n) regex matching per stream
2. **Pre-filter early** - Done at API level before other processing
3. **Tier short-circuit** - Stops at first valid tier with streams
4. **Sample logging** - Only logs 3 example streams, not all

## Testing

### Test Streams

```typescript
// Ultra-safe (should always work)
'Movie.2024.1080p.x264.AAC.mp4'
'Show.S01E01.720p.h264.aac.mp4'

// Safe (might have audio issues in Safari)
'Movie.2024.1080p.x264.AC3.mp4'

// Risky (HEVC - hardware dependent)
'Movie.2024.2160p.x265.AAC.mp4'

// Incompatible (will be filtered)
'Movie.2024.1080p.x264.mkv'
'Movie.2024.REMUX.mkv'
```

### Browser Testing

1. **Chrome/Edge**: All tiers should work (except incompatible)
2. **Safari**: Only ultra-safe and safe (with audio caveats)
3. **Firefox**: Similar to Chrome
4. **Mobile**: Test with web-safe mode enabled

## Migration Checklist

- [ ] Update API calls to pass `isSafari` flag
- [ ] Add config to API constructors (optional)
- [ ] Handle empty stream results gracefully
- [ ] Test in Safari and Chrome
- [ ] Check console logs for filtering decisions
- [ ] Consider enabling web-safe mode for mobile

## Need More Details?

See `STREMIO_WEB_STREAMING_IMPLEMENTATION.md` for:
- Full architecture explanation
- Detailed format detection patterns
- Safari-specific handling
- Performance optimization
- Troubleshooting guide
- Future enhancement ideas

## Summary

The new system automatically filters streams to ensure browser compatibility, following Stremio's proven approach. It works transparently with both Torrentio and Debridio, prioritizes MP4+H.264+AAC formats, and provides detailed logging for debugging.

**Key Benefits**:
- ✅ No more "stream won't play" issues
- ✅ Automatic MKV filtering
- ✅ Safari compatibility built-in
- ✅ Graceful tier-based fallback
- ✅ Works with existing code (just pass isSafari flag)
