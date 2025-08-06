"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, User } from "lucide-react"

export function Header() {

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

          {/* User Actions */}
          <div className="flex items-center space-x-4">
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
