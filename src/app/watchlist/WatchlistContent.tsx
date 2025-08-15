"use client"
import { useMyList } from '@/components/list/useMyList'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import WatchlistCarousel from '@/components/watchlist/WatchlistCarousel'
import { RecentlyPlayedRow } from '@/components/recently-played-row'
import { RecentlyPlayedService, RecentlyPlayedMovie } from '@/lib/services/recently-played-service'

export default function WatchlistContent(){
  const { watchlist, loading, reload, removeWatch } = useMyList()
  const router = useRouter()
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedMovie[]>([])

  // Load lists
  useEffect(()=>{ reload() },[reload])
  useEffect(()=>{ setRecentlyPlayed(RecentlyPlayedService.getAll()) },[])

  // Listen for global watchlist mutation events to refresh without hard reload when navigating back
  useEffect(() => {
    const refresh = () => { reload() }
    window.addEventListener('app:watchlistAdded', refresh)
    window.addEventListener('app:watchlistRemoved', refresh)
    return () => {
      window.removeEventListener('app:watchlistAdded', refresh)
      window.removeEventListener('app:watchlistRemoved', refresh)
    }
  }, [reload])

  const refreshRecentlyPlayed = useCallback(()=>{
    setRecentlyPlayed(RecentlyPlayedService.getAll())
  },[])

  const handlePlay = useCallback((movieId: string, resumeTime?: number)=>{
    // Reuse global app event pattern so existing player logic can handle it.
    window.dispatchEvent(new CustomEvent('app:playMovie', { detail: { id: movieId, resumeTime } }))
  },[])

  const handleMovieSelect = useCallback((m:any)=>{
    window.dispatchEvent(new CustomEvent('app:openModal', { detail: { id: m.id } }))
  },[])

  const handleMoreInfo = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent('app:openModal', { detail: { id } }))
  }, [])

  const handleRemoveFromWatchlist = useCallback((id: string) => {
    removeWatch(id)
  }, [removeWatch])

  // Organize watchlist into different sections
  const organizedWatchlist = useMemo(() => {
    if (!watchlist.length) return null

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Sort by added date (most recent first)
    const sortedWatchlist = [...watchlist].sort((a, b) => 
      new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
    )

    return {
      // Recently added (last 7 days)
      recentlyAdded: sortedWatchlist.filter(item => 
        new Date(item.added_at) > sevenDaysAgo
      ).slice(0, 12),
      
      // Movies
      movies: sortedWatchlist.filter(item => item.content_type === 'movie'),
      
      // TV Shows
      tvShows: sortedWatchlist.filter(item => 
        item.content_type === 'series' || item.content_type === 'tv'
      ),

      // All items for full view
      allItems: sortedWatchlist
    }
  }, [watchlist])

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(18,18,18)] p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-3 text-white text-lg">Loading watchlist...</span>
        </div>
      </div>
    )
  }

  if (!organizedWatchlist && recentlyPlayed.length === 0) {
    return (
      <div className="min-h-screen bg-[rgb(18,18,18)] p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">My Watchlist</h1>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-semibold text-gray-300 mb-4">Your watchlist is empty</h2>
            <p className="text-gray-500 text-lg mb-8">
              Start building your personal collection by clicking the + button on any movie or TV show
            </p>
            <button 
              onClick={() => router.push('/')}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Browse Movies & TV Shows
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(18,18,18)] p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">My Watchlist</h1>
          <p className="text-gray-400 text-lg">
            Your personal collection of movies and TV shows
          </p>
        </div>

        {/* Recently Added Section */}
        {organizedWatchlist?.recentlyAdded && organizedWatchlist.recentlyAdded.length > 0 && (
          <WatchlistCarousel
            items={organizedWatchlist.recentlyAdded}
            title="Recently Added"
            onPlay={handlePlay}
            onRemove={handleRemoveFromWatchlist}
            onInfo={handleMoreInfo}
          />
        )}

        {/* Movies Section */}
        {organizedWatchlist?.movies && organizedWatchlist.movies.length > 0 && (
          <WatchlistCarousel
            items={organizedWatchlist.movies}
            title="Movies"
            onPlay={handlePlay}
            onRemove={handleRemoveFromWatchlist}
            onInfo={handleMoreInfo}
          />
        )}

        {/* TV Shows Section */}
        {organizedWatchlist?.tvShows && organizedWatchlist.tvShows.length > 0 && (
          <WatchlistCarousel
            items={organizedWatchlist.tvShows}
            title="TV Shows"
            onPlay={handlePlay}
            onRemove={handleRemoveFromWatchlist}
            onInfo={handleMoreInfo}
          />
        )}

        {/* All Items Section (if there are items not covered above) */}
        {organizedWatchlist?.allItems && organizedWatchlist.allItems.length > 0 && (
          organizedWatchlist.recentlyAdded.length === 0 && 
          organizedWatchlist.movies.length === 0 && 
          organizedWatchlist.tvShows.length === 0
        ) && (
          <WatchlistCarousel
            items={organizedWatchlist.allItems}
            title="All Items"
            onPlay={handlePlay}
            onRemove={handleRemoveFromWatchlist}
            onInfo={handleMoreInfo}
          />
        )}

        {/* Recently Played Section */}
        {recentlyPlayed.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Continue Watching</h2>
            <RecentlyPlayedRow 
              movies={recentlyPlayed}
              onPlay={handlePlay}
              onMovieSelect={handleMovieSelect}
              onMoviesChange={refreshRecentlyPlayed}
            />
          </div>
        )}
      </div>
    </div>
  )
}
