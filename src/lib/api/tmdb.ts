// TMDB API Integration for movie metadata
// The Movie Database API: https://developers.themoviedb.org/3

export interface TMDBMovie {
  id: number
  imdb_id?: string
  title: string
  original_title: string
  overview: string
  poster_path?: string
  backdrop_path?: string
  release_date: string
  genre_ids: number[]
  genres?: TMDBGenre[]
  vote_average: number
  vote_count: number
  popularity: number
  adult: boolean
  video: boolean
  original_language: string
  runtime?: number
  budget?: number
  revenue?: number
  status?: string
  tagline?: string
  homepage?: string
  production_companies?: TMDBProductionCompany[]
  production_countries?: TMDBProductionCountry[]
  spoken_languages?: TMDBSpokenLanguage[]
}

export interface TMDBTVShow {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path?: string
  backdrop_path?: string
  first_air_date: string
  last_air_date?: string
  genre_ids: number[]
  genres?: TMDBGenre[]
  vote_average: number
  vote_count: number
  popularity: number
  adult: boolean
  original_language: string
  number_of_episodes?: number
  number_of_seasons?: number
  status?: string
  tagline?: string
  homepage?: string
  networks?: TMDBNetwork[]
  production_companies?: TMDBProductionCompany[]
  seasons?: TMDBSeason[]
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBProductionCompany {
  id: number
  name: string
  logo_path?: string
  origin_country: string
}

export interface TMDBProductionCountry {
  iso_3166_1: string
  name: string
}

export interface TMDBSpokenLanguage {
  iso_639_1: string
  name: string
}

export interface TMDBNetwork {
  id: number
  name: string
  logo_path?: string
  origin_country: string
}

export interface TMDBSeason {
  id: number
  name: string
  overview: string
  poster_path?: string
  season_number: number
  episode_count: number
  air_date?: string
}

export interface TMDBEpisode {
  id: number
  name: string
  overview: string
  episode_number: number
  season_number: number
  still_path?: string
  air_date?: string
  runtime?: number
}

export interface TMDBSearchResult {
  page: number
  total_pages: number
  total_results: number
  results: (TMDBMovie | TMDBTVShow)[]
}

export interface TMDBExternalIds {
  imdb_id?: string
  facebook_id?: string
  instagram_id?: string
  twitter_id?: string
}

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  profile_path?: string
  order: number
}

export interface TMDBCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path?: string
}

export interface TMDBCredits {
  cast: TMDBCastMember[]
  crew: TMDBCrewMember[]
}

