import { NextRequest, NextFetchEvent } from 'next/server';
import { rateLimit } from './rateLimit';
import { ServerAuditLogger } from './serverAuditLogger';

/**
 * Rate limiting middleware for Next.js API routes and middleware
 */

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Key generator function to create unique rate limit keys
   * @param request The incoming request
   * @returns A unique key for rate limiting
   */
  keyGenerator?: (request: NextRequest) => string;
  
  /**
   * Whether to log rate limit violations to audit logs
   */
  auditLogging?: boolean;
  
  /**
   * Custom message for rate limit responses
   */
  message?: string;
  
  /**
   * Custom headers to add to rate limit responses
   */
  headers?: Record<string, string>;
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'unknown';
  return `rate-limit:${ip}`;
}

/**
 * Rate limiting middleware function
 * @param options Rate limiting configuration
 * @returns Middleware function that returns Response if rate limited, undefined if allowed
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  const {
    maxRequests,
    windowMs,
    keyGenerator = defaultKeyGenerator,
    auditLogging = true,
    message = 'Too many requests, please try again later.',
    headers = {}
  } = options;

  return async function rateLimitMiddleware(
    request: NextRequest,
    event: NextFetchEvent
  ): Promise<Response | undefined> {
    try {
      const key = keyGenerator(request);
      
      // Check if rate limited
      const isAllowed = rateLimit(key, {
        capacity: maxRequests,
        intervalMs: windowMs
      });

      if (!isAllowed) {
        // Log rate limit violation
        if (auditLogging) {
          event.waitUntil(
            ServerAuditLogger.logRateLimitExceeded(
              request,
              undefined, // userId will be extracted from auth if available
              request.nextUrl.pathname,
              maxRequests
            )
          );
        }

        // Return rate limit response
        const rateLimitHeaders = {
          'Retry-After': Math.ceil(windowMs / 1000).toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
          ...headers
        };

        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            message,
            retryAfter: Math.ceil(windowMs / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...rateLimitHeaders
            }
          }
        );
      }

      // Add rate limit headers to successful responses
      // Note: We can't modify the response here, but we can set up headers for the route handler
      return undefined; // Allow request to proceed

    } catch (error) {
      console.warn('Rate limiting error:', error);
      // Allow request to proceed if rate limiting fails
      return undefined;
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /**
   * Reasonable rate limiting for authentication endpoints
   * 10 requests per minute per IP (increased from 5)
   */
  auth: createRateLimitMiddleware({
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many authentication attempts. Please try again later.',
    auditLogging: true
  }),

  /**
   * Standard rate limiting for API endpoints
   * 200 requests per 15 minutes per IP (increased from 100)
   */
  api: createRateLimitMiddleware({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'API rate limit exceeded. Please try again later.',
    auditLogging: true
  }),

  /**
   * Aggressive rate limiting for sensitive operations
   * 10 requests per hour per IP
   */
  sensitive: createRateLimitMiddleware({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Rate limit exceeded for sensitive operation. Please try again later.',
    auditLogging: true
  }),

  /**
   * Per-user rate limiting (requires user ID from auth)
   */
  user: (maxRequests: number, windowMs: number) => createRateLimitMiddleware({
    maxRequests,
    windowMs,
    keyGenerator: (request) => {
      // Try to extract user ID from Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // In a real implementation, you'd verify the token and extract user ID
        // For now, we'll use a hash of the token as the key
        return `user-rate-limit:${token.substring(0, 16)}`;
      }
      // Fallback to IP-based rate limiting
      return defaultKeyGenerator(request);
    },
    message: 'User rate limit exceeded. Please try again later.',
    auditLogging: true
  })
};

// Export types for convenience
export type { NextRequest, NextFetchEvent };
