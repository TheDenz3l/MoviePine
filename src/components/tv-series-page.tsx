"use client"

import { useState, useEffect, useCallback } from "react"
import { StreamingService } from '@/lib/services/streaming'
import { StreamingSeries } from '@/lib/services/streaming'
import { NetflixHeroSection } from '@/components/netflix-hero-section'
import { MoviepireNavigation } from '@/components/moviepire-navigation'
import { NetflixCarousel as NewNetflixCarousel } from '@/components/netflix-style'
import { useMyList } from '@/components/list/useMyList'
import { MoviepireFooter } from '@/components/moviepire-footer'
import { RealTimeSearchPage } from '@/components/real-time-search-page'

interface TVSeriesPageProps {
  onPlay: (seriesId: string, title: string) => void
  onAddToList?: (seriesId: string) => void // optional now
  onMoreInfo: (seriesId: string) => void
  onNavigate: (category: string) => void
  onSearch: (query: string) => void
  activeCategory: string
}

interface SearchResult {
  id: string
  title: string
  year?: number
  poster: string
  type: 'movie' | 'tv'
}

export function TVSeriesPage({
  onPlay,
  onAddToList,
  onMoreInfo,
  onNavigate,
  onSearch,
  activeCategory
}: TVSeriesPageProps) {
  const { watchlist, addWatch, removeWatch } = useMyList()
  const inWatch = useCallback((id:string)=> !!watchlist?.some(w=>w.content_id===id), [watchlist])
  const toggleWatch = (id:string) => { inWatch(id) ? removeWatch(id) : addWatch(id,'series'); onAddToList?.(id) }
  // Series state
  const [featuredSeries, setFeaturedSeries] = useState<StreamingSeries | null>(null)
  const [trendingSeries, setTrendingSeries] = useState<StreamingSeries[]>([])
  const [popularSeries, setPopularSeries] = useState<StreamingSeries[]>([])
  const [topRatedSeries, setTopRatedSeries] = useState<StreamingSeries[]>([])
  const [onTheAirSeries, setOnTheAirSeries] = useState<StreamingSeries[]>([])
  const [animeSeries, setAnimeSeries] = useState<StreamingSeries[]>([])
  const [dramaSeries, setDramaSeries] = useState<StreamingSeries[]>([])
  const [comedySeries, setComedySeries] = useState<StreamingSeries[]>([])
  const [actionSeries, setActionSeries] = useState<StreamingSeries[]>([])
  const [sciFiSeries, setSciFiSeries] = useState<StreamingSeries[]>([])
  const [crimeSeries, setCrimeSeries] = useState<StreamingSeries[]>([])
  
  // Loading and search state
  const [isLoading, setIsLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showRealTimeSearch, setShowRealTimeSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const streamingService = new StreamingService({
    tmdbApiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY || '',
    torboxApiKey: process.env.NEXT_PUBLIC_TORBOX_API_KEY || '',
    debridService: 'realdebrid',
    debridApiKey: process.env.NEXT_PUBLIC_REAL_DEBRID_API_KEY || ''
  })

  useEffect(() => {
    loadTVData()
    
    // Listen for search overlay events
    const handleOpenSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail?.query || "")
      setShowRealTimeSearch(true)
    }
    
    const handleCloseSearch = () => {
      setShowRealTimeSearch(false)
      setSearchQuery("")
    }

    window.addEventListener('app:openRealTimeSearch', handleOpenSearch as EventListener)
    window.addEventListener('app:closeRealTimeSearch', handleCloseSearch)

    return () => {
      window.removeEventListener('app:openRealTimeSearch', handleOpenSearch as EventListener)
      window.removeEventListener('app:closeRealTimeSearch', handleCloseSearch)
    }
  }, [])

  const loadTVData = async () => {
    try {
      setIsLoading(true)
      
      // Load all TV series data
      const [
        trending,
        popular,
        topRated,
        onTheAir,
        anime,
        drama,
        comedy,
        action,
        sciFi,
        crime
      ] = await Promise.all([
        streamingService.getTrendingSeries(),
        streamingService.getPopularSeries(),
        streamingService.getTopRatedSeries(),
        streamingService.getOnTheAirSeries(),
        streamingService.getSeriesByGenre(16), // Animation (anime)
        streamingService.getSeriesByGenre(18), // Drama
        streamingService.getSeriesByGenre(35), // Comedy
        streamingService.getSeriesByGenre(10759), // Action & Adventure
        streamingService.getSeriesByGenre(10765), // Sci-Fi & Fantasy
        streamingService.getSeriesByGenre(80) // Crime
      ])

      setTrendingSeries(trending)
      setPopularSeries(popular)
      setTopRatedSeries(topRated)
      setOnTheAirSeries(onTheAir)
      setAnimeSeries(anime)
      setDramaSeries(drama)
      setComedySeries(comedy)
      setActionSeries(action)
      setSciFiSeries(sciFi)
      setCrimeSeries(crime)

      // Set featured series (first trending series)
      if (trending.length > 0) {
        setFeaturedSeries(trending[0])
      }

    } catch (error) {
      console.error('Error loading TV series data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlay = (movie: any) => {
    onPlay(movie.id, movie.title || 'Unknown Series')
  }

  const handleSearchResultSelect = (result: SearchResult) => {
    // Convert to the expected format and handle selection
    const searchSeries = {
      id: result.id,
      title: result.title,
      year: result.year || new Date().getFullYear(),
      poster: result.poster
    }
    setShowRealTimeSearch(false)
    setSearchQuery("")
  }

  const handleAddToList = (movie: any) => { toggleWatch(movie.id) }

  // Unified more-info handler: supports being called with either a movie object or a raw id string.
  // The hero component invokes onMoreInfo with a string id; the carousel passes a movie object.
  const handleMoreInfo = (movieOrId: any) => {
    const id = typeof movieOrId === 'string' ? movieOrId : movieOrId?.id
    if (!id) {
      console.warn('[TVSeriesPage] handleMoreInfo called without a valid id', movieOrId)
      return
    }
    onMoreInfo(id)
  }

  const findSeriesById = (seriesId: string) => {
    const allSeries = [
      ...trendingSeries,
      ...popularSeries,
      ...topRatedSeries,
      ...onTheAirSeries,
      ...animeSeries,
      ...dramaSeries,
      ...comedySeries,
      ...actionSeries,
      ...sciFiSeries,
      ...crimeSeries
    ]
    return allSeries.find(s => s.id === seriesId)
  }

  // Show real-time search overlay
  if (showRealTimeSearch) {
    return (
      <RealTimeSearchPage
        initialQuery={searchQuery}
        onMovieSelect={(movie) => handleSearchResultSelect({
          id: movie.id,
          title: movie.title,
          year: movie.year || new Date().getFullYear(),
          poster: movie.poster || '',
          type: movie.type
        })}
        onPlay={(movieId, title) => onPlay(movieId, title)}
        onAddToList={(movie) => handleAddToList(movie)}
        onMoreInfo={(movie) => handleMoreInfo(movie)}
        onClose={() => setShowRealTimeSearch(false)}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
        <MoviepireNavigation
          onNavigate={onNavigate}
          activeCategory={activeCategory}
        />
        <div className="flex items-center justify-center h-screen">
          <div className="text-2xl">Loading TV Series...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] text-white">
      {/* Navigation */}
      <MoviepireNavigation
        onNavigate={onNavigate}
        activeCategory={activeCategory}
      />

      {/* Hero Section */}
      {featuredSeries && (
        <NetflixHeroSection
          movie={{
            id: featuredSeries.id,
            title: featuredSeries.title,
            poster: featuredSeries.poster || '',
            backdrop: featuredSeries.backdrop || featuredSeries.poster || '',
            year: featuredSeries.year || new Date().getFullYear(),
            rating: featuredSeries.rating || 0,
            genre: featuredSeries.genre || [],
            description: featuredSeries.description || 'No description available.',
            runtime: featuredSeries.episodes ? featuredSeries.episodes * 45 : undefined
          }}
          onPlay={handlePlay}
          onMoreInfo={handleMoreInfo}
        />
      )}

      {/* TV Series Carousels Grid */}
      <div className="relative z-10 space-y-8 pb-16 bg-[rgb(18,18,18)] overflow-visible">
        <div className="pointer-events-none absolute -top-40 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[rgba(18,18,18,0.55)] to-[rgb(18,18,18)]" />
        {/* Trending This Week */}
        <section className="px-6 md:px-12" aria-label="Trending TV Series">
          <NewNetflixCarousel
            title="Trending This Week"
            movies={trendingSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Popular Series */}
        <section className="px-6 md:px-12" aria-label="Popular TV Series">
          <NewNetflixCarousel
            title="Popular Series"
            movies={popularSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Currently Airing */}
        <section className="px-6 md:px-12" aria-label="Currently Airing Series">
          <NewNetflixCarousel
            title="Currently Airing"
            movies={onTheAirSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Top Rated Series */}
        <section className="px-6 md:px-12" aria-label="Top Rated TV Series">
          <NewNetflixCarousel
            title="Top Rated Series"
            movies={topRatedSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Anime Series */}
        <section className="px-6 md:px-12" aria-label="Anime Series">
          <NewNetflixCarousel
            title="Anime Series"
            movies={animeSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Drama Series */}
        <section className="px-6 md:px-12" aria-label="Drama Series">
          <NewNetflixCarousel
            title="Drama Series"
            movies={dramaSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Comedy Series */}
        <section className="px-6 md:px-12" aria-label="Comedy Series">
          <NewNetflixCarousel
            title="Comedy Series"
            movies={comedySeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Action & Adventure Series */}
        <section className="px-6 md:px-12" aria-label="Action Adventure Series">
          <NewNetflixCarousel
            title="Action & Adventure"
            movies={actionSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Sci-Fi & Fantasy Series */}
        <section className="px-6 md:px-12" aria-label="SciFi Fantasy Series">
          <NewNetflixCarousel
            title="Sci-Fi & Fantasy"
            movies={sciFiSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            isInList={(id:string)=>inWatch(id)}
            onMoreInfo={handleMoreInfo}
          />
        </section>

        {/* Crime Series */}
        <section className="px-6 md:px-12" aria-label="Crime Series">
          <NewNetflixCarousel
            title="Crime Series"
            movies={crimeSeries.slice(0, 30).map(series => ({
              id: series.id,
              title: series.title,
              poster: series.poster || '',
              backdrop: series.backdrop || series.poster || '',
              year: series.year,
              rating: series.rating,
              genre: series.genre
            }))}
            onPlay={handlePlay}
            onAddToList={handleAddToList}
            onMoreInfo={handleMoreInfo}
          />
        </section>
      </div>

      {/* Footer */}
      <MoviepireFooter />
    </div>
  )
}
