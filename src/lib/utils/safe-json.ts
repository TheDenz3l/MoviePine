// Safe JSON parse helper to prevent uncaught SyntaxError crashes in UI/runtime.
// Returns fallback (default null) on failure and logs a concise warning once per label+hash.

const seen: Record<string, boolean> = {}

export function safeParse<T = any>(raw: string | null | undefined, fallback: T | null = null, label = 'json'): T | null {
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch (e: any) {
    const key = label + ':' + (raw ? raw.length : 0)
    if (!seen[key]) {
      // Log only first occurrence to avoid console spam
      // Use console.warn (not error) to minimize noise in CI / Playwright
      console.warn(`[safeParse] Failed (${label}) length=${raw.length}: ${e?.message || e}`)
      seen[key] = true
    }
    return fallback
  }
}

export function safeStringify(obj: any, fallback = 'null', label = 'json'): string {
  try {
    return JSON.stringify(obj)
  } catch (e: any) {
    const key = 'stringify:' + label
    if (!seen[key]) {
      console.warn(`[safeStringify] Failed (${label}): ${e?.message || e}`)
      seen[key] = true
    }
    return fallback
  }
}
