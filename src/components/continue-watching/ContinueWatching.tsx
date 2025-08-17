'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Clock, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface WatchProgressItem {
  id: string;
  content_id: string;
  content_type: 'movie' | 'tv';
  title: string;
  poster_path?: string;
  season_number?: number;
  episode_number?: number;
  episode_title?: string;
  current_time: number;
  duration: number;
  progress: number;
  completed: boolean;
  updated_at: string;
  last_stream_url?: string;
}

export function ContinueWatching() {
  const { user, session } = useAuth();
  const [items, setItems] = useState<WatchProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !session) {
      setLoading(false);
      return;
    }

    // Add a small delay to ensure auth is fully established
    const timeoutId = setTimeout(() => {
      fetchContinueWatching();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [user, session]);

  // Refetch data when user returns to the page/tab
  useEffect(() => {
    if (!user || !session) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refetch data
        fetchContinueWatching();
      }
    };

    const handleFocus = () => {
      // Window gained focus, refetch data
      fetchContinueWatching();
    };

    // Listen for storage events (in case auth state changes in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('auth') || e.key?.includes('session')) {
        fetchContinueWatching();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, session]);

  // Refresh on page navigation (using Performance API)
  useEffect(() => {
    if (!user || !session) return;

    // Check if this is a navigation back to the page
    if (performance.navigation?.type === 2) { // TYPE_BACK_FORWARD
      fetchContinueWatching();
    }
    
    // Also listen for popstate (browser back/forward)
    const handlePopState = () => {
      setTimeout(fetchContinueWatching, 100); // Small delay to ensure page is ready
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, session]);

  // Expose refresh function globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshContinueWatching = fetchContinueWatching;
    }
  }, []);

  const fetchContinueWatching = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get fresh session token directly from supabase
      let accessToken = session?.access_token;
      
      if (!accessToken && supabase) {
        try {
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          accessToken = freshSession?.access_token;
        } catch (e) {
          console.warn('Failed to get fresh session:', e);
        }
      }

      if (!accessToken) {
        console.warn('Continue Watching: No access token available');
        setLoading(false);
        return;
      }

      // Validate token format before making request
      if (accessToken.split('.').length !== 3) {
        console.warn('Continue Watching: Invalid JWT token format');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/continue-watching', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication required - fail silently in development
          console.warn('Continue Watching: Authentication required');
          return;
        }
        throw new Error('Failed to fetch continue watching');
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Continue watching fetch error:', err);
      // Don't show error to user for auth issues
      if (err instanceof Error && err.message.includes('401')) {
        console.warn('Continue Watching: Silently handling auth error');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load continue watching');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFromContinueWatching = async (progressId: string) => {
    try {
      await fetch('/api/progress', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ id: progressId }),
      });

      // Remove from local state
      setItems(items.filter(item => item.id !== progressId));
    } catch (err) {
      console.error('Failed to remove from continue watching:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getResumeUrl = (item: WatchProgressItem) => {
    if (item.content_type === 'movie') {
      return `/watch/${item.content_id}?t=${item.current_time}`;
    } else {
      return `/watch/${item.content_id}/season/${item.season_number}/episode/${item.episode_number}?t=${item.current_time}`;
    }
  };

  if (!user || !session) {
    return null; // Don't show anything if not authenticated
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Continue Watching</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-muted rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Continue Watching</h2>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchContinueWatching} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Don't show section at all when there are no items to continue watching
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Continue Watching</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="group relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFromContinueWatching(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="aspect-[2/3] relative">
              {item.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                  alt={item.title}
                  fill
                  className="object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center rounded-t-lg">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              )}

              {/* Progress overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <Progress value={item.progress * 100} className="h-1 mb-2" />
                <div className="flex items-center justify-between text-white text-xs">
                  <span>{formatTime(item.current_time)}</span>
                  <span>{formatTime(item.duration)}</span>
                </div>
              </div>

              {/* Play button overlay */}
              <Link href={getResumeUrl(item)} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <Button size="icon" className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90">
                  <Play className="h-6 w-6 ml-1" />
                </Button>
              </Link>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold truncate" title={item.title}>
                {item.title}
              </h3>
              
              {item.content_type === 'tv' && (
                <p className="text-sm text-muted-foreground truncate">
                  S{item.season_number}E{item.episode_number}
                  {item.episode_title && ` • ${item.episode_title}`}
                </p>
              )}

              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{Math.round(item.progress * 100)}% watched</span>
                <span>{new Date(item.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
