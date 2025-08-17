"use client"

import { useState, useEffect, useRef } from "react"
import { SeasonSelect } from "./season-select"
import { X, Play, ThumbsUp, Info } from "lucide-react"
import { useMyList } from '@/components/list/useMyList'
import { ImdbRating } from '@/components/imdb-rating'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import WatchlistToggleButton from '@/components/list/WatchlistToggleButton'
import { TMDBAPI, TMDBCastMember } from "@/lib/api/tmdb"
import { fetchSeriesProgress } from '@/lib/services/episode-progress'
import { safeParse } from '@/lib/utils/safe-json'

interface Movie {
  id: string
  title: string
  poster: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
  runtime?: number
  tmdbId?: string | number
  // Series-specific (optional)
  seasons?: number
  episodes?: number
  type?: 'movie' | 'tv'
}

interface MovieDetailModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  onPlay: (movieId: string) => void
  onAddToList?: (movieId: string) => void // now optional; internal watchlist handles visual state
  onMovieSelect?: (movie: Movie) => void
}

export function MovieDetailModal({ movie, isOpen, onClose, onPlay, onAddToList, onMovieSelect }: MovieDetailModalProps) {
  const { watchlist, addWatch, removeWatch } = useMyList()
  const inWatch = (id:string) => !!watchlist?.some(w=>w.content_id===id)
  const toggleWatch = (id:string) => {
    inWatch(id) ? removeWatch(id) : addWatch(id,'movie')
    onAddToList?.(id)
  }
  // Debug logging
  useEffect(() => {
    console.log('[MovieDetailModal] Props changed:', { 
      movieId: movie?.id, 
      movieTitle: movie?.title, 
      isOpen 
    })
  }, [movie, isOpen])

  // Additional debug logging for when the component mounts/unmounts
  useEffect(() => {
    console.log('[MovieDetailModal] Component mounted/unmounted', { isOpen })
    return () => {
      console.log('[MovieDetailModal] Component will unmount', { isOpen })
    }
  }, [])

  const [isLiked, setIsLiked] = useState<boolean | null>(null)
  const [cast, setCast] = useState<TMDBCastMember[]>([])
  const [isLoadingCast, setIsLoadingCast] = useState(false)
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)
  // (Alt backdrop logic removed – revert to using provided backdrop only)
  // Series / episodes state
  const [isSeries, setIsSeries] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number>(1)
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([])
  const [episodesForSeason, setEpisodesForSeason] = useState<Array<{ episode_number: number; name: string; runtime?: number; still?: string }>>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [lastWatched, setLastWatched] = useState<{ season: number; episode: number } | null>(null)
  const [episodeProgress, setEpisodeProgress] = useState<Record<string, { fraction: number; seconds: number }>>({})
  // Episode cache with TTL
  const EPISODE_CACHE_TTL_MS = 30 * 60 * 1000
  const episodesCacheRef = useRef<Record<string, { ts: number; data: Array<{ episode_number: number; name: string; runtime?: number; still?: string }> }>>({})
  // Local override when parent does not supply onMovieSelect handling
  const [overrideMovie, setOverrideMovie] = useState<Movie | null>(null)
  const activeMovie = overrideMovie || movie
  // Scroll container ref so we can reset position when swapping similar titles
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Track last externally supplied movie id to detect parent updates
  const lastParentIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (movie) {
      if (overrideMovie && movie.id !== overrideMovie.id) {
        // Parent selected a different movie explicitly; drop override
        setOverrideMovie(null)
      }
      lastParentIdRef.current = movie.id
    }
  }, [movie, overrideMovie])
  // Countdown timer state (updates every minute)
  const [nowTs, setNowTs] = useState<number>(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const formatCountdown = (airDate?: string) => {
    if (!airDate) return null
    const target = new Date(airDate + 'T00:00:00')
    const diff = target.getTime() - nowTs
    if (diff <= 0) return null
    const totalMinutes = Math.floor(diff / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    if (days > 0) return `in ${days}d${hours > 0 ? ` ${hours}h` : ''}`
    if (hours > 0) return `in ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
    return `in ${minutes}m`
  }

  // Fetch cast and similar movies information when movie changes
  useEffect(() => {
    if (!activeMovie || !isOpen) return

    const fetchMovieDetails = async () => {
      const fetchForId = activeMovie.id
      const abortRef = { cancelled: false }
      // Save abort reference so later we can ignore stale resolutions
      currentFetchRef.current = abortRef
      // Extract TMDB ID from movie data
      let tmdbId: number | null = null

      if (activeMovie.tmdbId) {
        tmdbId = typeof activeMovie.tmdbId === 'string' ? parseInt(activeMovie.tmdbId) : activeMovie.tmdbId
      } else if (activeMovie.id.startsWith('tmdb_')) {
        tmdbId = parseInt(activeMovie.id.replace('tmdb_', ''))
      }

      if (!tmdbId) {
  console.warn('No TMDB ID found for movie:', activeMovie.title)
        return
      }

      // Get TMDB API key from environment
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      if (!tmdbApiKey) {
        console.warn('TMDB API key not configured')
        return
      }

      const tmdbApi = new TMDBAPI(tmdbApiKey)

      // Detect if this is a series (heuristics: id prefix or presence of seasons field)
      const seriesDetected = activeMovie.id.startsWith('tmdb_tv_') || (activeMovie.seasons && activeMovie.seasons > 0) || activeMovie.type === 'tv'
      setIsSeries(seriesDetected)
      if (seriesDetected) {
        // Populate seasons list (fallback to seasons count if detailed season list not yet fetched)
        let seasonCount = activeMovie.seasons || (typeof (activeMovie as any).number_of_seasons === 'number' ? (activeMovie as any).number_of_seasons : undefined)
        // If we still don't have season count, fetch full show details
        if (!seasonCount) {
          try {
            const details = await tmdbApi.getTVShow(tmdbId)
            seasonCount = (details as any).number_of_seasons || 1
          } catch (e) {
            console.warn('Failed to fetch TV show details for seasons', e)
            seasonCount = 1
          }
        }
        if (!seasonCount || seasonCount < 1) seasonCount = 1
        if (!abortRef.cancelled && fetchForId === (overrideMovie?.id || movie?.id || fetchForId)) {
          setAvailableSeasons(Array.from({ length: seasonCount }, (_, i) => i + 1))
          if (selectedSeason > seasonCount) setSelectedSeason(1)
        }
        // Load resume info
        try {
          const key = `series-progress:${activeMovie.id}`
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = safeParse<any>(raw, null, 'series-progress')
            if (parsed && parsed.season && parsed.episode) {
              setLastWatched({ season: parsed.season, episode: parsed.episode })
              setSelectedSeason(parsed.season)
            }
          }
        } catch {}
        // Remote + local merge (furthest seconds wins)
        try {
          const remote = await fetchSeriesProgress(activeMovie.id)
          const local: Record<string, { fraction: number; seconds: number }> = {}
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (!k) continue
              if (k.startsWith(`series-episode-progress:${activeMovie.id}:S`)) {
                const match = k.match(/series-episode-progress:[^:]+:(S\d+E\d+)/)
                if (match) {
                  const raw = localStorage.getItem(k)
                  if (!raw) continue
                  try {
                    const parsed = safeParse<any>(raw, null, 'episode-progress')
                    if (parsed && typeof parsed.seconds === 'number') {
                      const fraction = parsed.fraction ?? (parsed.duration ? parsed.seconds / parsed.duration : 0)
                      local[match[1]] = { fraction, seconds: parsed.seconds }
                    }
                  } catch {}
                }
              }
            }
          } catch {}
          const merged: Record<string, { fraction: number; seconds: number }> = {}
          const keys = new Set([...Object.keys(remote), ...Object.keys(local)])
          keys.forEach(key => {
            const r = remote[key]
            const l = local[key]
            if (r && l) merged[key] = r.seconds >= l.seconds ? r : l
            else if (r) merged[key] = r
            else if (l) merged[key] = l
          })
          if (Object.keys(merged).length) {
            setEpisodeProgress(merged)
            // Determine last watched from max seconds
            let max = -1
            let lw: { season: number; episode: number } | null = null
            for (const [k, v] of Object.entries(merged)) {
              const m = k.match(/S(\d+)E(\d+)/)
              if (m) {
                const s = parseInt(m[1], 10)
                const e = parseInt(m[2], 10)
                if (v.seconds > max) { max = v.seconds; lw = { season: s, episode: e } }
              }
            }
            if (lw) setLastWatched(lw)
          }
        } catch (e) {
          console.warn('Remote progress fetch failed', e)
        }
      }

  // Fetch cast information (movie or TV depending on detected type)
      setIsLoadingCast(true)
      try {
        let credits
        if (seriesDetected) {
          try {
            credits = await tmdbApi.getTVShowCredits(tmdbId)
          } catch (e) {
            // fallback to movie credits in unlikely mismatch
            credits = await tmdbApi.getMovieCredits(tmdbId)
          }
        } else {
          credits = await tmdbApi.getMovieCredits(tmdbId)
        }
        if (!abortRef.cancelled && fetchForId === (overrideMovie?.id || movie?.id || fetchForId)) {
          setCast(credits.cast.slice(0, 5))
        }
      } catch (error) {
        console.error('Error fetching cast information:', error)
        setCast([])
      } finally {
        setIsLoadingCast(false)
      }

      // Fetch similar movies
      setIsLoadingSimilar(true)
      try {
        let similarResponse
        if (seriesDetected) {
          try {
            similarResponse = await tmdbApi.getSimilarTVShows(tmdbId)
          } catch (error) {
            console.warn('Similar TV not available, trying TV recommendations:', error)
            similarResponse = await tmdbApi.getRecommendedTVShows(tmdbId)
          }
          const genres = await tmdbApi.getTVGenres()
          const converted = similarResponse.results.slice(0, 15).map((tmdbShow: any) => tmdbApi.convertToSeries(tmdbShow, genres.genres))
          if (!abortRef.cancelled && fetchForId === (overrideMovie?.id || movie?.id || fetchForId)) {
            setSimilarMovies(converted)
          }
        } else {
          try {
            similarResponse = await tmdbApi.getSimilarMovies(tmdbId)
          } catch (error) {
            console.warn('Similar movies not available, trying recommendations:', error)
            similarResponse = await tmdbApi.getRecommendedMovies(tmdbId)
          }
          const genres = await tmdbApi.getMovieGenres()
          const converted = similarResponse.results.slice(0, 15).map((tmdbMovie: any) => tmdbApi.convertToMovie(tmdbMovie, genres.genres))
          if (!abortRef.cancelled && fetchForId === (overrideMovie?.id || movie?.id || fetchForId)) {
            setSimilarMovies(converted)
          }
        }
      } catch (error) {
        console.error('Error fetching similar titles:', error)
        setSimilarMovies([])
      } finally {
        setIsLoadingSimilar(false)
      }

  // Alternate backdrop selection removed per latest requirements
    }

    fetchMovieDetails()
    return () => {
      // Mark last fetch aborted so late arrivals are ignored
      if (currentFetchRef.current) currentFetchRef.current.cancelled = true
    }
  }, [activeMovie?.id, isOpen])

  // Ref to manage cancellation of stale fetches
  const currentFetchRef = useRef<{ cancelled: boolean } | null>(null)

  // Fetch episodes for selected season (placeholder – requires TMDB season endpoint not yet implemented in TMDBAPI)
  useEffect(() => {
    const loadEpisodes = async () => {
  if (!isSeries || !activeMovie || !isOpen) return
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      if (!apiKey) return
      // Derive TMDB numeric id
      let tmdbId: number | null = null
      if (activeMovie.tmdbId) {
        tmdbId = typeof activeMovie.tmdbId === 'string' ? parseInt(activeMovie.tmdbId) : activeMovie.tmdbId
      } else if (activeMovie.id.startsWith('tmdb_tv_')) {
        tmdbId = parseInt(activeMovie.id.replace('tmdb_tv_', ''))
      }
      if (!tmdbId) return

      setIsLoadingEpisodes(true)
      try {
  const cacheKey = `${activeMovie.id}:S${selectedSeason}`
        const cached = episodesCacheRef.current[cacheKey]
        if (cached && (Date.now() - cached.ts) < EPISODE_CACHE_TTL_MS) {
          setEpisodesForSeason(cached.data)
          return
        }
        const tmdbApi = new TMDBAPI(apiKey)
        const seasonData = await tmdbApi.getTVSeason(tmdbId, selectedSeason)
        const mapped = seasonData.episodes.map(ep => ({
          episode_number: ep.episode_number,
          name: ep.name || `Episode ${ep.episode_number}`,
          runtime: ep.runtime,
          still: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : undefined,
          air_date: (ep as any).air_date
        }))
  episodesCacheRef.current[cacheKey] = { ts: Date.now(), data: mapped }
        setEpisodesForSeason(mapped)
      } catch (e) {
        console.warn('Failed loading episodes', e)
        setEpisodesForSeason([])
      } finally {
        setIsLoadingEpisodes(false)
      }
    }
    loadEpisodes()
  }, [isSeries, activeMovie?.id, isOpen, selectedSeason])

  // Handle similar movie click
  const handleSimilarMovieClick = (similarMovie: Movie, opts: { play?: boolean } = {}) => {
    const same = activeMovie && similarMovie.id === activeMovie.id
    if (same && !opts.play) return
    console.debug('[Modal] Similar select', { from: activeMovie?.id, to: similarMovie.id, play: !!opts.play })

    // Ask parent to adopt this movie first for source-of-truth consistency
    if (onMovieSelect) {
      try { onMovieSelect(similarMovie) } catch (e) { console.warn('onMovieSelect error', e) }
    }

    // Optimistic swap immediately for responsiveness
    setOverrideMovie(similarMovie as any)
    setSelectedSeason(1)
    setEpisodesForSeason([])
    setEpisodeProgress({})
    setLastWatched(null)
    episodesCacheRef.current = {}
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0
    })

    // Fallback: if parent hasn't supplied this id within 300ms, keep override; if it did, override will remain (same id) harmless
    setTimeout(() => {
      if (similarMovie.id !== (movie?.id || '') && overrideMovie?.id !== similarMovie.id) {
        setOverrideMovie(similarMovie as any)
      }
    }, 300)

    if (opts.play) {
      setTimeout(() => onPlay(similarMovie.id), 50)
    }
  }

  // Remove body overflow hidden to allow background scrolling
  // Netflix modal allows background to remain visible and scrollable

  if (!activeMovie) return null

  const matchPercentage = Math.floor(activeMovie.rating * 10) + Math.floor(Math.random() * 20)

  return (
  <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        key={activeMovie.id}
        className="pointer-events-auto w-[62vw] max-w-none h-[95vh] bg-black text-white border-0 p-0 overflow-hidden rounded-lg fixed top-[5vh] left-1/2 transform -translate-x-1/2 translate-y-0 shadow-2xl"
        showCloseButton={false}
        style={{ width: '62vw', maxWidth: 'none', zIndex: 1200 }}
      >
  <DialogTitle className="sr-only">{activeMovie.title}</DialogTitle>
  <DialogDescription className="sr-only">Movie details for {activeMovie.title}</DialogDescription>

        {/* Redesigned modal: full scroll area */}
        <div ref={scrollContainerRef} className="relative w-full h-full overflow-y-auto" style={{ backgroundColor: 'rgb(18, 18, 18)' }}>
          {/* Hero Section */}
          <div className="relative h-[58vh] w-full overflow-hidden">
            {/* Backdrop Image */}
            <div
              className="absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: `url(${activeMovie.backdrop || activeMovie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
                backgroundSize: '125%',
                backgroundPosition: 'center 25%',
              }}
            />

            {/* Subtle side gradient for depth */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background: `linear-gradient(
                  to right,
                  rgba(0, 0, 0, 0.3) 0%,
                  transparent 30%,
                  transparent 70%,
                  rgba(0, 0, 0, 0.1) 100%
                )`
              }}
            />

            {/* Netflix-style Bottom Gradient - Creates seamless transition */}
            <div
              className="absolute inset-x-0 bottom-0 h-[200px] pointer-events-none z-20"
              style={{
                background: `linear-gradient(
                  to bottom,
                  transparent 0%,
                  rgba(18, 18, 18, 0.1) 20%,
                  rgba(18, 18, 18, 0.3) 40%,
                  rgba(18, 18, 18, 0.6) 60%,
                  rgba(18, 18, 18, 0.8) 80%,
                  rgb(18, 18, 18) 100%
                )`
              }}
            />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full w-10 h-10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Title and Actions Overlay - Netflix style */}
            <div className="absolute bottom-6 left-8 right-8 z-30">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white leading-tight max-w-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {activeMovie.title}
              </h1>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onPlay(activeMovie.id)}
                  className="bg-white text-black hover:bg-gray-200 font-semibold px-5 py-2 rounded text-sm flex items-center space-x-1.5 shadow"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Play</span>
                </Button>
                <div className="h-9 w-9 flex items-center justify-center" onClick={(e)=>e.stopPropagation()}>
                  <WatchlistToggleButton inList={inWatch(activeMovie.id)} size={36} variant="overlay" onToggle={() => toggleWatch(activeMovie.id)} />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className={`border-2 border-gray-400 rounded-full w-9 h-9 ${isLiked === true ? 'bg-white text-black' : 'text-white hover:bg-white hover:text-black'}`}
                  onClick={() => setIsLiked(isLiked === true ? null : true)}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          {/* Content Section */}
          <div className="px-10 py-8">

              {/* Match percentage and metadata - Netflix style */}
              <div className="flex items-center space-x-3 text-sm mb-4">
                <span className="text-green-400 font-semibold">{matchPercentage}% Match</span>
                  <ImdbRating rating={activeMovie.rating} />
                  <span className="text-white">{activeMovie.year}</span>
                  <span className="text-gray-300">{activeMovie.runtime ? `${Math.floor(activeMovie.runtime / 60)}h ${activeMovie.runtime % 60}m` : '2h 8m'}
                </span>
                <div className="border border-gray-400 px-1.5 py-0.5 text-gray-300 text-xs">HD</div>
                <div className="border border-gray-400 px-1.5 py-0.5 text-gray-300 text-xs">13+</div>
              </div>

              {/* Description */}
              <p className="text-white text-sm leading-relaxed mb-8 max-w-4xl">
                {activeMovie.description || "At a stuffy New England prep school, an unconventional teacher inspires students to view their studies and lives from a more meaningful perspective."}
              </p>

              {isSeries && (
                <div className="mb-14">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-2xl font-semibold text-white">Episodes</h3>
            {lastWatched && lastWatched.season === selectedSeason && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-500 text-white hover:bg-white hover:text-black text-xs ml-4"
              onClick={() => onPlay(`${activeMovie.id}:S${lastWatched.season}E${lastWatched.episode}`)}
                        >
                          Resume S{lastWatched.season}E{lastWatched.episode}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-300">Season</label>
                      <SeasonSelect
                        seasons={availableSeasons}
                        value={selectedSeason}
                        onChange={(s) => setSelectedSeason(s)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {isLoadingEpisodes && (
                      <div className="text-gray-400 text-sm">Loading episodes...</div>
                    )}
                    {!isLoadingEpisodes && episodesForSeason.map(ep => {
                      const progressKey = `S${selectedSeason}E${ep.episode_number}`
                      const prog = episodeProgress[progressKey]
                      const barWidth = prog ? Math.min(100, Math.round(prog.fraction * 100)) : 0
                      const future = ep && (ep as any).air_date && new Date((ep as any).air_date) > new Date()
                      const releaseLabel = future ? new Date((ep as any).air_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null
                      const countdown = future ? formatCountdown((ep as any).air_date) : null
                      return (
                        <div
                          key={ep.episode_number}
                          className={`group flex items-center transition rounded-lg px-4 py-3 ${future ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${lastWatched && lastWatched.season === selectedSeason && lastWatched.episode === ep.episode_number ? 'bg-zinc-800 ring-1 ring-white/30' : 'bg-zinc-900/50 hover:bg-zinc-800/80'}`}
                          onClick={() => {
                            if (future) return
                            onPlay(`${activeMovie.id}:S${selectedSeason}E${ep.episode_number}`)
                            try {
                              localStorage.setItem(`series-progress:${activeMovie.id}`, JSON.stringify({ season: selectedSeason, episode: ep.episode_number }))
                              setLastWatched({ season: selectedSeason, episode: ep.episode_number })
                            } catch {}
                          }}
                        >
                          {ep.still && (
                            <img src={ep.still} alt="Still" className="w-28 h-16 object-cover rounded-md mr-4 flex-shrink-0 hidden md:block" />
                          )}
                          <div className="flex-1 pr-3 min-w-0">
                            <p className="text-white text-sm font-medium mb-1 flex items-center justify-between">
                              <span className="truncate">E{ep.episode_number} · {ep.name}</span>
                              {prog && <span className="text-[10px] text-gray-400 ml-2 shrink-0">{barWidth}%</span>}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {future && releaseLabel ? `Airs ${releaseLabel}${countdown ? ` · ${countdown}` : ''}` : (ep.runtime ? `${ep.runtime}m` : '')}
                            </p>
                            {prog && (
                              <div className="mt-1 h-1 w-full bg-zinc-700 rounded overflow-hidden">
                                <div className="h-full bg-red-600 transition-all" style={{ width: `${barWidth}%` }} />
                              </div>
                            )}
                          </div>
                          {!future && (
                            <Button size="icon" variant="ghost" className="text-white opacity-80 group-hover:opacity-100 hover:bg-white/10">
                              <Play className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      )})}
                    {!isLoadingEpisodes && episodesForSeason.length === 0 && (
                      <div className="text-gray-400 text-sm">No episodes available.</div>
                    )}
                  </div>
                  <p className="mt-4 text-[11px] text-gray-500">Progress sync (local + cloud). Episode cache ~30m.</p>
                </div>
              )}

              {/* Cast and Crew Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mb-8">
                <div>
                  <span className="text-gray-400">Cast: </span>
                  <span className="text-white">
                    {isLoadingCast
                      ? 'Loading cast information...'
                      : cast.length > 0
                        ? cast.map(actor => actor.name).join(', ') + (cast.length >= 5 ? ', more' : '')
                        : 'Cast information not available'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Genres: </span>
                  <span className="text-white">
            {activeMovie.genre && activeMovie.genre.length > 0
              ? activeMovie.genre.slice(0, 3).join(', ')
                      : 'No genres available'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">This movie is: </span>
                  <span className="text-white">
                    {activeMovie.genre && activeMovie.genre.length > 0
                      ? activeMovie.genre.slice(0, 2).map(g => g.toLowerCase()).join(', ')
                      : 'Information not available'
                    }
                  </span>
                </div>
              </div>

              {/* Similar Section - Redesigned */}
              <div className="mt-14"> 
                <h3 className="text-2xl font-semibold mb-5 text-white">More Like This</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-5">
                  {isLoadingSimilar ? (
                    Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="aspect-[2/3] bg-zinc-800/60 rounded-md animate-pulse" />
                    ))
                  ) : similarMovies.length > 0 ? (
          similarMovies.map(similarMovie => (
                      <div
                        key={similarMovie.id}
                        className="group relative aspect-[2/3] cursor-pointer rounded-md overflow-hidden bg-zinc-900/60 shadow-sm transform-gpu transition-transform duration-300 hover:scale-[1.045] hover:-translate-y-2 outline-none"
                        tabIndex={0}
                        aria-label={`Open details for ${similarMovie.title}`}
                        data-testid="more-like-tile"
                        onClick={() => handleSimilarMovieClick(similarMovie)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSimilarMovieClick(similarMovie) } }}
                      >
                        {similarMovie.poster ? (
                          <img
                            src={similarMovie.poster}
                            alt={similarMovie.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-zinc-700 flex items-center justify-center p-2">
                            <span className="text-gray-300 text-xs text-center line-clamp-3">{similarMovie.title}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                          <div className="flex gap-2">
                            <button
                              data-testid="tile-play"
                              onClick={(e) => { e.stopPropagation(); handleSimilarMovieClick(similarMovie, { play: true }) }}
                              className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                              title="Play"
                            >
                              <Play className="h-5 w-5" />
                            </button>
                            <div className="h-10 w-10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                              <WatchlistToggleButton 
                                inList={inWatch(similarMovie.id)} 
                                size={40} 
                                variant="overlay" 
                                onToggle={() => toggleWatch(similarMovie.id)} 
                              />
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSimilarMovieClick(similarMovie) }}
                              className="h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                              title="More Info"
                              aria-label="More Info"
                            >
                              <Info className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <ImdbRating rating={similarMovie.rating} size="micro" testId="tmdb-rating" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-6 text-center py-8">
                      <p className="text-gray-400 text-sm">No similar movies found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>{/* end content section */}
          </div>{/* end scroll wrapper */}
      </DialogContent>
    </Dialog>
  )
}
