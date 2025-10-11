# Debugging "No Streams Available" Issue 🔍

## The Problem

You're getting "No streams available" errors when trying to play movies, even though Debridio is configured.

## Root Cause Analysis

### Issue #1: Next.js Environment Variable Caching ⚠️
**Next.js caches environment variables at build/start time!**

When you added `NEXT_PUBLIC_DEBRIDIO_API_KEY` to `.env.local`, the dev server was already running with the **old** config (without Debridio keys).

**Solution**: ✅ **Dev server has been restarted** to pick up new env vars

### Issue #2: The Movie Doesn't Exist Yet 🎬
**"The Fantastic 4: First Steps"** (`tmdb_617126`) is an **unreleased movie** (releases July 25, 2025).

- ❌ No torrents exist yet (movie not released)
- ❌ No streams in Debridio (no torrents = no streams)
- ❌ No streams in Torrentio (no torrents = no streams)
- ❌ Real-Debrid can't cache what doesn't exist

**This is expected behavior!** Even with Debridio working, unreleased movies won't have streams.

## What Was Fixed

### 1. Added Debug Logging
**`src/lib/config.ts`** - Now logs environment variables:
```typescript
console.log('🔧 [CONFIG] Reading environment variables:', {
  hasDebridioApiKey: !!process.env.NEXT_PUBLIC_DEBRIDIO_API_KEY,
  debridioEnabled: debridioEnabled,
  debridioEnabledRaw: process.env.NEXT_PUBLIC_DEBRIDIO_ENABLED
})
```

**`src/lib/services/streaming.ts`** - Now logs config on initialization:
```typescript
console.log('🔧 [STREAMING SERVICE] Initializing with config:', {
  hasTmdbApiKey: !!config.tmdbApiKey,
  hasTorboxApiKey: !!config.torboxApiKey,
  hasDebridApiKey: !!config.debridApiKey,
  debridService: config.debridService,
  hasDebridioApiKey: !!config.debridioApiKey,
  debridioEnabled: config.debridioEnabled,
  torrentioProviders: config.torrentioProviders?.length || 0
})
```

### 2. Restarted Dev Server
✅ **Dev server restarted** - Now reading fresh environment variables

## How to Verify Debridio is Working

### Step 1: Check Console on Page Load
Refresh your browser and look for these logs:

```
🔧 [CONFIG] Reading environment variables:
  hasDebridioApiKey: true
  debridioEnabled: true

🔧 [STREAMING SERVICE] Initializing with config:
  hasDebridioApiKey: true
  debridioEnabled: true

🎬 [DEBRIDIO] Initialized - will use Debridio for stream sources
✅ [DEBRIDIO] Connection test successful
```

If you see these, **Debridio is working!** ✅

### Step 2: Try a Released Movie
Try playing a **popular released movie** instead of an unreleased one:

**Good Test Movies:**
- **Spider-Man: No Way Home** (2021) - `tmdb_634649`
- **Avengers: Endgame** (2019) - `tmdb_299534`
- **The Batman** (2022) - `tmdb_414906`
- **Deadpool & Wolverine** (2024) - `tmdb_533535`

These movies are released and should have many streams!

### Step 3: Watch for Debridio Logs
When you click play, you should see:

```
🎬 [DEBRIDIO] Attempting to fetch streams from Debridio...
🔍 [DEBRIDIO] Fetching movie streams: https://debridio.com/.../stream/movie/XXXXX.json
✅ [DEBRIDIO] Found 15 streams for movie XXXXX
✅ [DEBRIDIO] Using Debridio streams (cached/ready to play)
```

If you see "No streams found", it means:
- Either Debridio doesn't have that movie
- OR it will fallback to Torrentio

## Expected Behavior

### Scenario A: Movie Has Streams ✅
```
User clicks play
  ↓
🎬 [DEBRIDIO] Attempting to fetch streams...
  ↓
✅ [DEBRIDIO] Found 15 streams
  ↓
🎬 Opening player
  ↓
NetflixPlayer shows video
```

### Scenario B: Movie Not in Debridio ⚠️
```
User clicks play
  ↓
🎬 [DEBRIDIO] Attempting to fetch streams...
  ↓
⚠️ [DEBRIDIO] No streams found, falling back to Torrentio
  ↓
🔄 Searching streams with Torrentio...
  ↓
Either: ✅ Found torrents → Try Real-Debrid caching
    OR: ❌ No torrents → "No streams available"
```

