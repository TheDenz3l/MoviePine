"use client"

import { useState, useEffect } from "react"
import { X, Play, Plus, ThumbsUp } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Movie {
  id: string
  title: string
  poster: string
  backdrop?: string
  year: number
  rating: number
  genre: string[]
  description: string
  runtime?: number
}

interface MovieDetailModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  onPlay: (movieId: string) => void
  onAddToList: (movieId: string) => void
}

export function MovieDetailModal({ movie, isOpen, onClose, onPlay, onAddToList }: MovieDetailModalProps) {
  const [isLiked, setIsLiked] = useState<boolean | null>(null)

  // Remove body overflow hidden to allow background scrolling
  // Netflix modal allows background to remain visible and scrollable

  if (!movie) return null

  const matchPercentage = Math.floor(movie.rating * 10) + Math.floor(Math.random() * 20)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[85vw] max-w-[1000px] h-[85vh] bg-black text-white border-0 p-0 overflow-hidden rounded-lg fixed top-[8vh] left-1/2 transform -translate-x-1/2 translate-y-0 z-50 shadow-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>
        <DialogDescription className="sr-only">Movie details for {movie.title}</DialogDescription>

        {/* Netflix-style Floating Modal */}
        <div className="relative w-full h-full flex flex-col overflow-hidden">

          {/* Hero Section - Compact backdrop with title overlay */}
          <div className="relative h-[45vh] w-full overflow-hidden flex-shrink-0">
            {/* Backdrop Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
              }}
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full w-10 h-10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Title and Actions Overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white leading-tight max-w-2xl">
                {movie.title}
              </h1>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => onPlay(movie.id)}
                  className="bg-white text-black hover:bg-gray-200 font-semibold px-6 py-2 rounded flex items-center space-x-2"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Play</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-2 border-gray-400 text-white hover:bg-white hover:text-black rounded-full w-10 h-10"
                  onClick={() => onAddToList(movie.id)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`border-2 border-gray-400 rounded-full w-10 h-10 ${
                    isLiked === true ? 'bg-white text-black' : 'text-white hover:bg-white hover:text-black'
                  }`}
                  onClick={() => setIsLiked(isLiked === true ? null : true)}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Section - Scrollable */}
          <div className="bg-zinc-900 flex-1 overflow-y-auto">
            <div className="px-8 py-6">

              {/* Match percentage and metadata */}
              <div className="flex items-center space-x-4 text-sm mb-6">
                <span className="text-green-400 font-semibold">{matchPercentage}% Match</span>
                <span className="text-white">{movie.year}</span>
                <span className="text-gray-300">
                  {movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '2h 8m'}
                </span>
                <div className="border border-gray-400 px-2 py-0.5 text-gray-300 text-xs">HD</div>
                <div className="border border-gray-400 px-2 py-0.5 text-gray-300 text-xs">13+</div>
              </div>

              {/* Description */}
              <p className="text-white text-sm leading-relaxed mb-8 max-w-4xl">
                {movie.description || "At a stuffy New England prep school, an unconventional teacher inspires students to view their studies and lives from a more meaningful perspective."}
              </p>

              {/* Cast and Crew Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mb-8">
                <div>
                  <span className="text-gray-400">Cast: </span>
                  <span className="text-white">Robin Williams, Robert Sean Leonard, Ethan Hawke, <span className="text-gray-400">more</span></span>
                </div>
                <div>
                  <span className="text-gray-400">Genres: </span>
                  <span className="text-white">Classic Movies, Drama</span>
                </div>
                <div>
                  <span className="text-gray-400">This movie is: </span>
                  <span className="text-white">Nostalgic, Understated, Inspiring</span>
                </div>
              </div>

              {/* More Like This Section */}
              <div>
                <h3 className="text-xl font-bold mb-6 text-white">More Like This</h3>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { title: "Good Will Hunting", year: "1997", duration: "2h 6m" },
                    { title: "The Pursuit of Happyness", year: "2006", duration: "1h 57m" },
                    { title: "A Beautiful Mind", year: "2001", duration: "2h 15m" }
                  ].map((item, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="relative aspect-video bg-gray-800 rounded-md overflow-hidden mb-2 group-hover:scale-105 transition-transform duration-200">
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-white text-xs">
                          {item.duration}
                        </div>
                      </div>
                      <h4 className="text-white font-medium text-xs mb-1">{item.title}</h4>
                      <p className="text-gray-400 text-xs">{item.year}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trailers & More Section */}
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4">Trailers & More</h3>
                <div className="bg-zinc-800 rounded-lg p-4 flex items-center space-x-4">
                  <div className="w-32 h-20 bg-zinc-700 rounded flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">Trailer: {movie.title}</h4>
                    <p className="text-gray-400 text-sm">Official Trailer</p>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-6">About <strong>{movie.title}</strong></h3>
                <div className="space-y-4 text-sm">
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Director:</span>
                    <span>Christopher Nolan</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Cast:</span>
                    <span>{movie.cast || 'Leonardo DiCaprio, Marion Cotillard, Tom Hardy, Ellen Page'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Writer:</span>
                    <span>Christopher Nolan</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Genres:</span>
                    <span>{movie.genres || 'Action, Sci-Fi, Thriller'}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">This movie is:</span>
                    <span>Mind-bending, Suspenseful, Cerebral</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Maturity Rating:</span>
                    <div>
                      <span className="bg-gray-600 px-2 py-1 rounded text-xs mr-2">PG-13</span>
                      <span className="text-gray-400">violence, language</span>
                      <p className="text-gray-500 text-xs mt-1">Recommended for ages 13 and up</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Content Sections to demonstrate scrolling */}
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4">Episodes</h3>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((episode) => (
                    <div key={episode} className="bg-zinc-800 rounded-lg p-4 flex items-center space-x-4">
                      <div className="w-32 h-20 bg-zinc-700 rounded flex items-center justify-center">
                        <span className="text-white font-bold">{episode}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Episode {episode}</h4>
                        <p className="text-gray-400 text-sm">45m</p>
                        <p className="text-gray-300 text-sm mt-1">Episode description goes here...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* More Like This - Extended */}
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4">More Like This</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="bg-zinc-800 rounded-lg overflow-hidden">
                      <div className="aspect-video bg-zinc-700 flex items-center justify-center">
                        <span className="text-white">Movie {i + 1}</span>
                      </div>
                      <div className="p-3">
                        <h4 className="text-white font-medium text-sm mb-1">Similar Movie {i + 1}</h4>
                        <p className="text-gray-400 text-xs">2023</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4">Reviews</h3>
                <div className="space-y-6">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="bg-zinc-800 rounded-lg p-6">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-zinc-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">U{review}</span>
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium">User {review}</h4>
                          <div className="flex text-yellow-400">
                            {'★'.repeat(5)}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300">
                        This is a sample review for the movie. It provides detailed feedback about the plot,
                        acting, cinematography, and overall experience. The review helps other users decide
                        whether they want to watch this movie.
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add substantial bottom padding for Netflix-style scrolling */}
              <div className="h-32"></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
