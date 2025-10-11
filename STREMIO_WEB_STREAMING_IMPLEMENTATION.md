# Stremio Web Streaming Implementation

## Overview

This document describes our implementation of Stremio's web streaming approach, which prioritizes browser-compatible formats to ensure smooth playback without transcoding.

## Key Learnings from Stremio

After investigating https://web.stremio.com, we identified several critical strategies:

### 1. **Early Format Filtering**
Stremio filters incompatible formats (like MKV) at the API level BEFORE presenting streams to users. This prevents users from selecting streams that won't play.

### 2. **JSON Stream Metadata**
Stremio relies heavily on JSON responses that include detailed format information in stream names/titles, allowing intelligent pre-filtering.

### 3. **MP4 + H.264 + AAC Priority**
This combination is the "gold standard" for web playback:
- **MP4**: Universal container support
- **H.264**: Hardware-accelerated video codec
- **AAC**: Browser-native audio codec

### 4. **Graceful Fallback Tiers**
Rather than "all or nothing," Stremio uses compatibility tiers:
1. Ultra-safe (MP4 + H.264 + AAC)
2. Safe (MP4 + H.264 + compatible audio)
3. Risky (MP4 with potential codec issues)
4. Transcoding required (non-MP4 or incompatible codecs)

### 5. **Avoid MKV Completely**
MKV files are explicitly filtered out for web playback as they're not natively supported by browsers and require server-side remuxing.

## Our Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Stream Request Flow                       │
└─────────────────────────────────────────────────────────────┘

1. User requests content
   ↓
2. Fetch streams from sources (Torrentio, Debridio)
   ↓
3. Parse stream names for format information
   ↓
4. Analyze compatibility tier for each stream
   ↓
5. Filter by minimum tier requirement
   ↓
6. Sort by compatibility score
   ↓
7. Return best available streams
```

### Core Components

#### 1. Stream Compatibility Checker (`src/lib/utils/stream-compatibility.ts`)

**Purpose**: Centralized compatibility analysis and filtering

**Key Features**:
- Format detection from stream names (MP4, MKV, WebM, etc.)
- Codec detection (H.264, HEVC, AV1, etc.)
- Audio codec detection (AAC, DTS, AC3, etc.)
- Safari-specific compatibility rules
- Tier-based scoring system

**Compatibility Tiers**:

```typescript
enum CompatibilityTier {
  ULTRA_SAFE = 'ultra-safe',           // MP4 + H.264 + AAC
  SAFE = 'safe',                       // MP4 + H.264 + compatible audio
  RISKY = 'risky',                     // MP4 with potential issues
  TRANSCODING_REQUIRED = 'transcoding-required',
  INCOMPATIBLE = 'incompatible'        // Cannot be played
}
```

**Usage**:
```typescript
import { StreamCompatibilityChecker } from '@/lib/utils/stream-compatibility'

// Analyze a single stream
const result = StreamCompatibilityChecker.analyze(
  'Movie.2024.1080p.x264.AAC.mp4',
  isSafari
)
// Returns: { tier: 'ultra-safe', score: 100, canPlay: true, ... }

// Get best available streams
const filteredStreams = StreamCompatibilityChecker.getBestAvailableStreams(
  allStreams,
  isSafari,
  webSafeMode
)
```

#### 2. Enhanced Torrentio API (`src/lib/api/torrentio.ts`)

**Changes**:
- Accepts `AppConfig` to access web-safe mode settings
- Applies compatibility filtering to all stream results
- Logs compatibility decisions for debugging
- Passes Safari flag through the filtering chain

**Integration**:
```typescript
const torrentioAPI = new TorrentioAPI({
  providers: ['rarbg', '1337x'],
  debridService: 'realdebrid',
  apiKey: 'xxx',
  config: appConfig  // NEW: Pass app config
})

const streams = await torrentioAPI.getMovieStreams(imdbId, isSafari)
// Streams are automatically filtered for compatibility
```

#### 3. Enhanced Debridio API (`src/lib/api/debridio.ts`)

**Changes**:
- Accepts `AppConfig` in constructor
- Applies same compatibility filtering
- Handles direct URL streams from cached sources
- Safari-aware filtering

**Integration**:
```typescript
const debridioAPI = new DebridioAPI({
  manifestUrl: 'https://addon.debridio.com/xxx/manifest.json',
  appConfig: appConfig  // NEW: Pass app config
})

