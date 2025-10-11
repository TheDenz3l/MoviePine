# ⚠️ RESTART REQUIRED

## Environment Variables Changed

The `.env.local` file has been updated with web-safe mode settings, but **Next.js only reads environment variables at startup**.

## How to Apply Changes

### Option 1: Restart Dev Server (Recommended)
```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Option 2: Hard Restart
```bash
# Kill all Node processes
pkill -f "node"

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

## What Will Change

After restarting with the new environment variables:

✅ **`NEXT_PUBLIC_WEB_SAFE_MODE=true`**
- Only MP4/H.264/AAC streams will be returned
- MKV files will be completely filtered out

✅ **`NEXT_PUBLIC_ALLOW_TRANSCODING=false`**
- Streams requiring transcoding will be rejected
- Only browser-native formats allowed

## Verify It's Working

After restart, check the console for:
```
🔧 Torrentio configuration: ...
🎯 Web-safe mode enabled: will filter for browser-compatible streams only
```

And when fetching streams:
```
🎯 [TORRENTIO] Applying compatibility filtering: {
  totalStreams: 25,
  isSafari: false,
  webSafeMode: true  ← Should be TRUE
}
```

Then you should see:
```
🎯 [COMPATIBILITY] Using tier: ultra-safe (X streams)
```

Instead of "transcoding-required"

## Current Issue

Your console shows:
- `webSafeMode: false` ❌ (should be true)
- Using tier: "transcoding-required" ❌ (should be "ultra-safe")
- Selected an MKV file ❌ (should be filtered out)

This is because the server hasn't reloaded the new environment variables yet.
