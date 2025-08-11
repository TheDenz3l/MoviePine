// Centralized player error formatting, logging, de-duplication & event dispatch

export interface PlayerErrorObject {
  code: string
  message: string
  context: Record<string, any>
  ts: number
}

// Rolling window of recent error signatures to avoid console spam
const RECENT: { sig: string; ts: number }[] = []
const WINDOW_MS = 15_000 // 15s de-dupe window
const MAX_RECENT = 50

function signature(code: string, message: string, context: Record<string, any>) {
  const stable: Record<string, any> = {}
  for (const k of Object.keys(context || {})) {
    if (/time|ts|timestamp|date/i.test(k)) continue
    stable[k] = context[k]
  }
  return code + '|' + message + '|' + JSON.stringify(stable)
}

function shouldLog(sig: string) {
  const now = Date.now()
  for (let i = RECENT.length - 1; i >= 0; i--) {
    if (now - RECENT[i].ts > WINDOW_MS) RECENT.splice(i, 1)
  }
  if (RECENT.find(r => r.sig === sig)) return false
  RECENT.push({ sig, ts: now })
  if (RECENT.length > MAX_RECENT) RECENT.splice(0, RECENT.length - MAX_RECENT)
  return true
}

export function formatPlayerError(code: string, message: string, context: Record<string, any> = {}): PlayerErrorObject {
  return { code, message, context, ts: Date.now() }
}

export function logPlayerError(err: PlayerErrorObject) {
  const sig = signature(err.code, err.message, err.context)
  if (!shouldLog(sig)) return
  const iso = new Date(err.ts).toISOString()
  console.error(`[PlayerError] ${err.code} @ ${iso}: ${err.message}`, err.context)
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('player-error', { detail: err }))
    }
  } catch {}
}

export function emitPlayerError(code: string, message: string, context: Record<string, any> = {}) {
  const obj = formatPlayerError(code, message, context)
  logPlayerError(obj)
  return obj
}

// Placeholder for remote logging expansion
export async function remoteLogPlayerError(_err: PlayerErrorObject) {
  // Implement POST to an analytics endpoint later
}