const streams = await debridioAPI.getMovieStreams(tmdbId, isSafari)
// Streams are automatically filtered for compatibility
```

#### 4. Configuration System (`src/lib/config.ts`)

**New Options**:
```typescript
interface AppConfig {
  // ... existing options ...
  webSafeMode?: boolean        // Only return ultra-safe streams
  allowTranscoding?: boolean   // Allow transcoding for incompatible formats
}
```

**Environment Variables**:
```bash
# Enable web-safe mode (only MP4+H.264+AAC streams)
NEXT_PUBLIC_WEB_SAFE_MODE=true

# Allow transcoding for incompatible formats (default: true)
NEXT_PUBLIC_ALLOW_TRANSCODING=false
```

## Format Detection Patterns

### Container Detection
```typescript
MP4:  /\.mp4\b/i
MKV:  /\.mkv\b/i
WebM: /\.webm\b/i
AVI:  /\.avi\b/i
MOV:  /\.mov\b/i
```

### Video Codec Detection
```typescript
H.264: /(x264|h\.?264|avc)/i
HEVC:  /(x265|h\.?265|hevc)/i
AV1:   /av1/i
VP9:   /vp9/i
VP8:   /vp8/i
```

### Audio Codec Detection
```typescript
AAC:    /aac/i
MP3:    /mp3/i
Opus:   /opus/i
AC3:    /ac3|dd5\.1/i
EAC3:   /eac3|ddp|dd\+/i
DTS:    /dts/i
TrueHD: /truehd/i
FLAC:   /flac/i
```

## Safari-Specific Handling

Safari has stricter requirements than other browsers:

### Absolute Incompatibilities
- **Remux files**: Too large, often have incompatible codecs
- **10-bit encoding**: Not supported in Safari's H.264 decoder
- **HDR metadata**: Not supported in web player context
- **MKV containers**: Never supported

### Audio Restrictions
Safari only reliably supports:
- AAC (preferred)
- MP3 (fallback)

Other formats (AC3, DTS, etc.) may not work even in MP4 containers.

## Web-Safe Mode

When enabled (`NEXT_PUBLIC_WEB_SAFE_MODE=true`), the system:

1. **Only returns ultra-safe and safe tier streams**
2. **Filters out all risky/transcoding streams**
3. **Prioritizes smallest compatible files**
4. **Logs all filtering decisions**

Use cases:
- Mobile devices with limited bandwidth
- Environments without transcoding capability
- Guaranteed playback reliability
- Testing/debugging

## Debugging

The system provides extensive console logging:

```javascript
// Compatibility analysis
🎯 [COMPATIBILITY] Analyzing 42 streams (Safari: true, WebSafe: false)
🎯 [COMPATIBILITY] Using tier: safe (18 streams)

// Torrentio filtering
🎯 [TORRENTIO] Applying compatibility filtering: { totalStreams: 42, isSafari: true, webSafeMode: false }
🎯 [TORRENTIO] Filtering complete: 18 compatible streams
🎯 [TORRENTIO] Sample streams: [
  'Movie.2024.1080p.x264.AAC.mp4 [ultra-safe]',
  'Movie.2024.720p.h264.aac.mp4 [ultra-safe]',
  'Movie.2024.1080p.x264.AC3.mp4 [safe]'
]

// Debridio filtering
🎯 [DEBRIDIO] Applying compatibility filtering: { totalStreams: 15, isSafari: true, webSafeMode: false }
🎯 [DEBRIDIO] Filtering complete: 12 compatible streams
```

## Migration Guide

### For Existing Code

**Before**:
```typescript
const streams = await torrentioAPI.getMovieStreams(imdbId)
```

**After** (with Safari detection):
```typescript
const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
const streams = await torrentioAPI.getMovieStreams(imdbId, isSafari)
```

**After** (with app config):
```typescript
import { getConfig } from '@/lib/config'

const config = getConfig()
const torrentioAPI = new TorrentioAPI({
  // ... existing options ...
  config: config
})
```

### For New Features

Always pass Safari flag and use the compatibility checker:

```typescript
import { StreamCompatibilityChecker } from '@/lib/utils/stream-compatibility'

// Analyze stream before use
const compatibility = StreamCompatibilityChecker.analyze(stream.name, isSafari)

