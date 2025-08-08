"use client"

import dynamic from 'next/dynamic'

const ClientOnlyMovieApp = dynamic(() => import('@/components/ClientOnlyMovieApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading movies...</div>
    </div>
  )
})

export default function ClientRoot() {
  return <ClientOnlyMovieApp />
}


