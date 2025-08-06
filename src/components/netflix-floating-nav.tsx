"use client"

import { useState } from "react"
import { Search, Bell, User, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface NetflixTopNavProps {
  onNavigate: (category: string) => void
  activeCategory: string
}

const navigationItems = [
  { category: "home", label: "Home" },
  { category: "tv", label: "TV Series" },
  { category: "movies", label: "Films" },
  { category: "new", label: "New & Popular" },
  { category: "watchlist", label: "My List" },
  { category: "random", label: "Browse by Languages" }
]

export function NetflixFloatingNav({ onNavigate, activeCategory }: NetflixTopNavProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/60 to-transparent backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-16 py-4">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center space-x-8">
          {/* Netflix-style Logo */}
          <div className="text-red-600 font-bold text-2xl tracking-tight">
            MOVIEPINE
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <button
                key={item.category}
                onClick={() => onNavigate(item.category)}
                className={cn(
                  "text-sm font-medium transition-colors duration-200 hover:text-gray-300",
                  activeCategory === item.category
                    ? "text-white"
                    : "text-gray-400"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side - Search, Notifications, Profile */}
        <div className="flex items-center space-x-4">
          {/* Search Icon */}
          <button
            onClick={() => onNavigate('search')}
            className="p-2 text-white hover:text-gray-300 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="p-2 text-white hover:text-gray-300 transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-1 text-white hover:text-gray-300 transition-colors"
            >
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 backdrop-blur-sm border border-gray-700 rounded-md py-2">
                <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors">
                  Account
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors">
                  Settings
                </button>
                <hr className="border-gray-700 my-2" />
                <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="md:hidden px-4 pb-4">
        <div className="flex flex-wrap gap-4">
          {navigationItems.map((item) => (
            <button
              key={item.category}
              onClick={() => onNavigate(item.category)}
              className={cn(
                "text-sm font-medium transition-colors duration-200 hover:text-gray-300",
                activeCategory === item.category
                  ? "text-white"
                  : "text-gray-400"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
