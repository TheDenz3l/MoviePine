export interface NetflixMovie {
  id: string
  title: string
  poster?: string
  backdrop?: string
  year?: number
  rating?: number
  genre?: string[]
}

export interface NetflixCarouselProps {
  title: string
  movies: NetflixMovie[]
  onPlay?: (movieId: string, title?: string) => void
  onAddToList?: (movie: NetflixMovie) => void
  onMoreInfo?: (movie: NetflixMovie) => void
  showMovieTitles?: boolean
  isInList?: (id: string) => boolean
}

export interface NetflixCardProps {
  movie: NetflixMovie
  onPlay?: (movieId: string, title?: string) => void
  onAddToList?: (movie: NetflixMovie) => void
  onMoreInfo?: (movie: NetflixMovie) => void
  showTitle?: boolean
  isInList?: (id: string) => boolean
}

export interface NetflixGridProps {
  carousels: Array<{
    title: string
    movies: NetflixMovie[]
  }>
  onPlay?: (movieId: string, title?: string) => void
  onAddToList?: (movie: NetflixMovie) => void
  onMoreInfo?: (movie: NetflixMovie) => void
}
