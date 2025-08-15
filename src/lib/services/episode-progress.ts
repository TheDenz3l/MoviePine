import { supabase } from '../supabaseClient'

interface EpisodeProgressRow {
  user_id: string
  series_id: string
  season: number
  episode: number
  seconds: number
  duration: number
  updated_at?: string
}

/**
 * Resolve current authenticated user id.
 * Returns null if not signed in (we skip persistence in that case).
 */
async function resolveUserId(): Promise<string | null> {
  try {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return data.user?.id || null
  } catch {
    return null
  }
}

// Throttle state kept in-memory per tab
const lastSaves: Record<string, { at: number; seconds: number; duration: number }> = {}
const MIN_INTERVAL_MS = 12_000

export async function saveEpisodeProgress(params: { seriesId: string; season: number; episode: number; seconds: number; duration: number }) {
  if (!supabase) return
  try {
    const userId = await resolveUserId()
    if (!userId) return // not signed in; skip persistence
    const { seriesId, season, episode, seconds, duration } = params
    const key = `${userId}|${seriesId}|${season}|${episode}`
    const now = Date.now()
    const entry = lastSaves[key]
    const fraction = duration > 0 ? seconds / duration : 0
    const shouldSend = !entry || (now - entry.at) > MIN_INTERVAL_MS || seconds < 5 || fraction >= 0.97
    lastSaves[key] = { at: shouldSend ? now : (entry?.at || now), seconds, duration }
    if (!shouldSend) return
    await supabase.from('episode_progress').upsert({
      user_id: userId,
      series_id: seriesId,
      season,
      episode,
      seconds: Math.floor(seconds),
      duration: Math.floor(duration)
    }, { onConflict: 'user_id,series_id,season,episode' })
  } catch (e) {
    console.warn('Supabase saveEpisodeProgress failed', e)
  }
}

export async function fetchSeriesProgress(seriesId: string): Promise<Record<string, { fraction: number; seconds: number }>> {
  if (!supabase) return {}
  try {
    const userId = await resolveUserId()
    if (!userId) return {}
    const { data, error } = await supabase
      .from('episode_progress')
      .select('season,episode,seconds,duration')
      .eq('series_id', seriesId)
      .eq('user_id', userId)
    if (error || !data) return {}
    const out: Record<string, { fraction: number; seconds: number }> = {}
    for (const row of data) {
      const key = `S${row.season}E${row.episode}`
      out[key] = { fraction: row.duration ? row.seconds / row.duration : 0, seconds: row.seconds }
    }
    return out
  } catch (e) {
    console.warn('Supabase fetchSeriesProgress failed', e)
    return {}
  }
}
