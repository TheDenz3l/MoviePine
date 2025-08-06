"use client"

import { Button } from "@/components/ui/button"
import { Film, Home, Tv, List, Search } from "lucide-react"
import { useState } from "react"

interface MoviepireNavigationProps {
  onNavigate: (category: string) => void
  activeCategory: string
  onSearch?: (query: string) => void
}

export function MoviepireNavigation({ onNavigate, activeCategory, onSearch }: MoviepireNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

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
    { id: 'recently-played', label: 'My List', icon: List },
  ]

  return (
    <nav className="flex items-center justify-between p-4 bg-rgb(18,18,18) border-b border-gray-800 relative z-50">
      {/* Logo */}
      <div className="flex items-center">
        <Film className="w-8 h-8 text-white mr-2" />
        <span className="text-2xl font-bold text-white">Moviepire</span>
      </div>

      {/* Navigation Menu */}
      <div className="flex items-center space-x-6">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${
                activeCategory === item.id ? 'text-white bg-white/10' : 'text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Search and Profile */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="bg-gray-800 text-white px-3 py-2 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-white/20"
                autoFocus
                onBlur={() => {
                  if (!searchQuery.trim()) {
                    setShowSearch(false)
                  }
                }}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="ml-2"
              >
                <Search className="w-5 h-5" />
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Profile */}
        <Button variant="ghost" size="icon">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold">U</span>
          </div>
        </Button>
      </div>
    </nav>
  )
}
