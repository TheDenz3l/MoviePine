import React, { useState, useRef } from 'react';
import { MoviepireNavigation } from '../moviepire-navigation';
import { MovieCard } from '../movie-card';

interface SearchResult {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  year?: number;
  type: 'movie' | 'tv';
}

interface RealTimeSearchOverlayProps {
  initialQuery?: string;
  onClose: () => void;
  onResultClick: (id: string) => void;
}

const RealTimeSearchOverlay: React.FC<RealTimeSearchOverlayProps> = ({ initialQuery = '', onClose, onResultClick }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('search');
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate search API (replace with real API call)
  const handleSearch = async (q: string) => {
    setLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      setResults([]); // Empty for now
      setLoading(false);
    }, 500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    handleSearch(e.target.value);
  };

  // Navigation handler
  const handleNavigate = (category: string) => {
    setActiveCategory(category);
    // Optionally trigger category-based search
  };

  // Card actions
  const handlePlay = (id: string) => {
    // TODO: Implement play logic
  };
  const handleAddToList = (id: string) => {
    // TODO: Implement add to list logic
  };
  const handleMoreInfo = (id: string) => {
    // TODO: Implement more info logic
    onResultClick(id);
  };

  // Transform results for MovieCard
  const transformedResults = results.map((r) => ({
    id: r.id,
    title: r.title,
    poster: r.poster,
    year: r.year || 2025,
    rating: 0,
    genre: [r.type === 'movie' ? 'Movie' : 'TV Show'],
    description: '',
  }));

  return (
    <div className="fixed inset-0 z-[1200] bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Top Navigation Bar with Logo and Links */}
      <div className="flex items-center justify-between px-10 pt-6 pb-4">
        {/* Existing Logo */}
        <div className="flex items-center">
          <MoviepireNavigation 
            onNavigate={handleNavigate}
            activeCategory={activeCategory}
          />
        </div>
        {/* Navigation Links */}
        <nav className="flex items-center gap-8 text-lg font-medium text-white">
          <a href="#" className="flex items-center gap-2 hover:text-red-500"><span className="material-icons">home</span>Browse</a>
          <a href="#" className="flex items-center gap-2 hover:text-red-500"><span className="material-icons">movie</span>Movies</a>
          <a href="#" className="flex items-center gap-2 hover:text-red-500"><span className="material-icons">tv</span>Series</a>
          <a href="#" className="flex items-center gap-2 hover:text-red-500"><span className="material-icons">list</span>Watchlist</a>
        </nav>
        {/* Search Bar */}
        <div className="flex items-center bg-black border border-white px-3 py-2 rounded w-96">
          <span className="material-icons text-white mr-2">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search..."
            className="bg-black text-white text-lg w-full focus:outline-none"
            autoFocus
          />
        </div>
      </div>
      {/* Search Term Heading */}
      <div className="px-10 pt-2 pb-4">
        <h1 className="text-4xl font-bold text-white mb-2">{query.trim() || 'Search'}</h1>
      </div>
      {/* Results Poster Grid */}
      <div className="flex-1 px-10 pb-10 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-400 text-xl pt-20">Searching...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {transformedResults.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPlay={handlePlay}
                onAddToList={handleAddToList}
                onMoreInfo={handleMoreInfo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeSearchOverlay;
