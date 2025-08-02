"use client"

import { useState } from "react"
import { Search, Home, Calendar, Tv, TrendingUp, Plus, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"

interface NetflixFloatingNavProps {
  onNavigate: (category: string) => void
  activeCategory: string
}

const navigationItems = [
  {
    icon: Search,
    category: "search",
    label: "Search"
  },
  {
    icon: Home,
    category: "home",
    label: "Home"
  },
  {
    icon: Calendar,
    category: "new",
    label: "New & Popular"
  },
  {
    icon: Tv,
    category: "tv",
    label: "TV Shows"
  },
  {
    icon: TrendingUp,
    category: "trending",
    label: "Trending"
  },
  {
    icon: Plus,
    category: "watchlist",
    label: "My List"
  },
  {
    icon: Shuffle,
    category: "random",
    label: "Browse by Languages"
  }
]

export function NetflixFloatingNav({ onNavigate, activeCategory }: NetflixFloatingNavProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <>
      {/* Navigation Trigger - Always visible on left edge */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-12 z-40 flex items-center justify-center cursor-pointer transition-all duration-300",
          isVisible && "pointer-events-none"
        )}
        onMouseEnter={() => setIsVisible(true)}
      >
        <div className="w-1 h-16 bg-white/20 rounded-r-full opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Floating Navigation Overlay */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-16 bg-black/95 backdrop-blur-sm z-50 transition-all duration-300 ease-out",
          isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
        )}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <div className="flex flex-col items-center py-8 space-y-6">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeCategory === item.category
            
            return (
              <button
                key={item.category}
                onClick={() => onNavigate(item.category)}
                className={cn(
                  "group relative p-3 rounded-lg transition-all duration-200",
                  "hover:bg-white/10 hover:scale-110",
                  isActive ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
                )}
                title={item.label}
              >
                <Icon className="w-6 h-6" />
                
                {/* Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-white text-black text-sm font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsVisible(false)}
        />
      )}
    </>
  )
}
