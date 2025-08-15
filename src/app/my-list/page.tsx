"use client"
import { useEffect } from 'react'
import { redirect } from 'next/navigation'

// Legacy route retained for old bookmarks; immediately client-redirects.
export default function LegacyMyListRedirect(){
  useEffect(()=>{ redirect('/watchlist') },[])
  return null
}
