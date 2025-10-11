// Centralized fetch wrapper with rate limiting, retry w/ exponential backoff + jitter, 429 respect, and simple in-flight de-dupe.
// Usage: import { rateLimitedFetch } from '@/lib/utils/rateLimitedFetch'

interface RateLimitOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  cacheTtlMs?: number
  dedupeWindowMs?: number
  bucketCapacity?: number       // token bucket size
  refillRatePerSec?: number     // tokens per second
  signal?: AbortSignal
  retryOn?: (status: number) => boolean
}

interface CacheEntry { expires: number; promise: Promise<Response> }

const defaultOptions: Required<Omit<RateLimitOptions,'signal'|'retryOn'>> & { retryOn: (status:number)=>boolean } = {
  maxRetries: 4,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  timeoutMs: 20000,
  cacheTtlMs: 5_000,
  dedupeWindowMs: 150,
  bucketCapacity: 15,
  refillRatePerSec: 5,
  retryOn: (status) => status === 429 || (status >= 500 && status < 600)
}

// Simple token bucket
let tokens = defaultOptions.bucketCapacity
let lastRefill = Date.now()

function takeToken(capacity: number, refillRate: number) {
  const now = Date.now()
  const elapsed = (now - lastRefill) / 1000
  if (elapsed > 0) {
    tokens = Math.min(capacity, tokens + elapsed * refillRate)
    lastRefill = now
  }
  if (tokens >= 1) {
    tokens -= 1
    return true
  }
  return false
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, { ts: number; promise: Promise<Response> }>()

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t); reject(signal.reason || new DOMException('Aborted','AbortError'))
      }, { once: true })
    }
  })
}

function jitteredDelay(attempt: number, base: number, max: number) {
  const exp = Math.min(max, base * 2 ** (attempt - 1))
  const jitter = Math.random() * 0.3 * exp
  return exp + jitter
}

export async function rateLimitedFetch(input: RequestInfo | URL, init: RequestInit = {}, opts: RateLimitOptions = {}): Promise<Response> {
  const o = { ...defaultOptions, ...opts }
  if (opts.retryOn) o.retryOn = opts.retryOn
  const key = buildCacheKey(input, init)
  const now = Date.now()

  // Cache hit
  const cached = cache.get(key)
  if (cached && cached.expires > now) {
    return cached.promise.then(r => r.clone())
  }

  // Deduplicate very recent identical calls
  const existing = inFlight.get(key)
  if (existing && (now - existing.ts) < o.dedupeWindowMs) {
    return existing.promise.then(r => r.clone())
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), o.timeoutMs)
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const execPromise = (async () => {
    try {
      let attempt = 0
      while (true) {
        attempt++
        // Rate limit token bucket wait
        while (!takeToken(o.bucketCapacity, o.refillRatePerSec)) {
          await sleep(100, controller.signal)
        }

        let response: Response
        try {
          response = await fetch(input, { ...init, signal: controller.signal })
        } catch (err: any) {
          if (controller.signal.aborted) throw err
          // Network error -> retry (unless exceeded)
          if (attempt <= o.maxRetries) {
            await sleep(jitteredDelay(attempt, o.baseDelayMs, o.maxDelayMs), controller.signal)
            continue
          }
          throw err
        }

        if (!o.retryOn(response.status)) {
          return response
        }

        if (attempt > o.maxRetries) {
          return response
        }

        // Respect Retry-After
        const ra = parseRetryAfter(response.headers.get('Retry-After'))
        const delay = ra ?? jitteredDelay(attempt, o.baseDelayMs, o.maxDelayMs)
        await sleep(delay, controller.signal)
      }
    } finally {
      clearTimeout(timeout)
    }
  })()

  inFlight.set(key, { ts: now, promise: execPromise })
  execPromise.finally(() => inFlight.delete(key))

  // Store in cache (resolve clone to keep body for consumer)
  cache.set(key, { expires: now + o.cacheTtlMs, promise: execPromise.then(r => r.clone()) })
  return execPromise
}

function parseRetryAfter(v: string | null): number | null {
  if (!v) return null
  const seconds = Number(v)
  if (!Number.isNaN(seconds)) return seconds * 1000
  const date = Date.parse(v)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return null
}

function buildCacheKey(input: RequestInfo | URL, init: RequestInit): string {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = init.method || 'GET'
  const body = init.body && typeof init.body === 'string' ? init.body.slice(0, 200) : ''
  return method + '|' + url + '|' + body
}

// Convenience JSON helper
export async function rateLimitedJson<T=unknown>(input: RequestInfo | URL, init: RequestInit = {}, opts?: RateLimitOptions): Promise<T> {
  const res = await rateLimitedFetch(input, init, opts)
  if (!res.ok) throw new Error(`Request failed ${res.status}`)
  return res.json() as Promise<T>
}
