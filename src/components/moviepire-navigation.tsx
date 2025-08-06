"use client"

import { Button } from "@/components/ui/button"
import { Search, Home, Film, Tv, Bookmark } from "lucide-react"
import { useState, useEffect } from "react"

interface MoviepireNavigationProps {
  onNavigate: (category: string) => void
  activeCategory: string
  onSearch?: (query: string) => void
}

export function MoviepireNavigation({ onNavigate, activeCategory, onSearch }: MoviepireNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [scrollOpacity, setScrollOpacity] = useState(0)

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim())
      setSearchQuery("")
      setShowSearch(false)
    }
  }

  const navItems = [
    { id: 'home', label: 'Browse', icon: Home },
    { id: 'popular', label: 'Movies', icon: Film },
    { id: 'trending', label: 'Series', icon: Tv },
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
      {/* Logo - Moviepire style */}
      <div className="flex items-center">
        <span className="text-2xl font-bold">
          <span className="text-white">MOVIE</span>
          <span className="text-red-600">pire</span>
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

      {/* Search - Moviepire style */}
      <div className="flex items-center">
        {showSearch ? (
          <form onSubmit={handleSearch} className="flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies..."
              className="bg-gray-800/80 text-white px-4 py-2 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-red-600/50 border border-gray-700"
              autoFocus
              onBlur={() => {
                if (!searchQuery.trim()) {
                  setShowSearch(false)
                }
              }}
            />
          </form>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(true)}
            className="text-gray-300 hover:text-white"
          >
            <Search className="w-5 h-5" />
          </Button>
        )}
      </div>
    </nav>
  )
}
