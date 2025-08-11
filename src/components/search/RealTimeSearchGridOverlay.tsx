"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Home, Film, Tv, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TMDBAPI } from '@/lib/api/tmdb';

interface SearchResult {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  year?: number;
  rating?: number;
  genre?: string[];
  type: 'movie' | 'tv';
}

interface RealTimeSearchGridOverlayProps {
  initialQuery?: string;
  activeCategory?: string;
  onClose: () => void;
  onPlay: (id: string, title: string) => void;
  onAddToList: (id: string) => void;
  onMoreInfo: (id: string) => void;
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '');

export function RealTimeSearchGridOverlay({
  initialQuery = '',
  activeCategory = 'home',
  onClose,
  onPlay,
  onAddToList,
  onMoreInfo
}: RealTimeSearchGridOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(!!initialQuery); // Show immediately if we have initial query
  const [scrollOpacity, setScrollOpacity] = useState(1); // Start with full opacity for overlay
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation items for consistent design
  const navItems = [
    { id: 'home', label: 'Browse', icon: Home },
    { id: 'explore-movies', label: 'Movies', icon: Film },
    { id: 'explore-series', label: 'Series', icon: Tv },
    { id: 'recently-played', label: 'My List', icon: Bookmark },
  ];

  // Immediately show search input and focus when overlay opens - FIX DOUBLE TYPING
  useEffect(() => {
    // Show search input immediately (or keep it shown if we have initial query)
    if (!showSearchInput) {
      setShowSearchInput(true);
    }
    
    // Multiple focus attempts with increasing delays to ensure it works
    const focusAttempts = [50, 100, 200, 300];
    const timers: NodeJS.Timeout[] = [];
    
    focusAttempts.forEach((delay) => {
      const timer = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
          // Ensure cursor is at the end if there's existing text
          const input = inputRef.current;
          input.setSelectionRange(input.value.length, input.value.length);
          
          // Also ensure the input value is synced with the query state
          if (query && input.value !== query) {
            input.value = query;
          }
        }
      }, delay);
      timers.push(timer);
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []); // Only run once when component mounts

  // Handle escape key and click outside to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking within the search container
      if (searchContainerRef.current && searchContainerRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on search results
      const searchContent = document.querySelector('[data-search-content]');
      if (searchContent && searchContent.contains(target)) {
        return;
      }
      
      // Close overlay on outside click
      onClose();
    };

    // Handle close event from main navigation
    const handleCloseEvent = () => {
      onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('app:closeRealTimeSearch', handleCloseEvent);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('app:closeRealTimeSearch', handleCloseEvent);
    };
  }, [onClose]);

  // Real-time search as user types - only when search input is visible
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (showSearchInput && query.trim().length > 0) {
      setIsLoading(true);
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const searchResults = await tmdbApi.searchMulti(query.trim(), 1);
          const transformedResults: SearchResult[] = searchResults.results
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
              rating: item.vote_average || 0,
              genre: [],
              type: item.media_type as 'movie' | 'tv'
            }))
            .filter((item: SearchResult) => item.title);

          setResults(transformedResults);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setResults([]);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, showSearchInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Close overlay when search is cleared
    if (!newValue.trim()) {
      onClose();
      return;
    }
    
    // Ensure the input shows the value immediately to prevent double typing
    if (inputRef.current && inputRef.current.value !== newValue) {
      inputRef.current.value = newValue;
    }
  };

  const handleSearchClick = () => {
    if (!showSearchInput) {
      setShowSearchInput(true);
      // Use requestAnimationFrame for better timing with DOM updates
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.click(); // Also trigger click to ensure cursor placement
          }
        }, 10);
      });
    }
  };

  const handleNavClick = (categoryId: string) => {
    onClose();
    // Could dispatch navigation event or use router here
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { category: categoryId } }));
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Navigation Bar - EXACT match to homepage navigation */}
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
        {/* Logo - Same as homepage */}
        <div className="flex items-center">
          <span className="text-2xl font-bold">
            <span className="text-white">Bmar</span>
            <span className="text-red-600"> Movies</span>
          </span>
        </div>

        {/* Navigation Menu - EXACT match to homepage style */}
        <div className="flex items-center space-x-8">
          {navItems.map((item) => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center text-sm font-bold transition-colors duration-200 hover:text-white ${
                  activeCategory === item.id ? 'text-red-600' : 'text-gray-300'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Search - EXACT match to homepage behavior */}
        <div className="flex items-center relative" ref={searchContainerRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearchClick}
            className="text-gray-300 hover:text-white hover:bg-white/10"
          >
            <Search className="w-5 h-5" />
          </Button>

          {showSearchInput && (
            <div className="absolute right-0 top-0 z-50 transform transition-all duration-300 ease-out animate-in slide-in-from-right-4">
              <form onSubmit={(e) => e.preventDefault()} className="flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  placeholder="Search for movies and TV shows..."
                  className="bg-[rgb(18,18,18)] text-white px-4 py-2 rounded-md w-80 min-w-0 focus:outline-none border border-gray-600/50 backdrop-blur-sm shadow-lg transition-all duration-200 placeholder:text-gray-400"
                  autoFocus
                />
              </form>
            </div>
          )}
        </div>
      </nav>

      {/* Results Section */}
      <div 
        className="flex-1 px-6 pb-10 overflow-y-auto" 
        style={{ paddingTop: '5rem' }}
        data-search-content
      >
        {/* Search Term Heading - Only show when search input is visible and has results */}
        {showSearchInput && query.trim() && results.length > 0 && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">{query.trim()}</h1>
          </div>
        )}

        {/* Empty State - Show when search input is not visible */}
        {!showSearchInput && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">Search Movies & TV Shows</h2>
            <p className="text-gray-500">Click the search icon above to get started</p>
          </div>
        )}

        {/* Search Input Visible but Empty */}
        {showSearchInput && !query.trim() && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">Search Movies & TV Shows</h2>
            <p className="text-gray-500">Start typing to find your favorite content</p>
          </div>
        )}

        {/* Loading State */}
        {showSearchInput && query.trim() && isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-gray-800/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {showSearchInput && !isLoading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="group relative aspect-[2/3] cursor-pointer rounded-md overflow-hidden bg-zinc-900/60 ring-1 ring-zinc-800 shadow-sm transform-gpu transition-transform duration-300 hover:scale-[1.045] hover:-translate-y-2"
                onClick={() => onMoreInfo(result.id)}
              >
                {result.poster ? (
                  <img
                    src={result.poster}
                    alt={result.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-zinc-700 flex items-center justify-center p-2">
                    <span className="text-gray-300 text-xs text-center">{result.title}</span>
                  </div>
                )}
                
                {/* Hover Actions - Bottom positioned */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(result.id, result.title);
                      }} 
                      className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                      title="Play"
                    >
                      ▶
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToList(result.id);
                      }} 
                      className="h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                      title="Add to List"
                    >
                      +
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoreInfo(result.id);
                      }} 
                      className="h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                      title="More Info"
                    >
                      i
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {showSearchInput && !isLoading && query.trim() && results.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">No results found</h2>
            <p className="text-gray-500">Try searching with different keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}