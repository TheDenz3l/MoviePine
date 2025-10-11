# Video Player Rebuild - Quick Reference

## What Changed

**OLD PLAYER** (1088 lines, monolithic)
- Audio initialized after video loads
- Generic browser handling
- Mixed concerns in one file
- Passive audio handling
- Limited error recovery

**NEW PLAYER** (Modular, audio-first)
- Audio initialized BEFORE video loads
- Browser-specific optimizations
- Separated managers (audio, subtitle, stream)
- Aggressive audio unmuting
- Smart fallback chain

## New Files

```
src/lib/audio-manager.ts       - Audio engine (350 lines)
src/lib/subtitle-manager.ts    - Subtitle handler (380 lines)
src/lib/stream-manager.ts      - Stream initializer (280 lines)
src/components/video-player.tsx - Main component (1250 lines)
```

## Key Features

### AudioManager
```typescript
// Initialize audio FIRST
await audioManager.initialize(videoElement)

// Aggressive unmute on user gesture
audioManager.forceUnmute()

// Detect audio capability
const capability = audioManager.detectAudioCapability()
// Returns: { hasAudio, method, audioTracks, webkitAudioBytes, canPlayAudio }

// Control volume
audioManager.setVolume(0.8)
audioManager.toggleMute()
audioManager.selectAudioTrack(trackId)

// Monitor health
// Automatically checks every 1 second:
// - webkitAudioDecodedByteCount > 0
// - Audio track availability
// - Playback state
```

### SubtitleManager
```typescript
// Initialize and add tracks
subtitleManager.initialize(videoElement)
subtitleManager.addExternalTracks([...tracks])

// Select and load
await subtitleManager.selectTrack(trackId)

// Real-time updates (250ms intervals)
// Automatically syncs with video.currentTime
```

### StreamManager
```typescript
// Initialize stream
const streamInfo = await streamManager.initialize(src, videoElement)

// Returns:
// { isHLS, strategy, hasAudio, codec?, error? }

// Strategy options:
// - 'hlsjs'   : Chrome with hls.js
// - 'native'  : Safari native HLS
// - 'direct'  : Progressive MP4
```

## Initialization Sequence

```javascript
1. Create managers
   audioManager = new AudioManager()
   subtitleManager = new SubtitleManager()
   streamManager = new StreamManager()

2. Initialize audio FIRST
   await audioManager.initialize(video)

3. Initialize stream
   await streamManager.initialize(src, video)

4. Initialize subtitles
   subtitleManager.initialize(video)
   subtitleManager.addExternalTracks(realSubtitles)

5. Handle autoplay
   - Try unmuted play
   - Fallback to muted play
   - Require user gesture

6. Aggressive unmute on first click
   audioManager.forceUnmute()
```

## Browser Specifics

### Chrome/Chromium
- Uses `webkitAudioDecodedByteCount` for verification
- hls.js for HLS streams
- Monitors audio bytes continuously

### Safari
- Native HLS support
- Direct audio track API
- H.264 + AAC optimization
- Stricter autoplay policies

## Testing Checklist

**Audio:**
- [ ] Plays immediately (no delay)
- [ ] Volume slider works
- [ ] Mute toggle functions
- [ ] Track switching works
- [ ] No audio warnings

**Subtitles:**
- [ ] Tracks load correctly
- [ ] Text displays in sync
- [ ] Styling applies properly
- [ ] Track switching works

**Playback:**
- [ ] Play/pause
- [ ] Timeline scrubbing
- [ ] Keyboard shortcuts
- [ ] Speed adjustment
- [ ] PiP mode
- [ ] Fullscreen

**Features:**
- [ ] Progress tracking
- [ ] Intro skip
- [ ] Next episode
- [ ] Error recovery

## Console Logs

Watch for these in browser console:

```
🔊 [AudioManager] - Audio operations
📝 [SubtitleManager] - Subtitle operations
🎬 [StreamManager] - Stream operations

✅ Success
⚠️ Warning
❌ Error
```

## Common Issues & Solutions

**No Audio:**
1. Check console for audio detection logs
2. Verify webkitAudioDecodedByteCount > 0
3. Ensure volume > 0 and not muted
4. Try manual unmute click

**Subtitles Not Showing:**
1. Check subtitle file loaded successfully
2. Verify track selection (not 'off')
3. Check currentTime within cue range
4. Look for parsing errors in console

**Stream Won't Play:**
1. Check stream initialization logs
2. Verify HLS detection (if applicable)
3. Check for CORS issues
4. Try manual retry

## Rollback

```bash
cd "/Users/bmar/Documents/movieplayer copy"
mv src/components/video-player.tsx src/components/video-player-new.tsx
mv src/components/video-player-old-backup.tsx src/components/video-player.tsx
```

## Architecture Benefits

✅ **Modular**: Each manager = single responsibility
✅ **Testable**: Managers can be unit tested
✅ **Maintainable**: Clear code organization
✅ **Extensible**: Easy to add features
✅ **Type-Safe**: Full TypeScript
✅ **Cross-Browser**: Adapts automatically

---

**Status**: ✅ Complete
**Server**: Running on http://localhost:3000
**Ready**: For testing in Chrome and Safari
