"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Plus } from 'lucide-react';
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
  onClose: () => void;
  onPlay: (id: string, title: string) => void;
  onAddToList: (id: string) => void;
  onMoreInfo: (id: string) => void;
}

// Initialize TMDB API
const tmdbApi = new TMDBAPI(process.env.NEXT_PUBLIC_TMDB_API_KEY || '');

export function RealTimeSearchGridOverlay({
  initialQuery = '',
  onClose,
  onPlay,
  onAddToList,
  onMoreInfo
}: RealTimeSearchGridOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus the input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle click outside to close overlay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key to close overlay
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Real-time search as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length > 0) {
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
              genre: [], // We would need to fetch genres separately if needed
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
      }, 300); // Debounce for 300ms
    } else {
      setResults([]);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClearQuery = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleCardClick = (movie: SearchResult) => {
    onMoreInfo(movie.id);
  };

  const handleCardPlay = (e: React.MouseEvent, movie: SearchResult) => {
    e.stopPropagation();
    onPlay(movie.id, movie.title);
  };

  const handleCardAddToList = (e: React.MouseEvent, movie: SearchResult) => {
    e.stopPropagation();
    onAddToList(movie.id);
  };

  const handleCardMoreInfo = (e: React.MouseEvent, movie: SearchResult) => {
    e.stopPropagation();
    onMoreInfo(movie.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, movie: SearchResult) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(movie);
    }
  };

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-xl flex flex-col"
      data-search-overlay="true"
    >
      {/* Search Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center flex-1 max-w-2xl">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search for movies and TV shows..."
            className="bg-transparent text-white text-lg w-full focus:outline-none placeholder-gray-500"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearQuery}
              className="text-gray-400 hover:text-white ml-2"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          Cancel
        </Button>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-lg">Searching...</div>
          </div>
        ) : results.length > 0 ? (
          <>
            <h2 className="text-xl font-semibold text-white mb-4">
              Results for "{query}"
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="group relative aspect-[2/3] cursor-pointer outline-none rounded-md overflow-hidden bg-zinc-900/60 ring-1 ring-zinc-800 shadow-sm focus-visible:ring-2 focus-visible:ring-white/40 transform-gpu transition-transform duration-300 will-change-transform hover:scale-[1.045] hover:-translate-y-2"
                  tabIndex={0}
                  aria-label={`Open details for ${result.title}`}
                  onClick={() => handleCardClick(result)}
                  onKeyDown={(e) => handleKeyDown(e, result)}
                >
                  {result.poster ? (
                    <img
                      src={result.poster}
                      alt={result.title}
                      className="absolute inset-0 w-full h-full object-cover select-none will-change-transform"
                      draggable={false}
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-zinc-700 flex items-center justify-center p-2">
                      <span className="text-gray-300 text-[11px] text-center leading-tight line-clamp-3">{result.title}</span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-2">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true">
                      <button 
                        type="button" 
                        onClick={(e) => handleCardPlay(e, result)} 
                        className="pointer-events-auto h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => handleCardAddToList(e, result)} 
                        className="pointer-events-auto h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => handleCardMoreInfo(e, result)} 
                        className="pointer-events-auto h-10 w-10 rounded-full bg-zinc-800/70 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        i
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : query ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-400 mb-2">No results found</h3>
            <p className="text-gray-500 max-w-md">
              We couldn't find any matches for "{query}". Please try a different search term.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-400 mb-2">Search Movies and TV Shows</h3>
            <p className="text-gray-500 max-w-md">
              Start typing to search for movies and TV shows across our entire collection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}