### Scenario C: Unreleased Movie ❌
```
User clicks play
  ↓
🎬 [DEBRIDIO] Attempting to fetch streams...
  ↓
⚠️ [DEBRIDIO] No streams found (movie not released)
  ↓
🔄 Trying Torrentio...
  ↓
❌ No streams found (no torrents exist yet)
  ↓
❌ No streams available for "Movie Title"
```

**This is expected!** Unreleased movies = no torrents = no streams

## Diagnostic Checklist

Run through this checklist:

### ✅ Environment Variables
```bash
# Check .env.local has these lines:
NEXT_PUBLIC_DEBRIDIO_API_KEY=80413e3ac888e3240241b7dc8d695a1d
NEXT_PUBLIC_DEBRIDIO_ENABLED=true
```

### ✅ Dev Server Restarted
```bash
# Kill old server
pkill -f "next dev"

# Start fresh
npm run dev
```

### ✅ Browser Console Shows Init Logs
Refresh browser and check for:
- `🔧 [CONFIG] Reading environment variables`
- `🎬 [DEBRIDIO] Initialized`
- `✅ [DEBRIDIO] Connection test successful`

### ✅ Try Released Movie
- Don't use "The Fantastic 4: First Steps" (unreleased)
- Use Spider-Man, Avengers, Batman, etc.

### ✅ Watch Console on Play
- Look for `🎬 [DEBRIDIO] Attempting to fetch streams...`
- If you see this, Debridio is working!

## Common Issues & Solutions

### Issue: No Debridio init logs
**Problem**: Debridio not initialized  
**Solution**: Restart dev server (`npm run dev`)

### Issue: "No streams available" for all movies
**Problem**: Trying unreleased movies  
**Solution**: Try popular released movies

### Issue: Debridio returns no streams
**Problem**: Movie not in Debridio database  
**Solution**: Normal behavior, Torrentio fallback will try

### Issue: Still shows old behavior
**Problem**: Browser cache  
**Solution**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Next Steps

1. ✅ **Dev server is running** with new env vars
2. 🔄 **Refresh your browser** (hard refresh: Cmd+Shift+R)
3. 👀 **Check console** for init logs
4. 🎬 **Try a popular movie** (not Fantastic Four)
5. 📊 **Watch console logs** during playback

## Test Movies That Should Work

Try these **released, popular movies**:

| Movie | TMDB ID | Why It Should Work |
|-------|---------|-------------------|
| Spider-Man: No Way Home | tmdb_634649 | Very popular, many streams |
| Deadpool & Wolverine | tmdb_533535 | Recent, popular |
| The Batman | tmdb_414906 | Popular, many streams |
| Avengers: Endgame | tmdb_299534 | Extremely popular |
| Top Gun: Maverick | tmdb_361743 | Popular, recent |

## Expected Console Output

When everything is working correctly:

```javascript
// On page load:
🔧 [CONFIG] Reading environment variables: { hasDebridioApiKey: true, debridioEnabled: true }
🔧 [STREAMING SERVICE] Initializing with config: { hasDebridioApiKey: true, debridioEnabled: true, ... }
🎬 [DEBRIDIO] Initialized - will use Debridio for stream sources
✅ [DEBRIDIO] Connection test successful

// When clicking play on Spider-Man:
🎬 Play button clicked: { movieIdOrUrl: 'tmdb_634649', ... }
📡 Fetching streaming URL for ID: tmdb_634649
✅ Config loaded, creating streaming service...
🔍 Getting streaming URL... { movieId: 'tmdb_634649', isSafari: false }
🎬 [DEBRIDIO] Attempting to fetch streams from Debridio...
🔍 [DEBRIDIO] Fetching movie streams: https://debridio.com/.../stream/movie/634649.json
✅ [DEBRIDIO] Found 25 streams for movie 634649
✅ [DEBRIDIO] Using Debridio streams (cached/ready to play)
🔗 PREPARING STREAM: ...
🎬 Opening player with URL: ...
```

---

## Summary

The issue was:
1. ❌ **Dev server not restarted** after adding Debridio env vars
2. ❌ **Testing unreleased movie** (no streams exist anywhere)

The fix:
1. ✅ **Restarted dev server** to pick up new env vars
2. ✅ **Added debug logging** to diagnose config issues
3. ✅ **Ready to test with released movies**

**Try playing Spider-Man or Avengers now!** 🚀

