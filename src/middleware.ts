import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'
import { rateLimiters } from '@/lib/rateLimitMiddleware'

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  
  // Apply different rate limiting based on route type
  let rateLimitResponse: Response | undefined;
  
  if (pathname.startsWith('/api/auth/')) {
    // More lenient rate limiting for auth routes (10 requests per minute)
    rateLimitResponse = await rateLimiters.auth(request, event);
  } else if (pathname.startsWith('/api/me/')) {
    // Lenient rate limiting for authenticated user routes (200 requests per 15 minutes)
    const userRateLimit = rateLimiters.user(200, 15 * 60 * 1000);
    rateLimitResponse = await userRateLimit(request, event);
  } else if (pathname.startsWith('/api/')) {
    // Standard rate limiting for other API routes (100 requests per 15 minutes)
    rateLimitResponse = await rateLimiters.api(request, event);
  }
  // No rate limiting for non-API routes (pages, static assets, etc.)
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired and store new session cookies
  // This step is important for Supabase authentication to work correctly with Next.js App Router
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!public|_next/static|_next/image|favicon.ico).*)',
  ],
}
