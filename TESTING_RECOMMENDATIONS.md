# Testing Recommendations - Cached vs Uncached Content

## 🎬 MOVIES THAT SHOULD WORK (Highly Cached)

### Marvel Universe (Almost Always Cached):
- **Avengers: Endgame** (2019) - TMDB: 299534
- **Spider-Man: No Way Home** (2021) - TMDB: 634649
- **Black Panther: Wakanda Forever** (2022) - TMDB: 505642
- **Deadpool & Wolverine** (2024) - TMDB: 533535
- **Thor: Love and Thunder** (2022) - TMDB: 616037

### Popular Recent Movies (Good Cache Rate):
- **Dune: Part Two** (2024) - TMDB: 693134
- **Barbie** (2023) - TMDB: 346698
- **Oppenheimer** (2023) - TMDB: 872585
- **Inside Out 2** (2024) - TMDB: 1022789
- **The Batman** (2022) - TMDB: 414906

### Classic Favorites (Always Cached):
- **The Dark Knight** (2008) - TMDB: 155
- **Inception** (2010) - TMDB: 27205
- **Interstellar** (2014) - TMDB: 157336
- **The Shawshank Redemption** (1994) - TMDB: 278
- **Pulp Fiction** (1994) - TMDB: 680

## ❌ MOVIES THAT MIGHT NOT WORK (Likely Uncached)

### Brand New 2025 Releases:
- **The Fantastic Four: First Steps** (2025) ⚠️ NOT CACHED
- **Thunderbolts** (2025) ⚠️ Might not be cached
- **Captain America: Brave New World** (2025) ⚠️ Might not be cached
- **Superman** (2025) ⚠️ Might not be cached

### Obscure/Indie Films:
- Very small budget films
- Regional cinema (non-English)
- Documentary films
- Direct-to-streaming releases

## 🧪 Testing Strategy

### Phase 1: Verify Player Works
**Test with**: Avengers: Endgame (2019)
- Should find many streams
- Should resolve successfully
- Should open player and play video
- **Expected**: SUCCESS ✅

### Phase 2: Test New Error Messages
**Test with**: The Fantastic Four: First Steps (2025)
- Should find streams
- Should fail to resolve (404)
- Should show helpful error message
- **Expected**: Clear error explaining it's uncached ⚠️

### Phase 3: Test Safari Compatibility
**Test with**: Spider-Man: No Way Home (2021)
- Test in Safari browser
- Should filter for MP4/H.264
- Should transcode if needed
- **Expected**: SUCCESS in Safari ✅

### Phase 4: Test TV Shows
**Test with**: Breaking Bad S01E01
- ID: `tmdb_tv_1396:1:1`
- Should find cached streams
- Should play successfully
- **Expected**: SUCCESS ✅

## 🔍 How to Search for Movies

### By TMDB ID:
```
Movie ID format: tmdb_299534 or just 299534
TV Show format: tmdb_tv_1396:1:1 (show:season:episode)
```

### Finding TMDB IDs:
1. Go to https://www.themoviedb.org/
2. Search for the movie
3. Look at URL: `https://www.themoviedb.org/movie/299534` → ID is **299534**

### Quick Test URLs:
```
http://localhost:3000/?play=299534    (Avengers: Endgame)
http://localhost:3000/?play=634649    (Spider-Man: No Way Home)
http://localhost:3000/?play=617126    (Fantastic Four 2025 - will fail)
```

## 📊 Expected Console Logs

### Successful Stream (Cached):
```
🎬 Starting enhanced stream search for movie ID: 299534
📊 Found 45 streams for 299534
✅ TORRENTIO RESOLVE URL DETECTED!
🔗 Using proxy URL: /api/resolve-stream?url=...
✅ [RESOLVE-STREAM] Resolved to: https://real-debrid.com/...
🎬 Opening player with URL: /api/stream-proxy?url=...
✅ Player initialized successfully
```

### Failed Stream (Uncached):
```
🎬 Starting enhanced stream search for movie ID: 617126
📊 Found 19 streams for 617126
✅ TORRENTIO RESOLVE URL DETECTED!
🔗 Using proxy URL: /api/resolve-stream?url=...
❌ [RESOLVE-STREAM] HTTP 404: Not Found
💡 [RESOLVE-STREAM] Torrent not cached. Hash: 23aeca58...
⚠️ Scored movie URL source failed, trying next: NOT_CACHED
(repeats for all streams)
❌ All scored movie URL sources failed
⚠️ ALL STREAMS NOT CACHED ON REAL-DEBRID
💡 This content is very new or unpopular. Try:
   1. A different, more popular movie
   2. Waiting a few hours for torrents to be cached
```

## 🎯 Quick Test Checklist

### Player Functionality:
- [ ] Can find and list streams
- [ ] Can resolve cached streams to video URLs
- [ ] Can open Netflix-style player
- [ ] Video plays without errors
- [ ] Controls work (play/pause, volume, fullscreen)
- [ ] Seeking/scrubbing works
- [ ] Quality badge shows

### Error Handling:
- [ ] Shows helpful message for uncached content
- [ ] Detects brand new releases
- [ ] Suggests alternatives
- [ ] Logs detailed error info to console

### Browser Compatibility:
- [ ] Works in Chrome/Edge
- [ ] Works in Firefox
- [ ] Works in Safari (with transcoding)
- [ ] Handles CORS correctly

## 💡 Troubleshooting

### If Nothing Works:
1. Check Real-Debrid subscription status
2. Verify API key is correct in .env.local
3. Restart dev server (`npm run dev`)
4. Clear browser cache
5. Check console for specific errors

### If Some Movies Work, Others Don't:
- ✅ Normal! This is expected behavior
- Content availability varies by popularity/age
- New releases take time to cache
- Try the recommended "Movies That Should Work" list

### If Player Shows Then Errors:
- Check browser console for HLS errors
- Verify stream-proxy endpoint is working
- Check network tab for failed requests
- Look for CORS errors

## 🚀 Next Steps After Testing

Once you've verified the player works with cached content:

1. **Enjoy popular movies** - Stick to well-cached content
2. **Wait for new releases** - Check back in a few days/weeks
3. **Manual caching** - Add torrents to Real-Debrid manually
4. **Check cache status** - Use Real-Debrid website to verify

## 📞 Support

### If Issues Persist:
- Check UNCACHED_TORRENTS_ISSUE.md for detailed explanation
- Review server logs (`npm run dev` output)
- Check browser console (F12 → Console tab)
- Test with multiple movies from "Should Work" list

---

**Remember**: The player is working correctly! The issue is content availability, not code bugs. Popular/older movies have much higher cache rates than brand new releases.
