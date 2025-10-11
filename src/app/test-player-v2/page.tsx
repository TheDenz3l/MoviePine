"use client"

/**
 * VideoPlayerV2 Test Page
 * 
 * Test the new video player with different stream types
 */

import { useState } from 'react'
import VideoPlayerV2 from '@/components/video-player-v2'
import { Button } from '@/components/ui/button'

interface TestStream {
  name: string
  url: string
  type: 'HLS' | 'MP4'
  subtitles?: Array<{
    id: string
    label: string
    language: string
    src: string
    kind: 'subtitles' | 'captions'
  }>
}

const TEST_STREAMS: TestStream[] = [
  {
    name: 'Apple HLS Test Stream',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    type: 'HLS'
  },
  {
    name: 'Big Buck Bunny (MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'MP4'
  },
  {
    name: 'Sintel (MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'MP4'
  },
  {
    name: 'Elephants Dream (MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'MP4'
  }
]

export default function VideoPlayerV2TestPage() {
  const [selectedStream, setSelectedStream] = useState<TestStream | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)

  const handleSelectStream = (stream: TestStream) => {
    setSelectedStream(stream)
    setShowPlayer(true)
  }

  const handleClose = () => {
    setShowPlayer(false)
    setSelectedStream(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">VideoPlayerV2 Test Page</h1>
          <p className="text-gray-400">
            Test the new video player built from the ground up with audio priority for Chrome and Safari
          </p>
        </div>

        {/* Browser Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Browser Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">User Agent:</span>
              <p className="mt-1 font-mono text-xs break-all">{typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-400">HLS.js Support:</span>
              <p className="mt-1">
                {typeof window !== 'undefined' && typeof (window as any).Hls !== 'undefined' && (window as any).Hls.isSupported() ? '✅ Yes' : '❌ No (will use native)'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Streams */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Streams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEST_STREAMS.map((stream) => (
              <div
                key={stream.url}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
              >
                <h3 className="font-semibold mb-2">{stream.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    stream.type === 'HLS' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {stream.type}
                  </span>
                  {stream.subtitles && (
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500">
                      Subtitles
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => handleSelectStream(stream)}
                  className="w-full"
                  variant="outline"
                >
                  Test This Stream
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom URL */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Custom URL</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter HLS (.m3u8) or MP4 URL..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const url = (e.target as HTMLInputElement).value
                  if (url) {
                    const type = url.includes('.m3u8') ? 'HLS' : 'MP4'
                    handleSelectStream({
                      name: 'Custom Stream',
                      url,
                      type
                    })
                  }
                }
              }}
            />
            <Button
              onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement
                const url = input?.value
                if (url) {
                  const type = url.includes('.m3u8') ? 'HLS' : 'MP4'
                  handleSelectStream({
                    name: 'Custom Stream',
                    url,
                    type
                  })
                }
              }}
              variant="default"
            >
              Load
            </Button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Press Enter or click Load to test your custom stream URL
          </p>
        </div>

        {/* Testing Checklist */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-blue-400">Audio</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Audio plays immediately</li>
                <li>✓ No audio delay on start</li>
                <li>✓ Volume controls work</li>
                <li>✓ Mute/unmute functions</li>
                <li>✓ Check console for 🎵 logs</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-green-400">Playback</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Stream loads quickly</li>
                <li>✓ Timeline scrubbing works</li>
                <li>✓ Buffered indicator shows</li>
                <li>✓ Play/pause smooth</li>
                <li>✓ Check console for 📺 logs</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-purple-400">UI</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Controls auto-hide</li>
                <li>✓ Fullscreen works</li>
                <li>✓ Time displays correctly</li>
                <li>✓ Loading spinner shows</li>
                <li>✓ Error handling works</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-yellow-400">Keyboard</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Space/K: Play/Pause</li>
                <li>✓ ←/→: Seek 10s</li>
                <li>✓ ↑/↓: Volume</li>
                <li>✓ M: Mute</li>
                <li>✓ F: Fullscreen</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Console Tips */}
        <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
          <h3 className="font-semibold mb-2">💡 Console Tips</h3>
          <p className="text-sm text-gray-300">
            Open your browser's developer console (F12) to see detailed logs:
          </p>
          <ul className="mt-2 text-sm text-gray-300 space-y-1">
            <li>🎵 = AudioController logs</li>
            <li>📺 = StreamController logs</li>
            <li>📝 = SubtitleController logs</li>
            <li>🔊 = Volume changes</li>
          </ul>
        </div>
      </div>

      {/* Video Player Modal */}
      {showPlayer && selectedStream && (
        <VideoPlayerV2
          src={selectedStream.url}
          title={selectedStream.name}
          onClose={handleClose}
          autoPlay={true}
          subtitles={selectedStream.subtitles}
          onTimeUpdate={(time) => {
            // Optional: log time updates
            // console.log('Time:', time)
          }}
          onEnded={() => {
            console.log('Video ended')
          }}
        />
      )}
    </div>
  )
}
