// Client-side progress sync helper (hybrid local + server)
// Now uses bearer token & RLS-secured /api/progress endpoint. Respects privacy settings toggle.
import { supabase } from '@/lib/supabaseClient'
import { getPrivacyTrackFlag } from '@/lib/settingsCache'

interface PendingUpdate {
  contentId: string
  currentTime: number
  duration: number
  streamUrl?: string
  subtitles?: string[]
  ts: number
}

const QUEUE: PendingUpdate[] = []
let flushTimer: any = null
const FLUSH_INTERVAL = 5000 // 5s

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL)
}

async function flush() {
  if (QUEUE.length === 0) return
  const batch = [...QUEUE]
  QUEUE.length = 0
  const token = (await supabase?.auth.getSession().catch(()=>null))?.data.session?.access_token
  // Skip entirely if tracking disabled
  if (!getPrivacyTrackFlag()) return
  for (const upd of batch) {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          contentId: upd.contentId,
          currentTime: upd.currentTime,
            duration: upd.duration,
          streamUrl: upd.streamUrl,
          subtitles: upd.subtitles
        })
      })
    } catch (e) {
      // Requeue once (simple retry strategy)
      if (!batch.some(b => b === upd)) {
        QUEUE.push(upd)
      }
    }
  }
}

export function queueProgressUpdate(update: Omit<PendingUpdate, 'ts'>) {
  QUEUE.push({ ...update, ts: Date.now() })
  scheduleFlush()
}

export function immediateProgressUpdate(update: Omit<PendingUpdate, 'ts'>) {
  queueProgressUpdate(update)
  flush()
}
