"use client"

import { Button } from "@/components/ui/button"
import { Search, Home, Film, Tv, Bookmark } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { TMDBAPI } from '@/lib/api/tmdb'

interface SearchResult {
  id: string
  title: string
  poster: string
  backdrop?: string
  year?: number
  type: 'movie' | 'tv'
}

interface MoviepireNavigationProps {
  onNavigate: (category: string) => void
  activeCategory: string
  onSearchResults?: (results: SearchResult[], query: string, isSearching: boolean) => void
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '')

export function MoviepireNavigation({ onNavigate, activeCategory, onSearchResults }: MoviepireNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [scrollOpacity, setScrollOpacity] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Progressive scroll detection for smooth navigation background transition
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      // Calculate progressive opacity from 0 to 1 over first 100px of scroll
      const opacity = Math.min(scrollTop / 100, 1)
      setScrollOpacity(opacity)
    }

    // Set initial state
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Don't close if clicking on search container
      if (searchContainerRef.current && searchContainerRef.current.contains(target)) {
        return
      }

      // Don't close if clicking on the search overlay (seamless search results)
      const searchOverlay = document.querySelector('[data-search-overlay]')
      if (searchOverlay && searchOverlay.contains(target)) {
        return
      }

      // Close search if clicking outside
      setShowSearch(false)
      setSearchQuery("")
      if (onSearchResults) {
        onSearchResults([], "", false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, []) // Remove onSearchResults from dependencies

  // Real-time search as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length > 0) {
      setIsSearching(true)
      if (onSearchResults) {
        onSearchResults([], searchQuery, true)
      }

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await tmdbApi.searchMulti(searchQuery.trim(), 1)
          const transformedResults: SearchResult[] = results.results
            .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item: any) => ({
              id: item.id.toString(),
              title: item.media_type === 'movie' ? item.title : item.name,
              poster: item.poster_path
                ? tmdbApi.getPosterUrl(item.poster_path, 'w500')
                : '/placeholder-poster.svg',
              backdrop: item.backdrop_path
                ? tmdbApi.getBackdropUrl(item.backdrop_path, 'original')
                : undefined,
              year: item.media_type === 'movie'
                ? new Date(item.release_date || '').getFullYear() || undefined
                : new Date(item.first_air_date || '').getFullYear() || undefined,
              type: item.media_type as 'movie' | 'tv'
            }))
            .filter((item: SearchResult) => item.title)

          if (onSearchResults) {
            onSearchResults(transformedResults, searchQuery, false)
          }
        } catch (error) {
          console.error('Search error:', error)
          if (onSearchResults) {
            onSearchResults([], searchQuery, false)
          }
        } finally {
          setIsSearching(false)
        }
      }, 200) // Fast response for real-time feel
    } else {
      setIsSearching(false)
      if (onSearchResults) {
        onSearchResults([], "", false)
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery]) // Remove onSearchResults from dependencies to prevent infinite loop

  const handleSearchClick = () => {
    setShowSearch(true)
  }

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Keep the search active, don't close it
  }

  const navItems = [
    { id: 'home', label: 'Browse', icon: Home },
    { id: 'explore-movies', label: 'Movies', icon: Film },
    { id: 'explore-series', label: 'Series', icon: Tv },
    { id: 'recently-played', label: 'My List', icon: Bookmark },
  ]

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        backgroundColor: `rgba(18, 18, 18, ${scrollOpacity})`,
        borderBottom: `1px solid rgba(75, 85, 99, ${scrollOpacity * 0.5})`,
        backdropFilter: scrollOpacity > 0 ? 'blur(8px)' : 'none',
        transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
        transition: 'background-color 0.3s ease-out, border-color 0.3s ease-out, backdrop-filter 0.3s ease-out'
      }}
    >
      {/* Logo - Bmar Movies style */}
      <div className="flex items-center">
        <span className="text-2xl font-bold">
          <span className="text-white">Bmar</span>
          <span className="text-red-600"> Movies</span>
        </span>
      </div>

      {/* Navigation Menu - Moviepire style */}
      <div className="flex items-center space-x-8">
        {navItems.map((item) => {
          const IconComponent = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center text-sm font-bold transition-colors duration-200 hover:text-white ${
                activeCategory === item.id
                  ? 'text-red-600'
                  : 'text-gray-300'
              }`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Search - Fixed position search bar */}
      <div className="flex items-center relative" ref={searchContainerRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSearchClick}
          className="text-gray-300 hover:text-white hover:bg-white/10"
        >
          <Search className="w-5 h-5" />
        </Button>

        {showSearch && (
          <div className="absolute right-0 top-0 z-50">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search for movies and TV shows..."
                className="bg-[rgb(18,18,18)] text-white px-4 py-2 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-red-600/50 border border-gray-600/50 backdrop-blur-sm shadow-lg"
                autoFocus
              />
            </form>
          </div>
        )}
      </div>
    </nav>
  )
}
