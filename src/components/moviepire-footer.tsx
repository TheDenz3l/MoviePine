"use client"

import { Film } from "lucide-react"

export function MoviepireFooter() {
  return (
    <footer className="bg-rgb(18,18,18) border-t border-gray-800 py-8 px-4 text-center mt-16">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-center">
          <Film className="w-8 h-8 text-white mr-2" />
          <span className="text-2xl font-bold text-white">Moviepire</span>
        </div>
        <p className="text-gray-400">Designed with love.</p>
        <p className="text-gray-400">
          This website <span className="text-white">"moviepire.net"</span> is the only official{" "}
          <span className="text-white">Moviepire.</span> Please be cautious of fake copies that may try to exploit your trust.
        </p>
        <p className="text-gray-500 text-sm">© Moviepire. We do not store any media.</p>
      </div>
    </footer>
  )
}
