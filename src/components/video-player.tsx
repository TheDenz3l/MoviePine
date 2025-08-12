"use client"

// Netflix-style video player component (reconstructed)

import { useState, useRef, useEffect, useCallback } from 'react'
import Hls from 'hls.js'
import { Play, Pause, Volume2, VolumeX, Maximize, X, Languages, Subtitles, Settings as SettingsIcon, PictureInPicture2, FastForward, Rewind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecentlyPlayedService } from '@/lib/services/recently-played-service'
import { queueProgressUpdate, immediateProgressUpdate } from '@/lib/services/progress-sync'
import { saveEpisodeProgress } from '@/lib/services/episode-progress'
import { emitPlayerError } from '@/lib/utils/player-error'

declare global { interface HTMLVideoElement { audioTracks?: any; videoTracks?: any } }

const INTRO_SKIP_HEURISTIC_SECONDS = 85
const INTRO_VISIBLE_WINDOW = 120
const NEXT_EPISODE_THRESHOLD = 90
const AUTO_PLAY_NEXT_COUNTDOWN = 10
const AUTO_HIDE_DELAY = 1800 // ms until controls fade

interface RealSubtitle { language: string; label: string; url: string }
interface VideoPlayerProps {
  src: string
  title: string
  onClose: () => void
  movieId?: string
  movieData?: any
  startTime?: number
  onError?: (msg: string | { type: string; message: string }) => void
  autoPlay?: boolean
  availableSubtitles?: string[]
  realSubtitles?: RealSubtitle[]
  hasNextEpisode?: boolean
  onNextEpisode?: () => void
}

