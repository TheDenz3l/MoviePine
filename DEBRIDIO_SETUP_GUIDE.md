# Debridio Setup Guide

## Issue Found
❌ **Debridio API key is returning 404 errors**
✅ **Real-Debrid is working perfectly** (Premium until Dec 2025)

## The Disconnect
The issue is that your Debridio API key (`80413e3ac888e3240241b7dc8d695a1d`) is not valid. Debridio has likely changed their authentication system or the key format has changed.

## How Debridio Works
Debridio is a Stremio addon that:
1. Connects to your Real-Debrid (or All-Debrid) account
2. Finds cached torrents that are instantly available
3. Returns direct streaming links powered by Real-Debrid

## Getting a New Debridio API Key

### Step 1: Visit Debridio
Go to: https://debridio.com/

### Step 2: Sign In / Sign Up
- Click "Sign In" or "Sign Up" button
- Create an account or log in

### Step 3: Link Your Real-Debrid Account
- Once logged in, you need to link your Real-Debrid account
- Navigate to Settings or Account settings
- Look for "Debrid Services" or "Link Debrid Account"
- Enter your Real-Debrid API key: `ZXQKIAEFASSIKM7RA2QZGD4S6SLZYMBGAN33VKZI7436JEEVKHOQ`

### Step 4: Get Your Debridio API Key
After linking Real-Debrid, Debridio should provide you with:
- An addon URL that looks like: `https://debridio.com/{YOUR_API_KEY}/manifest.json`
- The part between `/` and `/manifest.json` is your API key

### Step 5: Update .env.local
Replace the current key in your `.env.local`:
```bash
NEXT_PUBLIC_DEBRIDIO_API_KEY=your_new_api_key_here
```

## Alternative: Check Debridio Account Dashboard

If you already have a Debridio account:
1. Go to https://debridio.com/ and sign in
2. Look for:
   - "Dashboard"
   - "Addons"
   - "API Keys"
   - "Stremio Configuration"
3. You should see your addon URL or API key there

## Alternative Solution: Use Torrentio Directly

Since Real-Debrid is working perfectly, you could also:
1. Use Torrentio to find torrents
2. Have the app automatically resolve them through Real-Debrid
3. This already works in your current setup!

The flow would be:
```
Movie Request → Torrentio (finds torrents) → Real-Debrid (resolves to direct links) → Player
```

Your app already has this implemented in `src/lib/services/streaming.ts`

## Testing After Getting New Key

Once you have the new API key, run the test again:
```bash
node test-debridio-realdebrid.js
```

You should see:
```
✅ Debridio Connection: PASS
✅ Real-Debrid Connection: PASS
✅ Debridio Streams: PASS
✅ Integration Flow: PASS
```

## Current Status

### What's Working ✅
- Real-Debrid API connection
- Real-Debrid account (Premium, active)
- Torrentio integration
- Stream resolution through Real-Debrid
- Video player

### What's Not Working ❌
- Debridio API connection (invalid API key)
- Getting cached streams from Debridio

### Impact
Without Debridio working:
- ❌ No instant cached streams from Debridio
- ✅ But Torrentio + Real-Debrid still works!
- ✅ Movies will still play, just might take 1-2 seconds longer

## Next Steps

1. **Option A: Get new Debridio key**
   - Visit https://debridio.com/
   - Sign in or create account
   - Link Real-Debrid
   - Get new API key
   - Update `.env.local`
   - Test again

2. **Option B: Use Torrentio only**
   - Disable Debridio in `.env.local`:
     ```bash
     NEXT_PUBLIC_DEBRIDIO_ENABLED=false
     ```
   - Your app will use Torrentio + Real-Debrid
   - This is actually very reliable!

## Why This Happened

Possible reasons:
1. Debridio API key format changed
2. Free tier keys expired
3. Service requires authentication now
4. Account needs to be re-linked

## Support

- Debridio Discord: https://discord.gg/tHkbFrZkHM
- Debridio Status: https://stats.uptimerobot.com/Lv6feb4Prf
- Real-Debrid Support: https://real-debrid.com/support