export class TMDBAPI {
  private apiKey: string
  private baseUrl = 'https://api.themoviedb.org/3'
  private imageBaseUrl = 'https://image.tmdb.org/t/p'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }



  // Search methods
  async searchMovies(query: string, page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/search/movie', {
      query,
      page: page.toString(),
    })
  }

  async searchTVShows(query: string, page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/search/tv', {
      query,
      page: page.toString(),
    })
  }

  async searchMulti(query: string, page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/search/multi', {
      query,
      page: page.toString(),
    })
  }

  // Movie methods
  async getMovie(id: number): Promise<TMDBMovie> {
    return this.makeRequest<TMDBMovie>(`/movie/${id}`)
  }

  // Alias for getMovie to match streaming service expectations
  async getMovieDetails(id: number): Promise<TMDBMovie> {
    return this.getMovie(id)
  }

  async getMovieExternalIds(id: number): Promise<TMDBExternalIds> {
    return this.makeRequest<TMDBExternalIds>(`/movie/${id}/external_ids`)
  }

  async getMovieCredits(id: number): Promise<TMDBCredits> {
    return this.makeRequest<TMDBCredits>(`/movie/${id}/credits`)
  }

  async getMovieImages(id: number): Promise<{ backdrops: Array<{ file_path: string; width: number; height: number }>; posters: Array<{ file_path: string }> }> {
    return this.makeRequest<{ backdrops: Array<{ file_path: string; width: number; height: number }>; posters: Array<{ file_path: string }> }>(`/movie/${id}/images`)
  }

  async getSimilarMovies(id: number): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>(`/movie/${id}/similar`)
  }

  async getRecommendedMovies(id: number): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>(`/movie/${id}/recommendations`)
  }

  // TV analogs for similar / recommendations
  async getSimilarTVShows(id: number): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>(`/tv/${id}/similar`)
  }

  async getRecommendedTVShows(id: number): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>(`/tv/${id}/recommendations`)
  }

  async getPopularMovies(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/movie/popular', {
      page: page.toString(),
    })
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>(`/trending/movie/${timeWindow}`)
  }

  async getTopRatedMovies(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/movie/top_rated', {
      page: page.toString(),
    })
  }

  async getNowPlayingMovies(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/movie/now_playing', {
      page: page.toString(),
    })
  }

  async getUpcomingMovies(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/movie/upcoming', {
      page: page.toString(),
    })
  }

  async getMoviesByGenre(genreId: number, page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/discover/movie', {
      with_genres: genreId.toString(),
      page: page.toString(),
      sort_by: 'popularity.desc'
    })
  }

  // TV Show methods
  async getTVShow(id: number): Promise<TMDBTVShow> {
    return this.makeRequest<TMDBTVShow>(`/tv/${id}`)
  }

  async getTVShowExternalIds(id: number): Promise<TMDBExternalIds> {
    return this.makeRequest<TMDBExternalIds>(`/tv/${id}/external_ids`)
  }

  async getTVShowCredits(id: number): Promise<TMDBCredits> {
    return this.makeRequest<TMDBCredits>(`/tv/${id}/credits`)
  }

  async getTVShowImages(id: number): Promise<{ backdrops: Array<{ file_path: string; width: number; height: number }>; posters: Array<{ file_path: string }> }> {
    return this.makeRequest<{ backdrops: Array<{ file_path: string; width: number; height: number }>; posters: Array<{ file_path: string }> }>(`/tv/${id}/images`)
  }

  async getTVSeason(id: number, season: number): Promise<{ id: number; season_number: number; episodes: TMDBEpisode[] }> {
    return this.makeRequest<{ id: number; season_number: number; episodes: TMDBEpisode[] }>(`/tv/${id}/season/${season}`)
  }

  async getPopularTVShows(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/tv/popular', {
      page: page.toString(),
    })
  }

  async getTrendingTVShows(timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>(`/trending/tv/${timeWindow}`)
  }

  async getTopRatedTVShows(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/tv/top_rated', {
      page: page.toString(),
    })
  }

  async getOnTheAirTVShows(page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/tv/on_the_air', {
      page: page.toString(),
    })
  }

  async getTVByGenre(genreId: number, page = 1): Promise<TMDBSearchResult> {
    return this.makeRequest<TMDBSearchResult>('/discover/tv', {
      with_genres: genreId.toString(),
      page: page.toString(),
      sort_by: 'popularity.desc'
    })
  }

  // Aliases for consistency with explore page
  async getPopularTV(page = 1): Promise<TMDBSearchResult> {
    return this.getPopularTVShows(page)
  }

  async getTopRatedTV(page = 1): Promise<TMDBSearchResult> {
    return this.getTopRatedTVShows(page)
  }

  async getOnTheAirTV(page = 1): Promise<TMDBSearchResult> {
    return this.getOnTheAirTVShows(page)
  }

  // Genre methods
  async getMovieGenres(): Promise<{ genres: TMDBGenre[] }> {
    return this.makeRequest<{ genres: TMDBGenre[] }>('/genre/movie/list')
  }

  async getTVGenres(): Promise<{ genres: TMDBGenre[] }> {
    return this.makeRequest<{ genres: TMDBGenre[] }>('/genre/tv/list')
  }

  // Image URL helpers
  getImageUrl(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    return `${this.imageBaseUrl}/${size}${path}`
  }

  getPosterUrl(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    return this.getImageUrl(path, size)
  }

  getBackdropUrl(path: string, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string {
    return `${this.imageBaseUrl}/${size}${path}`
  }

  // Helper method to convert TMDB movie to our Movie interface
  convertToMovie(tmdbMovie: TMDBMovie, genres: TMDBGenre[] = []): any {
    const movieGenres = tmdbMovie.genres || genres.filter(g => tmdbMovie.genre_ids?.includes(g.id))

    return {
      id: tmdbMovie.imdb_id || `tmdb_${tmdbMovie.id}`,
      title: tmdbMovie.title,
      poster: tmdbMovie.poster_path ? this.getPosterUrl(tmdbMovie.poster_path) : undefined,
      backdrop: tmdbMovie.backdrop_path ? this.getBackdropUrl(tmdbMovie.backdrop_path, 'original') : undefined,
      year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : new Date().getFullYear(),
  rating: tmdbMovie.vote_average,
      genre: movieGenres.map(g => g.name),
      description: tmdbMovie.overview,
      runtime: tmdbMovie.runtime,
      imdbId: tmdbMovie.imdb_id,
      tmdbId: tmdbMovie.id,
    }
  }

  // Helper method to convert TMDB TV show to our Series interface
  convertToSeries(tmdbSeries: TMDBTVShow, genres: TMDBGenre[] = []): any {
    const seriesGenres = tmdbSeries.genres || genres.filter(g => tmdbSeries.genre_ids?.includes(g.id))

    return {
      id: `tmdb_tv_${tmdbSeries.id}`,
      title: tmdbSeries.name,
      poster: tmdbSeries.poster_path ? this.getPosterUrl(tmdbSeries.poster_path) : undefined,
      backdrop: tmdbSeries.backdrop_path ? this.getBackdropUrl(tmdbSeries.backdrop_path, 'original') : undefined,
      year: tmdbSeries.first_air_date ? new Date(tmdbSeries.first_air_date).getFullYear() : new Date().getFullYear(),
      rating: tmdbSeries.vote_average,
      genre: seriesGenres.map(g => g.name),
      description: tmdbSeries.overview,
      seasons: tmdbSeries.number_of_seasons,
      episodes: tmdbSeries.number_of_episodes,
      tmdbId: tmdbSeries.id,
    }
  }

  // Make the makeRequest method public for use in streaming service
  async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    // Determine if this is a Bearer token (JWT) or API key
    const isJWT = this.apiKey.includes('.')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (isJWT) {
      // Use Bearer token authentication
      headers['Authorization'] = `Bearer ${this.apiKey}`
    } else {
      // Use API key authentication
      url.searchParams.append('api_key', this.apiKey)
    }

    const response = await fetch(url.toString(), { headers })

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }
}

// Helper function to create TMDB API instance
export function createTMDBAPI(apiKey: string): TMDBAPI {
  return new TMDBAPI(apiKey)
}
