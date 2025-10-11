# New Video Player Architecture - Audio-First Design

## Overview
Complete rebuild of the video player with **audio as the top priority**. The new architecture ensures flawless audio playback across Chrome and Safari browsers.

## Core Principles
1. **Audio-First**: Audio initialization happens BEFORE video initialization
2. **Cross-Browser Native Support**: No hacks - proper audio handling for each browser
3. **Aggressive Unmuting**: Proactive audio management with user gesture handling
4. **Clean Separation**: Distinct managers for audio, video, subtitles, and controls
5. **Modern API Usage**: Leveraging native browser APIs for optimal performance

## Architecture Components

### 1. AudioManager Class
**Purpose**: Centralized audio management with browser-specific optimizations

**Key Features**:
- Detects and initializes audio tracks
- Handles volume control and muting
- Browser-specific audio codec detection (Chrome vs Safari)
- Aggressive unmute on user interaction
- Audio track switching
- Monitoring audio playback health

**API**:
```typescript
class AudioManager {
  initialize(videoElement: HTMLVideoElement): Promise<void>
  setVolume(level: number): void
  toggleMute(): void
  selectAudioTrack(trackId: string): void
  getAudioTracks(): AudioTrack[]
  isAudioPlaying(): boolean
  forceUnmute(): void
}
```

### 2. SubtitleManager Class
**Purpose**: Handle all subtitle functionality independently

**Key Features**:
- Parse SRT and VTT formats
- Real-time subtitle display based on currentTime
- Track selection and management
- Styling and positioning
- External subtitle loading

**API**:
```typescript
class SubtitleManager {
  loadSubtitles(url: string): Promise<void>
  getCurrentSubtitle(currentTime: number): string | null
  selectTrack(trackId: string): void
  getAvailableTracks(): SubtitleTrack[]
  disable(): void
}
```

### 3. StreamManager Class
**Purpose**: Intelligent stream initialization with audio priority

**Key Features**:
- HLS detection and initialization (using hls.js)
- Native playback fallback
- Safari-specific optimizations
- Progressive MP4 handling
- Audio codec verification before playback starts
- Automatic quality selection

**API**:
```typescript
class StreamManager {
  initialize(src: string, videoElement: HTMLVideoElement): Promise<void>
  isHLS(url: string): Promise<boolean>
  destroy(): void
  getStreamInfo(): StreamInfo
}
```

### 4. VideoPlayerCore Component
**Purpose**: Orchestrate all managers and handle UI

**Responsibilities**:
- Initialize managers in correct order (Audio → Stream → Subtitles → UI)
- Handle user interactions
- Manage playback state
- Progress tracking
- Control visibility and timeouts

## Audio Initialization Flow

```
1. User opens video
   ↓
2. StreamManager analyzes URL and codec information
   ↓
3. AudioManager pre-verifies audio track availability
   ↓
4. Video element created with audio-enabled attributes
   ↓
5. Stream attached with audio priority flags
   ↓
6. AudioManager aggressively unmutes on first user gesture
   ↓
7. Continuous audio health monitoring
   ↓
8. Fallback to transcoded stream if audio fails
```

## Browser-Specific Handling

### Chrome/Chromium
- Use `webkitAudioDecodedByteCount` for audio verification
- Support for wider codec range
- HLS.js preferred for HLS streams
- Aggressive autoplay with fallback to muted

### Safari
- Native HLS support preferred
- H.264 + AAC codec verification
- More restrictive autoplay policies
- Direct audio track API usage
- Immediate user gesture capture

## Key Improvements Over Old Player

| Aspect | Old Player | New Player |
|--------|-----------|------------|
| Audio Init | After video loads | Before video loads |
| Unmuting | Passive | Aggressive on gesture |
| Audio Detection | Delayed checks | Immediate verification |
| Browser Support | Generic handling | Browser-specific optimizations |
| Audio Fallback | Manual button | Automatic with retry |
| Codec Support | Assumed compatibility | Pre-verified compatibility |
| Error Recovery | Limited retries | Smart fallback chain |
| Code Structure | Monolithic | Modular managers |

## Maintained Features
- Exact same UI/UX appearance
- Intro skip functionality
- Next episode autoplay
- Volume control with slider
- Subtitle styling and customization
- Progress tracking
- Playback speed control
- Picture-in-picture
- Fullscreen support
- Keyboard shortcuts
- Timeline scrubbing with preview

## Technical Stack
- React 18 with hooks
- TypeScript for type safety
- HLS.js 1.5+ for HLS streams
- Native HTML5 Video API
- CSS for Netflix-style UI (maintained)

## Success Criteria
✅ Audio works immediately on Chrome (no delay)
✅ Audio works immediately on Safari (no compatibility issues)
✅ Volume controls work flawlessly
✅ Audio tracks can be switched seamlessly
✅ Subtitles display correctly with all features
✅ UI looks identical to current player
✅ All keyboard shortcuts work
✅ Progress tracking maintains functionality
✅ Error recovery is automatic and smart
