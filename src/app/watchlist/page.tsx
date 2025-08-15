import dynamic from 'next/dynamic'

// Disable SSR because the watchlist hook depends on client auth state.
const WatchlistContent = dynamic(() => import('./WatchlistContent'), { ssr: false })

export default function Page() {
	return <WatchlistContent />
}
