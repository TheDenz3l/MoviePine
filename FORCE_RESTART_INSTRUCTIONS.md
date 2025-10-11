# 🚨 FORCE RESTART REQUIRED

Your console shows `webSafeMode: false` which means the environment variables aren't loading.

## Hard Restart Steps

```bash
# 1. Stop ALL Node processes
pkill -f "node"

# 2. Clear Next.js build cache
rm -rf .next

# 3. Clear npm cache (optional but recommended)
npm cache clean --force

# 4. Restart dev server
npm run dev
```

## Alternative: Add Logging to Verify

Add this to your `.env.local` to verify it's being read:

```bash
# Add at top of .env.local
NEXT_PUBLIC_DEBUG=true
```

Then add logging in `src/lib/config.ts` before the return statement:

```typescript
console.log('🔧 [ENV CHECK]:', {
  WEB_SAFE_MODE_RAW: process.env.NEXT_PUBLIC_WEB_SAFE_MODE,
  WEB_SAFE_MODE_PARSED: process.env.NEXT_PUBLIC_WEB_SAFE_MODE === 'true',
  ALLOW_TRANSCODING_RAW: process.env.NEXT_PUBLIC_ALLOW_TRANSCODING,
  ALLOW_TRANSCODING_PARSED: process.env.NEXT_PUBLIC_ALLOW_TRANSCODING !== 'false'
})
```

This will show if the env vars are being read at all.

## What You Should See After Restart

```
🔧 [ENV CHECK]: {
  WEB_SAFE_MODE_RAW: 'true',
  WEB_SAFE_MODE_PARSED: true,
  ...
}
🎯 Web-safe mode enabled: will filter for browser-compatible streams only
🎯 [TORRENTIO] Applying compatibility filtering: {
  webSafeMode: true  ← Must be TRUE
}
🎯 [COMPATIBILITY] Using tier: ultra-safe (X streams)
```

If you still see `webSafeMode: false`, the `.env.local` file may not be in the right location or has syntax errors.
