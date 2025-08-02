"use client"

import { Search, TrendingUp, Star, Play, Home, Film } from "lucide-react"
import { useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Navigation items for the movie app
const navigationItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    category: "main"
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
    category: "main"
  },
  {
    title: "Trending",
    url: "/trending",
    icon: TrendingUp,
    category: "discover"
  },
  {
    title: "Popular",
    url: "/popular",
    icon: Star,
    category: "discover"
  },
  {
    title: "Now Playing",
    url: "/now-playing",
    icon: Play,
    category: "discover"
  },
]

interface AppSidebarProps {
  onNavigate?: (category: string) => void
  activeCategory?: string
}

export function AppSidebar({ onNavigate, activeCategory = "home" }: AppSidebarProps) {
  const [selectedItem, setSelectedItem] = useState(activeCategory)

  const handleItemClick = (item: typeof navigationItems[0]) => {
    setSelectedItem(item.title.toLowerCase())
    if (onNavigate) {
      onNavigate(item.title.toLowerCase())
    }
  }

  const mainItems = navigationItems.filter(item => item.category === "main")
  const discoverItems = navigationItems.filter(item => item.category === "discover")

  return (
    <Sidebar className="border-r border-gray-800 bg-black animate-slide-in-left">
      <SidebarHeader className="border-b border-gray-800 p-6">
        <div className="flex items-center space-x-2">
          <Film className="h-8 w-8 text-red-600" />
          <span className="text-2xl font-bold text-white">MovieFlix</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-black">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={selectedItem === item.title.toLowerCase()}
                    className="text-gray-300 hover:text-white hover:bg-gray-800 data-[active=true]:bg-red-600 data-[active=true]:text-white"
                  >
                    <button
                      onClick={() => handleItemClick(item)}
                      className="flex items-center space-x-3 w-full"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Discover Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs uppercase tracking-wider px-3 py-2">
            Discover
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {discoverItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={selectedItem === item.title.toLowerCase()}
                    className="text-gray-300 hover:text-white hover:bg-gray-800 data-[active=true]:bg-red-600 data-[active=true]:text-white"
                  >
                    <button
                      onClick={() => handleItemClick(item)}
                      className="flex items-center space-x-3 w-full"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