export default function VideoPlayer({ src, title, onClose, movieId, movieData, startTime = 0, onError, autoPlay = true, availableSubtitles = [], realSubtitles = [], hasNextEpisode = false, onNextEpisode }: VideoPlayerProps) {
  // refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  // legacy timeout refs (unused after refactor, kept to avoid broad removals)
  const controlsTimeoutRef = useRef<any>(null)
  const cursorTimeoutRef = useRef<any>(null)
  const nextIntervalRef = useRef<any>(null)

  // core playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  // UI visibility
  const [showControls, setShowControls] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // Menus
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  // Tracks / subtitles
  const [audioTracks, setAudioTracks] = useState<{ id: string; label: string; language: string }[]>([])
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: string; label: string; language: string; src?: string }[]>([{ id: 'off', label: 'Off', language: 'none' }])
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>('0')
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<string>('off')
  const [customSubtitles, setCustomSubtitles] = useState<{ text: string; startTime: number; endTime: number }[]>([])
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const subtitleIndexRef = useRef(0)
  const subtitleIntervalRef = useRef<any>(null)
  const [subtitleDebug, setSubtitleDebug] = useState<{count:number;active:number;track:string}>({count:0,active:-1,track:'off'})
  const [subtitleStatus, setSubtitleStatus] = useState('')

  // Advanced overlays
  const [showSkipIntro, setShowSkipIntro] = useState(false)
  const [showNextEpisode, setShowNextEpisode] = useState(false)
  const [nextCountdown, setNextCountdown] = useState(AUTO_PLAY_NEXT_COUNTDOWN)

  // Timeline hover & buffering
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)
  const [bufferedRanges, setBufferedRanges] = useState<Array<{ startPct: number; endPct: number }>>([])
  // Autoplay handling
  const [requiresClickForSound, setRequiresClickForSound] = useState(false)
  const lastMousePos = useRef<{x:number;y:number}|null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  // Error / recovery state
  const [playbackError, setPlaybackError] = useState<{ code: string; message: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lastStrategyRef = useRef<'hlsjs' | 'native' | 'direct'>('direct')

  const isValidSrc = !!src

  const log = (...args: any[]) => { if (process.env.NODE_ENV !== 'production') console.log('[VideoPlayer]', ...args) }
  const isSafari = typeof navigator !== 'undefined' && /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent)
  const attemptedH264FallbackRef = useRef(false)

  // Source (re)initialization logic encapsulated for retries
  const initializeSource = useCallback((reason: string) => {
    const video = videoRef.current
    if (!video) return
    setIsLoading(true)
    setPlaybackError(null)
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    const isHls = src.endsWith('.m3u8')
    if (isHls) {
      // Choose strategy: alternate between hls.js and native when retrying
  let useHlsJs = Hls.isSupported() && !isSafari
      if (retryCount > 0) {
        // Flip strategy each retry if possible
        if (lastStrategyRef.current === 'hlsjs') useHlsJs = false
        else if (lastStrategyRef.current === 'native') useHlsJs = true
      }
      if (useHlsJs) {
        lastStrategyRef.current = 'hlsjs'
        const h = new Hls({ enableWorker: true, startLevel: 0, progressive: true })
        hlsRef.current = h
        h.on(Hls.Events.ERROR, (_, data) => {
          const detail = data.details || 'Unknown HLS error'
          emitPlayerError('HLS_ERROR', detail, { fatal: data.fatal, type: data.type })
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              try { h.recoverMediaError() } catch { setPlaybackError({ code: 'HLS_FATAL', message: detail }) }
            } else {
              setPlaybackError({ code: 'HLS_FATAL', message: detail })
            }
          }
        })
        h.loadSource(src + (retryCount ? `?r=${retryCount}` : ''))
        h.attachMedia(video)
      } else {
        lastStrategyRef.current = 'native'
        video.src = src + (retryCount ? `?r=${retryCount}` : '')
      }
    } else {
      lastStrategyRef.current = 'direct'
      video.src = src + (retryCount ? (src.includes('?') ? `&r=${retryCount}` : `?r=${retryCount}`) : '')
    }
  }, [src, retryCount])

  // Initialize on src or retry change
  useEffect(() => { initializeSource('initial') }, [src, retryCount, initializeSource])

  // Metadata & events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const loadTimeout = setTimeout(() => { if (isLoading && onError) onError('Video is taking too long to load.') }, 30000)

    const handleLoadedMetadata = () => {
      if (!video.isConnected) return
      clearTimeout(loadTimeout)
      setDuration(video.duration)
      setIsLoading(false)
      video.volume = volume
      video.muted = false
      if (video.volume === 0) { video.volume = 0.8; setVolume(0.8) }
      discoverTracks()
      if (startTime > 0 && startTime < video.duration) { video.currentTime = startTime; setCurrentTime(startTime) }
      if (autoPlay) {
        // First attempt with sound
        video.play().then(() => {
          setIsPlaying(true)
          video.muted = false
          setIsMuted(false)
          setRequiresClickForSound(false)
          markActivity()
        }).catch(() => {
          // Retry muted (common mobile autoplay policy)
          video.muted = true
          setIsMuted(true)
          video.play().then(() => {
            // Playing muted; need user interaction for sound
            setIsPlaying(true)
            setRequiresClickForSound(true)
            markActivity()
          }).catch(() => {
            // Fully blocked - wait for user gesture
            setRequiresClickForSound(true)
            setIsPlaying(false)
            markActivity()
          })
        })
      }
    }
    const handleTimeUpdate = () => {
      const ct = video.currentTime
      setCurrentTime(ct)
      if (movieId && movieData && duration > 0) {
        if (Math.floor(ct) % 10 === 0 && Math.floor(ct) !== Math.floor(ct - 0.1)) {
          RecentlyPlayedService.updateProgress(movieId, ct, duration)
          queueProgressUpdate({ contentId: movieId, currentTime: ct, duration })
        }
      }
      if (movieId && /:S\d+E\d+/.test(movieId) && duration > 0) {
        const match = movieId.match(/^(.*):S(\d+)E(\d+)/)
        if (match) {
          const seriesBase = match[1]; const season = match[2]; const episode = match[3]
          if (Math.floor(ct) % 5 === 0 && Math.floor(ct) !== Math.floor(ct - 0.1)) {
            try {
              localStorage.setItem(`series-episode-progress:${seriesBase}:S${season}E${episode}`, JSON.stringify({ fraction: ct / duration, seconds: ct }))
              saveEpisodeProgress({ seriesId: seriesBase, season: parseInt(season, 10), episode: parseInt(episode, 10), seconds: ct, duration })
            } catch { }
          }
        }
      }
  // Timeupdate still triggers progress logic; subtitle text now handled by engine interval
    }
  const handlePlay = () => { setIsPlaying(true); if (movieId && movieData) RecentlyPlayedService.add(movieData); markActivity() }
    const handlePause = () => { setIsPlaying(false); if (movieId && movieData && duration > 0) { RecentlyPlayedService.updateProgress(movieId, currentTime, duration); immediateProgressUpdate({ contentId: movieId, currentTime, duration }) } }
    const handleVolumeChangeEv = () => { setVolume(video.volume); setIsMuted(video.muted) }
    const handleFullscreenChange = () => { setIsFullscreen(!!document.fullscreenElement) }
    const handleLoadedData = () => { if (video.textTracks && video.textTracks.length > 0) discoverTracks() }
    const handleError = (e: Event) => {
      setIsLoading(false); setIsPlaying(false)
      const ve = e.target as HTMLVideoElement | null; const err = ve?.error
      let code = 'PLAYER_UNKNOWN'; let msg = 'Playback failed.'
      
      // Enhanced Safari debugging
      if (isSafari) {
        console.error('🍎 [SAFARI ERROR] Video playback failed:', {
          errorCode: err?.code,
          message: err?.message,
          src: ve?.currentSrc || src,
          readyState: ve?.readyState,
          networkState: ve?.networkState,
          videoWidth: ve?.videoWidth,
          videoHeight: ve?.videoHeight,
          duration: ve?.duration
        })
        
        // Test if the URL is accessible
        if (ve?.currentSrc) {
          fetch(ve.currentSrc, { method: 'HEAD' })
            .then(response => {
              console.log('🍎 [SAFARI DEBUG] Stream URL accessibility:', {
                status: response.status,
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length'),
                acceptRanges: response.headers.get('accept-ranges'),
                url: ve.currentSrc.substring(0, 100) + '...'
              })
            })
            .catch(error => {
              console.error('🍎 [SAFARI DEBUG] Stream URL not accessible:', error)
            })
        }
      }
      
      switch (err?.code) {
        case MediaError.MEDIA_ERR_NETWORK: code = 'PLAYER_NETWORK'; msg = 'Network error.'; break
        case MediaError.MEDIA_ERR_DECODE: code = 'PLAYER_DECODE'; msg = 'Decode error.'; break
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: code = 'PLAYER_SRC_UNSUPPORTED'; msg = 'Source unsupported.'; break
        case MediaError.MEDIA_ERR_ABORTED: code = 'PLAYER_ABORTED'; msg = 'Loading aborted.'; break
      }
      
      emitPlayerError(code, msg, { currentTime: ve?.currentTime, src: ve?.currentSrc, errorCode: err?.code })
      
      // For decode / unsupported errors flag for UI retry
      if (code === 'PLAYER_DECODE' || code === 'PLAYER_SRC_UNSUPPORTED') {
        setPlaybackError({ code, message: msg })
          // Safari specific auto-fallback: request a re-fetch with h264-only token once
          if (isSafari && !attemptedH264FallbackRef.current && onError) {
            console.log('🍎 [SAFARI FALLBACK] Requesting H.264-only stream...')
            attemptedH264FallbackRef.current = true
            // Signal modal to show Safari-specific fallback instead of crashing
            onError({ type: 'SAFARI_ERROR', message: 'Safari playback not supported for this format' })
            return
          }
      }
      
      // For Safari, don't propagate other errors that would break the app
      if (isSafari && (code === 'PLAYER_NETWORK' || code === 'PLAYER_ABORTED')) {
        console.log('🍎 [SAFARI] Ignoring network/abort error to prevent app crash:', msg)
        setPlaybackError({ code: 'SAFARI_COMPAT', message: 'This video format may not be compatible with Safari' })
        return
      }
      
      if (onError) onError(msg)
    }
    const handleAbort = () => { setIsLoading(false); setIsPlaying(false) }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('volumechange', handleVolumeChangeEv)
    video.addEventListener('error', handleError)
    video.addEventListener('abort', handleAbort)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      clearTimeout(loadTimeout)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('volumechange', handleVolumeChangeEv)
      video.removeEventListener('error', handleError)
      video.removeEventListener('abort', handleAbort)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [autoPlay, volume, isLoading, movieId, movieData, duration, selectedSubtitleTrack, customSubtitles, startTime, src, onError, currentTime])

  // Track discovery
  const appendedSubsRef = useRef<Set<string>>(new Set())
  const discoverTracks = () => {
    const video = videoRef.current; if (!video) return
    const audioTrackList: { id: string; label: string; language: string }[] = []
    if (video.audioTracks && video.audioTracks.length > 0) {
      for (let i = 0; i < video.audioTracks.length; i++) {
        const t = video.audioTracks[i]
        audioTrackList.push({ id: i.toString(), label: t.label || `Audio Track ${i + 1}`, language: t.language || 'unknown' })
      }
    } else {
      audioTrackList.push({ id: 'default', label: 'English', language: 'en' })
    }
    const subtitleTrackList: { id: string; label: string; language: string; src?: string }[] = [{ id: 'off', label: 'Off', language: 'none' }]
    if (realSubtitles.length > 0) {
      realSubtitles.forEach(sub => { subtitleTrackList.push({ id: `real_${sub.language}`, label: sub.label, language: sub.language, src: sub.url }) })
    }
    if (availableSubtitles.length > 0 && subtitleTrackList.length === 1) {
      const names: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French' }
      availableSubtitles.forEach(code => { subtitleTrackList.push({ id: code, label: names[code] || code.toUpperCase(), language: code, src: 'stream' }) })
    }
    setAudioTracks(audioTrackList)
    setSubtitleTracks(subtitleTrackList)
    if (audioTrackList.length > 0) setSelectedAudioTrack(audioTrackList[0].id)
  }

  // Rebuild track list when realSubtitles list changes
  useEffect(() => { discoverTracks() }, [realSubtitles])

  // Subtitle engine: incremental scan using index ref
  const updateSubtitleOverlay = useCallback(() => {
    if (selectedSubtitleTrack === 'off' || customSubtitles.length === 0) {
      setCurrentSubtitle('')
      subtitleIndexRef.current = 0
      setSubtitleDebug(d=>({...d,active:-1,count:customSubtitles.length,track:selectedSubtitleTrack}))
      return
    }
    const v = videoRef.current; if (!v) return
    const t = v.currentTime
    let i = subtitleIndexRef.current
    // Move backward if overshot (seek backward)
    while (i > 0 && t < customSubtitles[i].startTime) i--
    // Advance while current time past end
    while (i < customSubtitles.length - 1 && t > customSubtitles[i].endTime) i++
    // Ensure we are at cue containing t
    if (!(t >= customSubtitles[i].startTime && t <= customSubtitles[i].endTime)) {
      const found = customSubtitles.findIndex(c=> t>=c.startTime && t<=c.endTime)
      if (found !== -1) i = found; else {
        setCurrentSubtitle('')
        subtitleIndexRef.current = i
        setSubtitleDebug(d=>({...d,active:-1,count:customSubtitles.length,track:selectedSubtitleTrack}))
        return
      }
    }
    subtitleIndexRef.current = i
    const cue = customSubtitles[i]
    setCurrentSubtitle(cue.text)
    setSubtitleDebug(d=>({...d,active:i,count:customSubtitles.length,track:selectedSubtitleTrack}))
  }, [customSubtitles, selectedSubtitleTrack])

  useEffect(() => {
    if (subtitleIntervalRef.current) { clearInterval(subtitleIntervalRef.current); subtitleIntervalRef.current = null }
    if (customSubtitles.length > 0 && selectedSubtitleTrack !== 'off') {
      subtitleIndexRef.current = 0
      subtitleIntervalRef.current = setInterval(updateSubtitleOverlay, 250)
      updateSubtitleOverlay()
    } else { setCurrentSubtitle('') }
    return () => { if (subtitleIntervalRef.current) clearInterval(subtitleIntervalRef.current) }
  }, [customSubtitles, selectedSubtitleTrack, updateSubtitleOverlay])

  // Developer debug toggle (press Shift+D)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === 'KeyD' && e.shiftKey) setSubtitleDebug(d=>({...d})) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // Custom subtitle parser (supports SRT & VTT, optional hour, attributes after -->)
  const parseTimestamp = (raw: string) => {
    const norm = raw.trim().replace(',', '.');
    // Patterns: HH:MM:SS.mmm or MM:SS.mmm
    const hMatch = norm.match(/^(\d{2}):(\d{2}):(\d{2})[.,](\d{3})$/)
    if (hMatch) return parseInt(hMatch[1])*3600 + parseInt(hMatch[2])*60 + parseInt(hMatch[3]) + parseInt(hMatch[4])/1000
    const mMatch = norm.match(/^(\d{2}):(\d{2})[.,](\d{3})$/)
    if (mMatch) return parseInt(mMatch[1])*60 + parseInt(mMatch[2]) + parseInt(mMatch[3])/1000
    return NaN
  }
  const parseSubtitleFile = (rawText: string) => {
    let text = rawText.replace(/\r/g, '')
    if (text.startsWith('WEBVTT')) text = text.replace(/^WEBVTT.*\n+/i, '')
    const blocks = text.split(/\n\n+/)
    const cues: { text: string; startTime: number; endTime: number }[] = []
  const timingRegex = /^((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$/
    for (const block of blocks) {
      const lines = block.split(/\n/).filter(l => l.trim() !== '')
      if (lines.length < 2) continue
      let idx = 0
      if (/^\d+$/.test(lines[0])) idx = 1
      const timingLine = lines[idx]
  const mt = timingLine.match(timingRegex)
  if (!mt) continue
  const start = parseTimestamp(mt[1])
  const end = parseTimestamp(mt[2])
      if (isNaN(start) || isNaN(end)) continue
      const cueText = lines.slice(idx + 1).join('\n')
      cues.push({ startTime: start, endTime: end, text: cueText })
    }
    const sorted = cues.sort((a,b)=>a.startTime-b.startTime)
    if (sorted.length === 0) {
      const alt: { startTime:number; endTime:number; text:string }[] = []
      const globalRe = /^((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})(?:.*)$([\s\S]*?)(?=^\s*$|^(?:\d+\s*$)|\Z)/gm
      let m: RegExpExecArray | null
      while ((m = globalRe.exec(text)) !== null) {
        const s = parseTimestamp(m[1]); const e = parseTimestamp(m[2]); if (isNaN(s)||isNaN(e)) continue
        const body = (m[3]||'').trim()
        alt.push({ startTime: s, endTime: e, text: body })
      }
      if (alt.length) return alt.sort((a,b)=>a.startTime-b.startTime)
    }
    return sorted
  }
  const loadCustomSubtitleFromUrl = async (url: string) => {
    try {
      console.log('[Subtitles] Fetching', url)
      const res = await fetch(url)
      const ct = res.headers.get('content-type') || 'unknown'
      if (!res.ok) throw new Error('HTTP '+res.status)
      const txt = await res.text()
      console.log('[Subtitles] size chars=', txt.length, 'type=', ct, 'preview=', txt.slice(0,120).replace(/\n/g,'\\n'))
      const cues = parseSubtitleFile(txt)
      if (cues.length === 0) {
        console.warn('[Subtitles] 0 cues parsed; injecting diagnostic placeholder')
        setCustomSubtitles([
          { text: 'No subtitle cues parsed (diagnostic).', startTime: 0, endTime: 3 },
          { text: 'Possible causes: timing format not matched, empty file, or fetch returned HTML.', startTime: 4, endTime: 10 },
          { text: 'Check console for "[Subtitles]" logs.', startTime: 11, endTime: 16 }
        ])
        setSubtitleDebug({count:0,active:-1,track:selectedSubtitleTrack})
        setSubtitleStatus('0 cues parsed')
        return
      }
      console.log(`[Subtitles] Parsed ${cues.length} cues (first:`, cues[0], ')')
      setCustomSubtitles(cues)
      setSubtitleDebug({count:cues.length,active:-1,track:selectedSubtitleTrack})
      setSubtitleStatus(`${cues.length} cues loaded`)
      setTimeout(()=> setSubtitleStatus(''), 2500)
    } catch (e) {
      console.warn('Subtitle fetch failed', e)
      setCustomSubtitles([{ text: 'Subtitle load failed', startTime: 0, endTime: 5 }])
      setSubtitleDebug({count:0,active:-1,track:selectedSubtitleTrack})
      setSubtitleStatus('Subtitle fetch failed')
    }
  }

  const loadExternalSubtitles = async (language: string, source: string = 'external') => {
    try {
      if (source === 'stream') {
        setCustomSubtitles([
          { text: `${language.toUpperCase()} subtitles are embedded in this stream`, startTime: 5, endTime: 10 },
          { text: "If you don't see subtitles, they may not be available for this specific video file", startTime: 15, endTime: 20 }
        ])
      } else {
        setCustomSubtitles([
          { text: 'External subtitle loading not yet implemented', startTime: 10, endTime: 15 },
          { text: 'This stream may have embedded subtitles', startTime: 20, endTime: 25 }
        ])
      }
      return true
    } catch { return false }
  }

  const selectAudioTrack = (trackId: string) => { setSelectedAudioTrack(trackId) }
  const selectSubtitleTrack = async (trackId: string) => {
    setCustomSubtitles([]); setCurrentSubtitle('')
    if (trackId === 'off') { setSelectedSubtitleTrack('off'); return }
    const st = subtitleTracks.find(s => s.id === trackId)
    if (!st) { setSelectedSubtitleTrack('off'); return }
  setSubtitleStatus('Loading subtitles...')
    if (st.src) {
      if (st.id.startsWith('real_')) await loadCustomSubtitleFromUrl(st.src)
      else await loadExternalSubtitles(st.language, st.src)
    }
    setSelectedSubtitleTrack(trackId)
  }

  // Utility / formatting
  const formatTime = (t: number) => { const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = Math.floor(t % 60); return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}` }
  const handleSeek = (nt: number) => { const v = videoRef.current; if (!v) return; v.currentTime = nt; setCurrentTime(nt) }
  const skipTime = (s: number) => handleSeek(Math.max(0, Math.min(duration, currentTime + s)))
  const handleVolumeChangeVal = (nv: number) => { const v = videoRef.current; if (!v) return; v.volume = nv; setVolume(nv); if (nv > 0) setIsMuted(false) }
  const togglePlay = () => { const v = videoRef.current; if (!v) return;
    if (!v.paused) { // pause path
      if (requiresClickForSound && v.muted) { v.muted = false; setIsMuted(false); setRequiresClickForSound(false) }
      v.pause(); setIsPlaying(false); setShowControls(true); markActivity(); return }
    if (requiresClickForSound && v.muted) { v.muted = false; setIsMuted(false); setRequiresClickForSound(false) }
    if (v.volume === 0) { v.volume = 0.8; setVolume(0.8) }
    v.play().then(()=>{ setIsPlaying(true); markActivity() }).catch(()=> setIsPlaying(false)) }
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; if (!v.muted && v.volume === 0) { v.volume = 0.8; setVolume(0.8) } setIsMuted(v.muted) }
  const toggleFullscreen = async () => { const c = containerRef.current; if (!c) return; try { if (!document.fullscreenElement) { await c.requestFullscreen?.() } else { await document.exitFullscreen?.() } } catch { } }
  const markActivity = () => { lastActivityRef.current = Date.now(); setShowControls(true); setShowCursor(true) }
  const handleMouseMove = (e?: any) => {
    const { clientX, clientY } = e || {}
    if (clientX != null && clientY != null) {
      const last = lastMousePos.current
      if (!last || Math.abs(last.x - clientX) > 3 || Math.abs(last.y - clientY) > 3) {
        lastMousePos.current = { x: clientX, y: clientY }
        markActivity()
      }
    } else { markActivity() }
  }
  const handleContainerClick = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-video-controls]')) togglePlay(); markActivity() }
  const handleVideoClick = (e: React.MouseEvent) => { e.stopPropagation(); togglePlay() }
  const handleKeyDown = (e: KeyboardEvent) => { markActivity(); switch (e.code) { case 'Space': e.preventDefault(); togglePlay(); break; case 'ArrowLeft': e.preventDefault(); skipTime(-10); break; case 'ArrowRight': e.preventDefault(); skipTime(10); break; case 'KeyM': e.preventDefault(); toggleMute(); break; case 'KeyF': e.preventDefault(); toggleFullscreen(); break; case 'Escape': if (isFullscreen) document.exitFullscreen?.(); else onClose(); break } }
  useEffect(() => { document.addEventListener('keydown', handleKeyDown); return () => { document.removeEventListener('keydown', handleKeyDown) } }, [isPlaying, isFullscreen, currentTime, duration])
  // Inactivity watcher
  useEffect(() => {
    const interval = setInterval(() => {
      const v = videoRef.current
      if (!v) return
      if (!v.paused && isPlaying) {
        const idle = Date.now() - lastActivityRef.current
        if (idle > AUTO_HIDE_DELAY) { setShowControls(false); setShowCursor(false) }
      }
    }, 250)
    return () => clearInterval(interval)
  }, [isPlaying])
  // Enable selected audio track (if browser exposes audioTracks API)
  useEffect(() => {
    const v = videoRef.current
    if (!v || !v.audioTracks || !v.audioTracks.length) return
    try {
      for (let i = 0; i < v.audioTracks.length; i++) {
        // @ts-ignore
        v.audioTracks[i].enabled = (i.toString() === selectedAudioTrack || v.audioTracks[i].id === selectedAudioTrack)
      }
    } catch { }
  }, [selectedAudioTrack])

  // Basic global activity listeners
  useEffect(() => {
    const a = () => markActivity()
    window.addEventListener('pointerdown', a, true)
    window.addEventListener('pointermove', a, true)
    window.addEventListener('keydown', a, true)
    window.addEventListener('touchstart', a, true)
    return () => { window.removeEventListener('pointerdown', a, true); window.removeEventListener('pointermove', a, true); window.removeEventListener('keydown', a, true); window.removeEventListener('touchstart', a, true) }
  }, [])
  useEffect(() => { if (isPlaying) markActivity() }, [isPlaying])

  // Intro skip & next episode logic
  const isSeries = !!(movieId && /:S\d+E\d+/.test(movieId))
  useEffect(() => { if (!isSeries || duration === 0) return; if (currentTime < INTRO_VISIBLE_WINDOW) setShowSkipIntro(currentTime > 5); else setShowSkipIntro(false) }, [currentTime, duration, isSeries])
  useEffect(() => { if (!isSeries || !hasNextEpisode || duration === 0) return; const rem = duration - currentTime; if (rem < NEXT_EPISODE_THRESHOLD) { if (!showNextEpisode) { setShowNextEpisode(true); setNextCountdown(AUTO_PLAY_NEXT_COUNTDOWN) } } else if (showNextEpisode) setShowNextEpisode(false) }, [currentTime, duration, isSeries, hasNextEpisode, showNextEpisode])
  useEffect(() => { if (!showNextEpisode) return; if (nextIntervalRef.current) clearInterval(nextIntervalRef.current); nextIntervalRef.current = setInterval(() => { setNextCountdown(c => { if (c <= 1) { clearInterval(nextIntervalRef.current); if (onNextEpisode) onNextEpisode(); return 0 } return c - 1 }) }, 1000); return () => { if (nextIntervalRef.current) clearInterval(nextIntervalRef.current) } }, [showNextEpisode, onNextEpisode])

  // Timeline hover & buffer ranges
  const handleTimelineMove = (e: React.MouseEvent) => { if (!duration) return; const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)); setHoverPercent(pct); setHoverTime(pct * duration) }
  const clearHover = () => { setHoverPercent(null); setHoverTime(null) }
  useEffect(() => { const v = videoRef.current; if (!v) return; const update = () => { if (!v.buffered || !duration) return; const r: Array<{ startPct: number; endPct: number }> = []; for (let i = 0; i < v.buffered.length; i++) r.push({ startPct: v.buffered.start(i) / duration, endPct: v.buffered.end(i) / duration }); setBufferedRanges(r) }; const int = setInterval(update, 1000); update(); return () => clearInterval(int) }, [duration])

  // Menus
  const closeMenus = useCallback(() => { setShowAudioMenu(false); setShowSubtitleMenu(false); setShowSettingsMenu(false) }, [])
  const toggleMenu = (m: 'audio' | 'subs' | 'settings') => { setShowAudioMenu(m === 'audio' ? !showAudioMenu : false); setShowSubtitleMenu(m === 'subs' ? !showSubtitleMenu : false); setShowSettingsMenu(m === 'settings' ? !showSettingsMenu : false) }
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackRate }, [playbackRate])
  const enterPip = async () => { const v = videoRef.current; if (!v) return; try { // @ts-ignore
    if (document.pictureInPictureElement) { // @ts-ignore
      await document.exitPictureInPicture() } else if ((v as any).requestPictureInPicture) { await (v as any).requestPictureInPicture() } } catch { } }

  if (!isValidSrc) return <div className="flex items-center justify-center w-full h-full bg-black text-white"><div className="text-center space-y-4"><p>Invalid video source.</p><Button onClick={onClose} variant="outline" className="text-white border-white">Close</Button></div></div>

  const retryPlayback = () => {
    setRetryCount(c => c + 1)
    // Attempt re-init; state effect will run
    markActivity()
  }

  return (
  <div ref={containerRef} className={`relative w-full h-full bg-black flex items-center justify-center transition-colors duration-300 ${showCursor ? 'cursor-default' : 'cursor-none'}`} onMouseMove={handleMouseMove} onClick={handleContainerClick} onMouseLeave={closeMenus}>
  <video ref={videoRef} className="w-full h-full object-contain" playsInline onDoubleClick={toggleFullscreen} onClick={handleVideoClick} controls={false} preload="metadata" crossOrigin={src?.includes('torrentio.strem.fun') ? undefined : 'anonymous'} />

      {currentSubtitle && selectedSubtitleTrack !== 'off' && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 z-40 max-w-4xl px-4">
          <div className="bg-black/70 text-white text-center px-4 py-2 rounded-md shadow-lg"><p className="text-lg leading-relaxed whitespace-pre-line drop-shadow-md">{currentSubtitle}</p></div>
        </div>
      )}
      {subtitleStatus && selectedSubtitleTrack!=='off' && !currentSubtitle && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-40 px-3 py-1 bg-black/60 text-white text-xs rounded">{subtitleStatus}</div>
      )}
      {/* Subtitle debug (visible if Shift+D toggled and cues loaded) */}
      {customSubtitles.length>0 && selectedSubtitleTrack!=='off' && (
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/60 bg-black/40 px-2 py-1 rounded pointer-events-none">
          cues:{subtitleDebug.count} active:{subtitleDebug.active} track:{selectedSubtitleTrack}
        </div>) }

      {showSkipIntro && (
        <div className="absolute top-24 right-8 z-40"><Button onClick={() => skipTime(INTRO_SKIP_HEURISTIC_SECONDS)} className="bg-white/20 hover:bg-white/30 text-white">Skip Intro</Button></div>
      )}

      {showNextEpisode && (
        <div className="absolute inset-0 flex items-end justify-end p-8 z-40 pointer-events-none">
          <div className="bg-black/70 text-white p-4 rounded-md w-64 space-y-2 pointer-events-auto">
            <p className="font-semibold">Next episode in {nextCountdown}s</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => { if (onNextEpisode) onNextEpisode() }}>Play Now</Button>
              <Button size="sm" variant="outline" className="flex-1 border-gray-400 text-white" onClick={() => setShowNextEpisode(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><div className="text-white text-xl animate-pulse">Loading…</div></div>}
      {playbackError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 z-40">
          <div className="text-center space-y-2 max-w-md px-6">
            <h2 className="text-white text-lg font-semibold">Playback Issue</h2>
            <p className="text-white/80 text-sm">{playbackError.message} (Code: {playbackError.code})</p>
            <p className="text-white/50 text-xs">Strategy: {lastStrategyRef.current} • Retry #{retryCount}</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={retryPlayback} className="bg-red-600 hover:bg-red-700 text-white">Try Again</Button>
              <Button variant="outline" onClick={onClose} className="text-white border-white/40 hover:bg-white/10">Close</Button>
            </div>
          </div>
        </div>
      )}
      {(!isPlaying || requiresClickForSound) && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-30 select-none">
          <button onClick={togglePlay} className="w-24 h-24 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition" aria-label="Play / Unmute">
            <Play className="w-12 h-12" />
          </button>
          {requiresClickForSound && <div className="text-center text-white/80 text-sm px-4 py-2 bg-black/50 rounded-md max-w-sm">Autoplay started muted. Click to enable sound.</div>}
        </div>
      )}

      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} data-video-controls>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-4 text-white select-none">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold drop-shadow-md max-w-[60vw] truncate">{title}</h1>
            {movieData?.year && <p className="text-xs text-white/70">{movieData.year}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20" aria-label="Close"><X /></Button>
          </div>
        </div>

        {/* Timeline + controls */}
        <div className="px-6 pb-5 flex flex-col gap-3 text-white select-none" data-video-controls>
          {/* Timeline */}
          <div className="relative h-6 group" onMouseMove={handleTimelineMove} onMouseLeave={clearHover} onClick={(e) => { const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)); handleSeek(pct * duration) }}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/20 rounded overflow-hidden">
              {bufferedRanges.map((r, i) => <div key={i} style={{ left: `${r.startPct * 100}%`, width: `${(r.endPct - r.startPct) * 100}%` }} className="absolute top-0 h-full bg-white/35 rounded" />)}
              <div style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} className="absolute top-0 h-full bg-red-600 rounded" />
              {hoverPercent !== null && <div style={{ left: `${hoverPercent * 100}%` }} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />}
            </div>
            {hoverTime !== null && <div style={{ left: `${(hoverPercent || 0) * 100}%` }} className="absolute -top-16 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"><div className="w-40 h-20 bg-black/60 border border-white/20 rounded flex items-center justify-center text-xs">Thumbnail</div><div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded">{formatTime(hoverTime)}</div></div>}
            <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[11px] text-white/70"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => skipTime(-10)} className="text-white hover:bg-white/20" aria-label="Back 10s"><Rewind className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20" aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}</Button>
              <Button variant="ghost" size="icon" onClick={() => skipTime(10)} className="text-white hover:bg-white/20" aria-label="Forward 10s"><FastForward className="w-5 h-5" /></Button>
              <div className="flex items-center group select-none">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20" aria-label={isMuted ? 'Unmute' : 'Mute'}>{isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</Button>
                <VolumeBar volume={isMuted ? 0 : volume} onChange={(nv)=>{ handleVolumeChangeVal(nv); if (nv>0 && isMuted) toggleMute() }} />
              </div>
              <span className="text-[11px] text-white/60 w-8 text-center">{playbackRate}x</span>
            </div>
            <div className="flex items-center gap-1">
              {audioTracks.length > 0 && <div className="relative"><Button variant="ghost" size="icon" aria-label="Audio" onClick={(e) => { e.stopPropagation(); toggleMenu('audio') }} className={`${showAudioMenu ? 'bg-white/20' : ''} hover:bg-white/20`}><Languages className="w-5 h-5" /></Button>{showAudioMenu && <div className="absolute bottom-10 right-0 bg-black/80 backdrop-blur-sm border border-white/20 rounded p-2 w-48 text-xs space-y-1 z-50"><p className="uppercase tracking-wide text-[10px] text-white/60 mb-1">Audio</p>{audioTracks.map(t => <button key={t.id} onClick={() => { selectAudioTrack(t.id); setShowAudioMenu(false) }} className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 ${selectedAudioTrack === t.id ? 'text-red-400' : ''}`}>{t.label}{t.language && t.language !== 'unknown' && ` (${t.language})`}</button>)}</div>}</div>}
              {subtitleTracks.length > 1 && <div className="relative"><Button variant="ghost" size="icon" aria-label="Subtitles" onClick={(e) => { e.stopPropagation(); toggleMenu('subs') }} className={`${showSubtitleMenu ? 'bg-white/20' : ''} hover:bg-white/20`}><Subtitles className="w-5 h-5" /></Button>{showSubtitleMenu && <div className="absolute bottom-10 right-0 bg-black/80 backdrop-blur-sm border border-white/20 rounded p-2 w-56 text-xs space-y-1 z-50 max-h-64 overflow-auto"><p className="uppercase tracking-wide text-[10px] text-white/60 mb-1">Subtitles</p>{subtitleTracks.map(t => <button key={t.id} onClick={() => { selectSubtitleTrack(t.id); setShowSubtitleMenu(false) }} className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 ${selectedSubtitleTrack === t.id ? 'text-red-400' : ''}`}>{t.label}</button>)}</div>}</div>}
              <div className="relative"><Button variant="ghost" size="icon" aria-label="Settings" onClick={(e) => { e.stopPropagation(); toggleMenu('settings') }} className={`${showSettingsMenu ? 'bg-white/20' : ''} hover:bg-white/20`}><SettingsIcon className="w-5 h-5" /></Button>{showSettingsMenu && <div className="absolute bottom-10 right-0 bg-black/80 backdrop-blur-sm border border-white/20 rounded p-3 w-60 text-xs space-y-3 z-50"><div><p className="uppercase tracking-wide text-[10px] text-white/60 mb-1">Playback Speed</p><div className="flex flex-wrap gap-1">{[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(r => <button key={r} onClick={() => setPlaybackRate(r)} className={`px-2 py-1 rounded bg-white/10 hover:bg-white/20 ${playbackRate === r ? 'bg-red-600 text-white' : ''}`}>{r}x</button>)}</div></div><div><p className="uppercase tracking-wide text-[10px] text-white/60 mb-1">Quality</p><div className="px-2 py-1 rounded bg-white/10 flex items-center justify-between">Auto<span className="text-white/40 text-[10px]"></span></div><p className="text-[10px] text-white/40 mt-1">Quality picked by stream scoring logic.</p></div></div>}</div>
              <Button variant="ghost" size="icon" aria-label="Picture in Picture" onClick={enterPip} className="text-white hover:bg-white/20"><PictureInPicture2 className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" aria-label="Fullscreen" onClick={toggleFullscreen} className="text-white hover:bg-white/20"><Maximize className="w-5 h-5" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline volume bar component (red track like timeline)
function VolumeBar({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const pct = Math.round(volume * 100)
  return (
    <div className="relative w-28 h-4 flex items-center select-none ml-1" onClick={(e) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const nv = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      onChange(nv)
    }} onMouseMove={(e) => { if (e.buttons === 1) { const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const nv = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)); onChange(nv) } }}>
      <div className="absolute inset-0 rounded-full bg-white/20" />
      <div className="absolute inset-y-0 left-0 rounded-full bg-red-600" style={{ width: `${pct}%` }} />
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-transparent" />
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 opacity-0 group-hover:opacity-100 transition">{pct}%</div>
    </div>
  )
}
