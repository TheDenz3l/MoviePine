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
        className="w-[60vw] max-w-none h-[95vh] bg-black text-white border-0 p-0 overflow-hidden rounded-lg fixed top-[5vh] left-1/2 transform -translate-x-1/2 translate-y-0 z-50 shadow-2xl"
        showCloseButton={false}
        style={{ width: '60vw', maxWidth: 'none' }}
      >
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>
        <DialogDescription className="sr-only">Movie details for {movie.title}</DialogDescription>

        {/* Netflix-style Floating Modal */}
        <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'rgb(18, 18, 18)' }}>
          {/* Hero Section - Netflix-style backdrop with integrated gradient */}
          <div className="relative h-[60vh] w-full overflow-visible flex-shrink-0">
            {/* Backdrop Image */}
            <div
              className="absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: `url(${movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1489599735734-79b4169c2a78?w=1920&h=1080&fit=crop'})`,
                backgroundSize: '120%',
                backgroundPosition: 'center 20%',
              }}
            />

            {/* Subtle side gradient for depth */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background: `linear-gradient(
                  to right,
                  rgba(0, 0, 0, 0.3) 0%,
                  transparent 30%,
                  transparent 70%,
                  rgba(0, 0, 0, 0.1) 100%
                )`
              }}
            />

            {/* Netflix-style Bottom Gradient - Creates seamless transition */}
            <div
              className="absolute inset-x-0 bottom-0 h-[200px] pointer-events-none z-20"
              style={{
                background: `linear-gradient(
                  to bottom,
                  transparent 0%,
                  rgba(18, 18, 18, 0.1) 20%,
                  rgba(18, 18, 18, 0.3) 40%,
                  rgba(18, 18, 18, 0.6) 60%,
                  rgba(18, 18, 18, 0.8) 80%,
                  rgb(18, 18, 18) 100%
                )`
              }}
            />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full w-10 h-10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Title and Actions Overlay - Netflix style */}
            <div className="absolute bottom-4 left-4 right-4 z-30">
              <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white leading-tight max-w-xl">
                {movie.title}
              </h1>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onPlay(movie.id)}
                  className="bg-white text-black hover:bg-gray-200 font-semibold px-4 py-1.5 rounded text-sm flex items-center space-x-1.5"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Play</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-2 border-gray-400 text-white hover:bg-white hover:text-black rounded-full w-8 h-8"
                  onClick={() => onAddToList(movie.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`border-2 border-gray-400 rounded-full w-8 h-8 ${
                    isLiked === true ? 'bg-white text-black' : 'text-white hover:bg-white hover:text-black'
                  }`}
                  onClick={() => setIsLiked(isLiked === true ? null : true)}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Section - No background, relies on gradient transition */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="px-6 py-4">

              {/* Match percentage and metadata - Netflix style */}
              <div className="flex items-center space-x-3 text-sm mb-4">
                <span className="text-green-400 font-semibold">{matchPercentage}% Match</span>
                <span className="text-white">{movie.year}</span>
                <span className="text-gray-300">
                  {movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '2h 8m'}
                </span>
                <div className="border border-gray-400 px-1.5 py-0.5 text-gray-300 text-xs">HD</div>
                <div className="border border-gray-400 px-1.5 py-0.5 text-gray-300 text-xs">13+</div>
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

              {/* Similar Section - Netflix horizontal scroll style */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-white">Similar</h3>
                <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-2">
                  {[
                    { title: "Good Will Hunting", year: "1997", duration: "2h 6m", description: "A janitor at MIT has a gift for mathematics but needs help from a psychologist to find direction in his life." },
                    { title: "The Pursuit of Happyness", year: "2006", duration: "1h 57m", description: "A struggling salesman takes custody of his son as he's poised to begin a life-changing professional career." },
                    { title: "A Beautiful Mind", year: "2001", duration: "2h 15m", description: "After John Nash, a brilliant but asocial mathematician, accepts secret work in cryptography, his life takes a turn for the nightmarish." },
                    { title: "Dead Poets Society", year: "1989", duration: "2h 8m", description: "English teacher John Keating inspires his students to look at poetry with a different perspective of authentic knowledge and feelings." },
                    { title: "The Social Network", year: "2010", duration: "2h", description: "The story of how one of the most popular websites in the world was founded and the lawsuits that followed." },
                    { title: "Forrest Gump", year: "1994", duration: "2h 22m", description: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man." }
                  ].map((item, i) => (
                    <div key={i} className="flex-shrink-0 w-80 bg-zinc-800 rounded-lg overflow-hidden group cursor-pointer hover:bg-zinc-700 transition-colors">
                      <div className="flex">
                        <div className="w-28 h-20 bg-zinc-700 flex items-center justify-center flex-shrink-0">
                          <Play className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-3 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white font-medium text-sm">{item.title}</h4>
                            <span className="text-gray-400 text-xs">{item.duration}</span>
                          </div>
                          <p className="text-gray-400 text-xs mb-2">{item.year}</p>
                          <p className="text-gray-300 text-xs line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
