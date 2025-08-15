type Bucket = { tokens: number; updated: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, opts: { capacity: number; intervalMs: number }): boolean {
  const now = Date.now()
  const b = buckets.get(key) || { tokens: opts.capacity, updated: now }
  const elapsed = now - b.updated
  if (elapsed > opts.intervalMs) {
    b.tokens = opts.capacity
    b.updated = now
  }
  if (b.tokens <= 0) {
    buckets.set(key, b)
    return false
  }
  b.tokens -= 1
  buckets.set(key, b)
  return true
}
