# VideoPlayerV2 - Quick Start Guide

## 🎯 What We Built

A **brand new video player** built completely from scratch with **audio compatibility for Chrome and Safari as the #1 priority**.

## 📦 What's New

### Three Independent Controllers

1. **AudioController** (`src/lib/controllers/audio-controller.ts`)
   - Chrome/Safari audio detection
   - Volume and mute control
   - Audio track management
   - Real-time audio health monitoring

2. **StreamController** (`src/lib/controllers/stream-controller.ts`)
   - HLS.js for Chrome
   - Native HLS for Safari
   - MP4 progressive download
   - Quality level control

3. **SubtitleController** (`src/lib/controllers/subtitle-controller.ts`)
   - VTT and SRT parsing
   - Multiple track support
   - Custom styling
   - Time-synchronized display

### New Component

**VideoPlayerV2** (`src/components/video-player-v2.tsx`)
- Modern React with hooks
- Clean controller integration
- Full keyboard shortcuts
- Auto-hide controls
- Loading states and error handling

## 🚀 How to Use

### Basic Usage

```tsx
import VideoPlayerV2 from '@/components/video-player-v2'

function MyComponent() {
  return (
    <VideoPlayerV2
      src="https://example.com/video.m3u8"
      title="My Video"
      onClose={() => console.log('Closed')}
    />
  )
}
```

### With All Options

```tsx
<VideoPlayerV2
  src="https://example.com/video.m3u8"
  title="My Video"
  onClose={handleClose}
  autoPlay={true}
  startTime={30}
  subtitles={[
    {
      id: 'en',
      label: 'English',
      language: 'en',
      src: '/subtitles/en.vtt',
      kind: 'subtitles'
    }
  ]}
  onTimeUpdate={(time) => console.log('Time:', time)}
  onEnded={() => console.log('Ended')}
/>
```

## 🧪 Testing

### Test Page Available

Visit: `/test-player-v2`

This page includes:
- Multiple test streams (HLS and MP4)
- Custom URL input
- Browser detection
- Testing checklist
- Console log guide

### Quick Test in Chrome

1. Open http://localhost:3000/test-player-v2
2. Click "Apple HLS Test Stream" or "Big Buck Bunny"
3. Check console for `🎵 AudioController` logs
4. Verify audio plays immediately
5. Test volume controls

### Quick Test in Safari

1. Open http://localhost:3000/test-player-v2
2. Click any test stream
3. Check console for `📺 Using native HLS playback`
4. Verify audio works
5. Test all controls

## 🔊 Audio Features (Main Priority)

### Chrome
- ✅ Uses `webkitAudioDecodedByteCount` for detection
- ✅ HLS.js with audio-optimized config
- ✅ Monitors audio bytes every second
- ✅ Auto-unmute on user interaction

### Safari
- ✅ Native HLS support (best performance)
- ✅ Uses `webkitAudioDecodedByteCount` + `audioTracks` API
- ✅ Safari-specific optimizations
- ✅ Respects autoplay policies

### Both
- ✅ Aggressive unmuting on first interaction
- ✅ Volume never stays at 0 during playback
- ✅ Real-time audio health monitoring
- ✅ Clear console logging for debugging

## 📋 Key Differences from Old Player

| Feature | Old Player | New Player (V2) |
|---------|-----------|-----------------|
| **Architecture** | Monolithic (1352 lines) | Modular controllers |
| **Audio Init** | After video loads | At correct moment |
| **Browser Handling** | Generic | Chrome/Safari specific |
| **Audio Detection** | Basic | Multi-method detection |
| **HLS on Safari** | HLS.js fallback | Native (optimal) |
| **Type Safety** | Partial | Full TypeScript |
| **Maintainability** | Difficult | Easy (separated concerns) |

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` or `K` | Play/Pause |
| `←` | Seek backward 10s |
| `→` | Seek forward 10s |
| `↑` | Volume up 10% |
| `↓` | Volume down 10% |
| `M` | Toggle mute |
| `F` | Toggle fullscreen |

## 🐛 Debugging

### Check Console Logs

Look for these prefixes:
- `🎵` = AudioController
- `📺` = StreamController
- `📝` = SubtitleController
- `🔊` = Volume changes

### Audio Not Working?

1. Check if `🎵 Audio presence check` shows `canPlayAudio: true`
2. Look for `webkitAudioBytes` > 0 (Chrome/Safari)
3. Try clicking the video (user gesture may be required)
4. Check browser console for errors

### Stream Not Loading?

1. Verify URL is correct
2. Check CORS headers (cross-origin)
3. Try in different browser
4. Check network tab for 404/403 errors

## 📁 File Structure

```
src/
├── lib/
│   └── controllers/
│       ├── audio-controller.ts      # Audio management
│       ├── stream-controller.ts     # Stream loading
│       └── subtitle-controller.ts   # Subtitle handling
├── components/
│   └── video-player-v2.tsx          # Main component
└── app/
    └── test-player-v2/
        └── page.tsx                  # Test page
```

## 📚 Documentation

Full documentation: `VIDEO_PLAYER_V2_DOCUMENTATION.md`

Includes:
- Complete API reference
- Architecture details
- Browser compatibility
- Migration guide
- Troubleshooting

## ✅ What's Tested

- ✅ HLS streams (Chrome with HLS.js)
- ✅ HLS streams (Safari native)
- ✅ MP4 progressive download
- ✅ Audio detection and playback
- ✅ Volume controls
- ✅ Subtitle loading (VTT/SRT)
- ✅ Timeline scrubbing
- ✅ Keyboard shortcuts
- ✅ Fullscreen mode
- ✅ Error handling
- ✅ TypeScript compilation

## 🎉 Next Steps

1. **Test with your streams**
   ```bash
   npm run dev
   # Visit http://localhost:3000/test-player-v2
   ```

2. **Try both browsers**
   - Chrome: Check HLS.js usage
   - Safari: Check native HLS usage

3. **Check console logs**
   - Verify audio detection
   - Monitor byte counts
   - Check for errors

4. **Replace old player** (when ready)
   - Update imports to `video-player-v2`
   - Update subtitle prop format
   - Test all features

## 🔗 Quick Links

- Test Page: `/test-player-v2`
- Full Docs: `VIDEO_PLAYER_V2_DOCUMENTATION.md`
- AudioController: `src/lib/controllers/audio-controller.ts`
- StreamController: `src/lib/controllers/stream-controller.ts`
- SubtitleController: `src/lib/controllers/subtitle-controller.ts`
- Main Component: `src/components/video-player-v2.tsx`

---

**Built from scratch with audio as top priority** 🔊🎬
