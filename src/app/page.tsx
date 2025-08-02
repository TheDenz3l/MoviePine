"use client"

import dynamic from 'next/dynamic'

// Dynamically import the client-only component with no SSR
const ClientOnlyMovieApp = dynamic(() => import('@/components/ClientOnlyMovieApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading movies...</div>
    </div>
  )
})



export default function Home() {
  return <ClientOnlyMovieApp />
}
