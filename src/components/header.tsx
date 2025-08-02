"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Bell, User } from "lucide-react"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="text-red-600 text-2xl font-bold">
              MOVIEFLIX
            </div>
            <nav className="hidden md:flex space-x-6">
              <Button variant="ghost" className="text-white hover:text-gray-300">
                Home
              </Button>
              <Button variant="ghost" className="text-white hover:text-gray-300">
                Movies
              </Button>
              <Button variant="ghost" className="text-white hover:text-gray-300">
                TV Shows
              </Button>
              <Button variant="ghost" className="text-white hover:text-gray-300">
                My List
              </Button>
            </nav>
          </div>

          {/* Search and User Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search movies, shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400 w-64"
              />
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:text-gray-300">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-red-600 text-white">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
