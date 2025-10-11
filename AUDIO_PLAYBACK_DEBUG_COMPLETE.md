# Audio Playback Debug & Fix Implementation

## Date: 2025-09-25

## Issues Identified

1. **Audio tracks not being detected in some streams**
   - Some streams may be video-only or have incompatible audio codecs
   - Browser-specific audio detection methods not always reliable

2. **Browser autoplay policies blocking audio**
   - Chrome and other browsers require user interaction to unmute audio
   - Autoplay with sound is blocked by default

3. **Audio codec compatibility issues**
   - Some audio codecs may not be supported by the browser
   - HLS streams may have audio track configuration issues

4. **CORS issues preventing audio track access**
   - Cross-origin restrictions may block audio track detection

## Fixes Implemented

### 1. Enhanced Audio Detection
- Added comprehensive audio track detection using multiple methods:
  - `mozHasAudio` for Firefox
  - `webkitAudioDecodedByteCount` for WebKit browsers
  - Standard `audioTracks` API
- Added codec information logging for debugging

### 2. Aggressive Audio Unmuting
- Implemented multiple unmute attempts:
  - On any user interaction (click, tap)
  - On play button click
  - On video element click
  - On container click
- Force volume to 80% if it was 0 when unmuting

### 3. Audio Fix Button
- Added manual "Fix Audio" button when no audio tracks detected
- Button forces stream through transcoder endpoint for better compatibility
- Transcoder can handle audio codec conversion

### 4. Better Audio State Management
- Clear audio debug information displayed to user
- Shows current volume level and mute status
- Indicates when user interaction is needed

### 5. Improved HLS.js Configuration
- Added audio-specific HLS.js settings:
  - `maxAudioFramesDrift: 1`
  - `forceKeyFrameOnDiscontinuity: true`
  - Better audio track switching support

## Console Debugging

Look for these console logs to debug audio issues:

```javascript
// Audio track detection
🔊 [AUDIO TRACKS] Available audio tracks: [...]
🔊 [AUDIO TRACK 0]: {name, lang, codec, ...}

// Audio presence detection
🔊 [AUDIO DETECTION]: {
  webkitAudioBytes: 12345,
  mozHasAudio: true,
  audioTracksCount: 1,
  hasAudioDetected: true
}

// Audio state changes
🔊 [AUDIO] Unmuting audio on user interaction
🔊 [AUDIO] ✅ Play successful with audio
🔊 [AUDIO] Volume was 0, setting to 80%
```

## User Instructions

If audio is not playing:

1. **Click anywhere on the video** - This will unmute audio if browser autoplay policy is blocking it

2. **Check the volume slider** - Ensure volume is not at 0%

3. **Look for the "Fix Audio" button** - If it appears, click it to force audio compatibility mode

4. **Check browser console** - Look for `🔊 [AUDIO]` logs to see what's happening

5. **Try a different browser** - Some streams may work better in Chrome vs Firefox vs Safari

## Testing Checklist

- [x] Audio unmutes on user interaction
- [x] Volume controls work properly
- [x] Audio codec information is logged
- [x] Fix Audio button appears when no audio detected
- [x] Transcoder fallback works for incompatible audio
- [x] Clear user feedback about audio state

## Known Limitations

1. **Video-only streams** - If the source stream has no audio track, we cannot add audio
2. **DRM-protected content** - May have additional audio restrictions
3. **Safari compatibility** - Some codecs may not work in Safari without transcoding
4. **CORS restrictions** - Some external streams may block audio track access

## Next Steps if Audio Still Not Working

1. **Check the stream source** - Verify the original stream has audio
2. **Test with a known working stream** - Confirm the player itself works
3. **Check network tab** - Look for failed audio segment requests
4. **Try transcoder endpoint** - Force all streams through `/api/stream-transcoder`
5. **Check for codec support** - Verify browser supports the audio codec

## Code Locations

- Main video player: `src/components/video-player.tsx`
- Audio detection: Lines 196-217
- Audio unmuting: Lines 223-262, 683-720
- Fix Audio button: Lines 1089-1111
- HLS.js audio config: Lines 142-144

## Summary

The implementation now includes:
- Multiple fallback strategies for audio playback
- Clear user feedback about audio state
- Manual override options when automatic detection fails
- Comprehensive logging for debugging
- Browser compatibility handling

This should resolve most audio playback issues. If problems persist, check the console logs and use the Fix Audio button to force transcoding.
