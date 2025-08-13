// TV Garden Stream Extractor Service
// Fetches actual video stream URLs from TV Garden's GitHub repository
// Instead of linking to TV Garden pages, this extracts direct M3U8 and YouTube URLs

export interface TVGardenChannel {
  nanoid: string;
  name: string;
  iptv_urls: string[];
  youtube_urls: string[];
  language: string;
  country: string;
  isGeoBlocked: boolean;
}

export interface TVGardenStreamData {
  nanoid: string;
  name: string;
  streamUrls: string[];
  category: string;
  language: string;
  country: string;
  isGeoBlocked: boolean;
  type: 'iptv' | 'youtube' | 'mixed';
  preferredUrl: string | null;
}

export class TVGardenStreamService {
  private static readonly GITHUB_BASE_URL = 'https://raw.githubusercontent.com/TVGarden/tv-garden-channel-list/main/channels/raw/categories';
  
  // Available categories from TV Garden
  private static readonly CATEGORIES = [
    'news', 'sports', 'entertainment', 'movies', 'documentary', 
    'kids', 'music', 'general', 'business', 'cooking', 'auto',
    'animation', 'classic', 'comedy', 'culture', 'education',
    'family', 'lifestyle', 'outdoor', 'relax', 'religious',
    'science', 'series', 'shop', 'travel', 'weather'
  ];

  // Cache for reducing API calls
  private static cache: Map<string, TVGardenChannel[]> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async fetchChannelsByCategory(category: string): Promise<TVGardenChannel[]> {
    const cacheKey = category.toLowerCase();
    const now = Date.now();
    
    // Check cache first
    if (this.cache.has(cacheKey) && this.cacheExpiry.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey)!;
      if (now < expiry) {
        return this.cache.get(cacheKey)!;
      }
    }

    try {
      const response = await fetch(`${this.GITHUB_BASE_URL}/${category.toLowerCase()}.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${category} channels: ${response.statusText}`);
      }
      const channels: TVGardenChannel[] = await response.json();
      
      // Cache the results
      this.cache.set(cacheKey, channels);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
      
      return channels;
    } catch (error) {
      console.error(`Error fetching TV Garden ${category} channels:`, error);
      
      // Return cached data if available, even if expired
      if (this.cache.has(cacheKey)) {
        console.log(`Using cached data for ${category} due to fetch error`);
        return this.cache.get(cacheKey)!;
      }
      
      return [];
    }
  }

  static async fetchUSChannelsByCategory(category: string): Promise<TVGardenChannel[]> {
    const allChannels = await this.fetchChannelsByCategory(category);
    return allChannels.filter(channel => channel.country === 'us');
  }

  static async getAllUSChannels(): Promise<TVGardenChannel[]> {
    const allChannels: TVGardenChannel[] = [];
    
    // Fetch channels from multiple categories in parallel
    const categoryPromises = this.CATEGORIES.map(async (category) => {
      try {
        const channels = await this.fetchUSChannelsByCategory(category);
        return channels.map(channel => ({ ...channel, category }));
      } catch (error) {
        console.error(`Error fetching ${category} channels:`, error);
        return [];
      }
    });

    const categoryResults = await Promise.all(categoryPromises);
    
    for (const channels of categoryResults) {
      allChannels.push(...channels);
    }

    return allChannels;
  }

  static convertToStreamData(channel: TVGardenChannel, category: string): TVGardenStreamData {
    const streamUrls = [...channel.iptv_urls, ...channel.youtube_urls];
    
    let type: 'iptv' | 'youtube' | 'mixed' = 'iptv';
    if (channel.iptv_urls.length > 0 && channel.youtube_urls.length > 0) {
      type = 'mixed';
    } else if (channel.youtube_urls.length > 0) {
      type = 'youtube';
    }

    const preferredUrl = this.getBestStreamUrl(streamUrls);

    return {
      nanoid: channel.nanoid,
      name: channel.name,
      streamUrls,
      category,
      language: channel.language,
      country: channel.country,
      isGeoBlocked: channel.isGeoBlocked,
      type,
      preferredUrl
    };
  }

  static async getStreamDataByCategory(category: string): Promise<TVGardenStreamData[]> {
    const channels = await this.fetchUSChannelsByCategory(category);
    return channels
      .filter(channel => channel.iptv_urls.length > 0 || channel.youtube_urls.length > 0)
      .map(channel => this.convertToStreamData(channel, category));
  }

  static async getAllUSStreamData(): Promise<TVGardenStreamData[]> {
    const channels = await this.getAllUSChannels();
    return channels
      .filter(channel => channel.iptv_urls.length > 0 || channel.youtube_urls.length > 0)
      .map(channel => this.convertToStreamData(channel, (channel as any).category || 'general'));
  }

  static getCategories(): string[] {
    return [...this.CATEGORIES];
  }

  // Helper method to get the best stream URL (prefer IPTV over YouTube)
  static getBestStreamUrl(streamUrls: string[]): string | null {
    if (streamUrls.length === 0) return null;
    
    // Try to find an IPTV stream first (M3U8)
    const iptvStream = streamUrls.find(url => 
      url.includes('.m3u8') || 
      url.includes('iptv') ||
      url.includes('playlist') ||
      url.includes('live')
    );
    
    if (iptvStream) return iptvStream;
    
    // Fall back to first available stream
    return streamUrls[0];
  }

  // Helper method to categorize channels by their actual content
  static categorizeChannels(channels: TVGardenStreamData[]): Record<string, TVGardenStreamData[]> {
    const categorized: Record<string, TVGardenStreamData[]> = {};
    
    for (const channel of channels) {
      const category = channel.category;
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(channel);
    }
    
    return categorized;
  }

  // Helper method to get working streams only
  static filterWorkingStreams(channels: TVGardenStreamData[]): TVGardenStreamData[] {
    return channels.filter(channel => 
      channel.streamUrls.length > 0 && 
      channel.preferredUrl !== null
    );
  }

  // Clear cache (useful for development/testing)
  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Search for channels by name
  static searchChannels(channels: TVGardenStreamData[], query: string): TVGardenStreamData[] {
    const lowerQuery = query.toLowerCase();
    return channels.filter(channel => 
      channel.name.toLowerCase().includes(lowerQuery)
    );
  }

  // Get channel by nanoid
  static async getChannelByNanoid(nanoid: string): Promise<TVGardenStreamData | null> {
    const allChannels = await this.getAllUSStreamData();
    return allChannels.find(channel => channel.nanoid === nanoid) || null;
  }
}
