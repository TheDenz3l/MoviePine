"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  title: string
  year: number
  poster: string
  type: 'movie' | 'tv'
}

interface HeroSearchProps {
  onSearch: (query: string) => void
  onResultSelect: (result: SearchResult) => void
  searchResults: SearchResult[]
  isLoading: boolean
  className?: string
  onNavigateToSearch?: (query: string) => void
}

export function HeroSearch({
  onSearch,
  onResultSelect,
  searchResults,
  isLoading,
  className,
  onNavigateToSearch
}: HeroSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
        setShowResults(false)
        setQuery("")
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Handle search input changes
  const handleInputChange = (value: string) => {
    setQuery(value)
    setShowResults(value.length > 0)
    onSearch(value)
  }

  // Handle search button click
  const handleSearchClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    }
  }

  // Handle close button click
  const handleClose = () => {
    setIsExpanded(false)
    setShowResults(false)
    setQuery("")
  }

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result)
    setIsExpanded(false)
    setShowResults(false)
    setQuery("")
  }

  // Handle Enter key for search results navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Enter' && query.trim()) {
      // Navigate to search results page
      if (onNavigateToSearch) {
        onNavigateToSearch(query.trim())
      } else {
        window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
      }
      handleClose()
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Button/Input Container */}
      <div className={cn(
        "flex items-center transition-all duration-300 ease-out",
        isExpanded 
          ? "w-80 bg-black/80 backdrop-blur-sm border border-white/20 rounded-md" 
          : "w-auto"
      )}>
        {!isExpanded ? (
          // Search Icon Button
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearchClick}
            className="text-white hover:text-gray-300 hover:bg-white/10 h-10 w-10"
          >
            <Search className="h-5 w-5" />
          </Button>
        ) : (
          // Expanded Search Input
          <div className="flex items-center w-full">
            <Search className="h-4 w-4 text-gray-400 ml-3" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search movies, shows..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-transparent px-3"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-gray-400 hover:text-white h-8 w-8 mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-sm border border-white/20 rounded-md max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.slice(0, 8).map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors duration-200 flex items-center space-x-3"
                >
                  <img
                    src={result.poster}
                    alt={result.title}
                    className="w-10 h-15 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-poster.svg'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {result.title}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {result.year} • {result.type === 'movie' ? 'Movie' : 'TV Show'}
                    </div>
                  </div>
                </button>
              ))}
              {query.trim() && (
                <button
                  onClick={() => {
                    if (onNavigateToSearch) {
                      onNavigateToSearch(query.trim())
                    } else {
                      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
                    }
                    handleClose()
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors duration-200 border-t border-white/10"
                >
                  <div className="text-white font-medium">
                    See all results for "{query}"
                  </div>
                  <div className="text-gray-400 text-sm">
                    View complete search results
                  </div>
                </button>
              )}
            </div>
          ) : query.trim() ? (
            <div className="p-4 text-center text-gray-400">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