if (!compatibility.canPlay) {
  // Handle incompatible stream
  console.warn('Stream not compatible:', compatibility.issues)
}
```

## Performance Considerations

### Filtering Overhead
- Compatibility analysis is O(n) per stream
- Regex matching is fast but not free
- Pre-filtering reduces downstream processing

### Caching Strategy
- Compatibility results could be cached by stream name
- Consider implementing LRU cache for repeated requests
- Cache duration: 5-10 minutes (streams don't change often)

### Optimization Tips
1. Filter early (at API level) before other processing
2. Use tier-based short-circuiting (stop at first valid tier)
3. Log sample streams only (not all streams)
4. Consider parallel analysis for large stream lists

## Testing

### Test Cases

1. **Ultra-safe streams** (should always pass)
   - `Movie.2024.1080p.x264.AAC.mp4`
   - `Show.S01E01.720p.h264.aac.mp4`

2. **Safe streams** (should pass except Safari audio issues)
   - `Movie.2024.1080p.x264.AC3.mp4`
   - `Show.S01E01.1080p.h264.opus.mp4`

3. **Risky streams** (may fail)
   - `Movie.2024.2160p.x265.AAC.mp4` (HEVC)
   - `Movie.2024.1080p.x264.DTS.mp4` (bad audio)

4. **Incompatible streams** (should be filtered)
   - `Movie.2024.1080p.x264.mkv` (MKV container)
   - `Movie.2024.1080p.AV1.mp4` (AV1 codec)
   - `Movie.2024.REMUX.mkv` (remux)

### Manual Testing

```bash
# Enable debug logging
localStorage.setItem('debug', 'stream:*')

# Test with web-safe mode
NEXT_PUBLIC_WEB_SAFE_MODE=true npm run dev

# Test Safari filtering
# Use Safari browser or spoof user agent
```

## Future Enhancements

### Potential Improvements

1. **Format Probing**
   - Use HEAD requests to check actual file format
   - Validate container/codec claims from stream name

2. **Client Capability Detection**
   - Use Media Source Extensions API to test codec support
   - Dynamic compatibility based on browser features

3. **Smart Fallbacks**
   - If no compatible streams, offer transcoding option
   - Progressive enhancement (try risky → fallback to safe)

4. **Performance Metrics**
   - Track compatibility analysis time
   - Monitor filtering effectiveness
   - A/B test different tier thresholds

5. **User Preferences**
   - Allow users to override compatibility filtering
   - Quality vs. compatibility slider
   - "Advanced mode" for power users

## Troubleshooting

### No Streams Found

**Symptom**: All streams filtered out

**Causes**:
1. Web-safe mode too restrictive
2. Safari filtering too aggressive
3. Source only has incompatible streams

**Solutions**:
```bash
# Disable web-safe mode
NEXT_PUBLIC_WEB_SAFE_MODE=false

# Allow transcoding
NEXT_PUBLIC_ALLOW_TRANSCODING=true

# Check source streams (debug mode)
```

### Playback Fails Despite Compatible Stream

**Symptom**: Stream marked as compatible but won't play

**Causes**:
1. Stream name misleading (claims MP4 but is MKV)
2. Network issues (CORS, connectivity)
3. Codec profile not supported (High 10 Profile H.264)

**Solutions**:
1. Add format probing (HEAD request)
2. Validate stream name patterns
3. Test with multiple browsers

### Safari Specific Issues

**Symptom**: Works in Chrome but not Safari

**Causes**:
1. Audio codec not supported (AC3, DTS)
2. HEVC hardware support missing
3. 10-bit encoding

**Solutions**:
1. Enable Safari-specific filtering
2. Use ultra-safe mode on Safari
3. Provide transcoding fallback

## References

- [Stremio Web Player](https://web.stremio.com)
- [MDN: Media formats for HTML audio/video](https://developer.mozilla.org/en-US/docs/Web/Media/Formats)
- [Safari HTML5 Audio/Video Guide](https://developer.apple.com/documentation/webkit/safari_html5_audio_and_video_guide)
- [Can I Use: Video formats](https://caniuse.com/?search=video)

## Conclusion

By implementing Stremio's web streaming approach, we've significantly improved stream compatibility and playback reliability. The tier-based system provides flexibility while ensuring users get the best possible playback experience without manual format selection.

Key benefits:
- ✅ Automatic format filtering
- ✅ Safari compatibility
- ✅ Graceful degradation
- ✅ Clear debugging information
- ✅ Configuration flexibility
- ✅ Works with both Torrentio and Debridio
