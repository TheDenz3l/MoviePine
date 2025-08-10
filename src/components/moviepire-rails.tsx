"use client"

import { useEffect, useState } from 'react'
import { StreamingMovie, StreamingSeries, StreamingService } from '@/lib/services/streaming'
import NetflixCarousel from '@/components/cinematic/NetflixCarousel'

interface MoviepireRailsProps {
  service: StreamingService
  movies: StreamingMovie[]
  series: StreamingSeries[]
  onPlay: (movieId: string, titleOverride?: string) => void
  onAddToList: (movieId: string) => void
  onMoreInfo: (movieId: string) => void
  transformMovie: (m: StreamingMovie) => any
  transformSeries: (s: StreamingSeries) => any
}

// Lightweight rail state holder
interface RailState<T> {
  title: string
  items: T[]
  loading: boolean
  error?: string
}

export function MoviepireRails({
  service,
  movies,
  series,
  onPlay,
  onAddToList,
  onMoreInfo,
  transformMovie,
  transformSeries
}: MoviepireRailsProps) {
  const [popularMovies, setPopularMovies] = useState<RailState<StreamingMovie>>({ title: 'Popular movies', items: movies.slice(0, 24), loading: false })
  const [topRatedMovies, setTopRatedMovies] = useState<RailState<StreamingMovie>>({ title: 'Top Rated Movies', items: [], loading: true })
  const [trendingWeekly, setTrendingWeekly] = useState<RailState<StreamingMovie>>({ title: 'Trending movies this week', items: movies.slice(0, 12), loading: false })
  const [popularSeries, setPopularSeries] = useState<RailState<StreamingSeries>>({ title: 'Popular Series', items: series.slice(0, 12), loading: true })
  const [topRatedSeries, setTopRatedSeries] = useState<RailState<StreamingSeries>>({ title: 'Top Rated Series', items: [], loading: true })
  const [onTheAirSeries, setOnTheAirSeries] = useState<RailState<StreamingSeries>>({ title: 'On The Air Series', items: [], loading: true })

  useEffect(() => {
    // Parallel fetch additional rails (avoid blocking initial render)
    let isCancelled = false
    ;(async () => {
      try {
        setTopRatedMovies(r => ({ ...r, loading: true }))
        const [topRatedM, popularS, topRatedS, onAirS] = await Promise.all([
          service.getTopRatedMovies(),
          service.getPopularSeries(),
          service.getTopRatedSeries(),
          service.getOnTheAirSeries(),
        ])
        if (isCancelled) return
        setTopRatedMovies({ title: 'Top Rated Movies', items: topRatedM.slice(0, 24), loading: false })
        setPopularSeries({ title: 'Popular Series', items: popularS.slice(0, 18), loading: false })
        setTopRatedSeries({ title: 'Top Rated Series', items: topRatedS.slice(0, 18), loading: false })
        setOnTheAirSeries({ title: 'On The Air Series', items: onAirS.slice(0, 18), loading: false })
      } catch (e: any) {
        if (isCancelled) return
        setTopRatedMovies(r => ({ ...r, loading: false, error: e?.message || 'Failed' }))
      }
    })()
    return () => { isCancelled = true }
  }, [service])

  return (
    <div className="space-y-6">
      {/* Trending movies section upgraded to browse replication carousel */}
      <NetflixCarousel
        id="trending-weekly"
        title={trendingWeekly.title}
        items={trendingWeekly.items.map(transformMovie)}
        onPlay={(id: string) => onPlay(id)}
        onAdd={(id: string) => onAddToList(id)}
        onInfo={(id: string) => onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={80}
        prefetchNeighbors
        showMetadata
      />
      <NetflixCarousel
        id="popular-movies"
        title={popularMovies.title}
        items={popularMovies.items.map(transformMovie)}
        onPlay={(id: string) => onPlay(id)}
        onAdd={(id: string) => onAddToList(id)}
        onInfo={(id: string) => onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={70}
        prefetchNeighbors
        showMetadata={false}
        showTitle={false}
        actionButtonSize={40}
        frameLift
        frameLiftScale={1.045}
        frameLiftTranslateY={-8}
      />
      <NetflixCarousel
        id="popular-series"
        title={popularSeries.title + (popularSeries.loading ? '…' : '')}
        items={popularSeries.items.map(transformSeries)}
        onPlay={(id: string) => onPlay(id)}
        onAdd={(id: string) => onAddToList(id)}
        onInfo={(id: string) => onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={70}
        prefetchNeighbors
        showMetadata={false}
        showTitle={false}
        actionButtonSize={40}
        frameLift
        frameLiftScale={1.045}
        frameLiftTranslateY={-8}
      />
      <NetflixCarousel
        id="top-rated-movies"
        title={topRatedMovies.title + (topRatedMovies.loading ? '…' : '')}
        items={topRatedMovies.items.map(transformMovie)}
        onPlay={(id: string) => onPlay(id)}
        onAdd={(id: string) => onAddToList(id)}
        onInfo={(id: string) => onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={70}
        prefetchNeighbors
        showMetadata={false}
        showTitle={false}
        actionButtonSize={40}
        frameLift
        frameLiftScale={1.045}
        frameLiftTranslateY={-8}
      />
      <NetflixCarousel
        id="top-rated-series"
        title={topRatedSeries.title + (topRatedSeries.loading ? '…' : '')}
        items={topRatedSeries.items.map(transformSeries)}
        onPlay={(id: string) => onPlay(id)}
        onAdd={(id: string) => onAddToList(id)}
        onInfo={(id: string) => onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={70}
        prefetchNeighbors
        showMetadata={false}
        showTitle={false}
        actionButtonSize={40}
        frameLift
        frameLiftScale={1.045}
        frameLiftTranslateY={-8}
      />
      <NetflixCarousel
        id="on-the-air-series"
        title={onTheAirSeries.title + (onTheAirSeries.loading ? '…' : '')}
        items={onTheAirSeries.items.map(transformSeries)}
        onPlay={(id: string) => onPlay(id)}
        onAdd={(id: string) => onAddToList(id)}
        onInfo={(id: string) => onMoreInfo(id)}
        browseReplication
        titlePopOut
        intentDelayMs={70}
        prefetchNeighbors
        showMetadata={false}
        showTitle={false}
        actionButtonSize={40}
        frameLift
        frameLiftScale={1.045}
        frameLiftTranslateY={-8}
      />
    </div>
  )
}
