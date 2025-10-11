import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, CookieOptions } from '@supabase/ssr';
import {
  StandardSession,
  AuthResponse,
  SessionSource,
  normalizeSession,
  isValidSession,
  createAuthError,
  AUTH_ERROR_CODES,
  COOKIE_CONFIGS
} from './types/auth';

// Helper to get server-side Supabase client for session management via cookies
export async function getSupabaseServerClient(request: NextRequest) {
  // Await cookies() as it's a dynamic API in Next.js App Router
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Assuming cookieStore.get() is now synchronous after awaiting cookies()
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Assuming cookieStore.set() is synchronous
            cookieStore.set(name, value, options);
          } catch (e) {
            console.warn(`[SessionUtils] Failed to set cookie ${name} in getSupabaseServerClient:`, e);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Assuming cookieStore.set() is synchronous for removal
            cookieStore.set(name, '', options);
          } catch (e) {
            console.warn(`[SessionUtils] Failed to remove cookie ${name} in getSupabaseServerClient:`, e);
          }
        },
      },
    }
  );
}

// Enhanced function to retrieve the current user session with proper error handling
export async function getSessionServer(request: NextRequest): Promise<AuthResponse> {
  console.log('[SessionUtils] getSessionServer called');
  
  try {
    // Priority 1: Try Authorization header (for API calls)
    const headerResult = await tryAuthorizationHeader(request);
    if (headerResult.session) {
      console.log('[SessionUtils] Successfully authenticated via Authorization header');
      return headerResult;
    }

    // Priority 2: Try server cookies
    const cookieResult = await tryCookieSession(request);
    if (cookieResult.session) {
      console.log('[SessionUtils] Successfully authenticated via cookies');
      return cookieResult;
    }

    // Priority 3: Try standard Supabase session
    const supabaseResult = await trySupabaseSession(request);
    if (supabaseResult.session) {
      console.log('[SessionUtils] Successfully authenticated via Supabase client');
      return supabaseResult;
    }

    // No valid session found
    console.log('[SessionUtils] No valid session found');
    return { session: null, user: null, error: null };

  } catch (error) {
    console.error('[SessionUtils] Unexpected error in getSessionServer:', error);
    return {
      session: null,
      user: null,
      error: createAuthError(
        AUTH_ERROR_CODES.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        'An unexpected error occurred during authentication'
      ).message
    };
  }
}

// Try to authenticate using Authorization header
async function tryAuthorizationHeader(request: NextRequest): Promise<AuthResponse> {
  const authHeader = request.headers.get('authorization');
  console.log('[SessionUtils] Authorization header:', authHeader ? 'present' : 'missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { session: null, user: null, error: null };
  }

  const token = authHeader.substring(7);
  console.log('[SessionUtils] Extracted token from Authorization header, length:', token.length);
  
  // Skip obviously invalid tokens (too short to be valid JWTs)
  if (token.length < 100) {
    console.log('[SessionUtils] Token too short to be valid, skipping Authorization header auth');
    return { session: null, user: null, error: null };
  }

  try {
    // Create a client that will use the provided token
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('[SessionUtils] getUser result:', { user: user?.email, error: error?.message });
    
    if (error || !user) {
      return {
        session: null,
        user: null,
        error: createAuthError(
          AUTH_ERROR_CODES.INVALID_TOKEN,
          error?.message || 'Invalid token',
          'Invalid authentication token'
        ).message
      };
    }

    console.log('[SessionUtils] Successfully authenticated user via Authorization header:', user.email);
    
    // Create a standardized session object
    const rawSession = {
      access_token: token,
      user: user,
      expires_at: Math.floor(Date.now() / 1000) + 3600 // Assume 1 hour expiry
    };

    const session = normalizeSession(rawSession, SessionSource.AUTHORIZATION_HEADER);
    return { session, user: session?.user || null, error: null };

  } catch (e) {
    console.error('[SessionUtils] Error validating Authorization header token:', e);
    return {
      session: null,
      user: null,
      error: createAuthError(
        AUTH_ERROR_CODES.AUTH_INVALID,
        e instanceof Error ? e.message : 'Token validation failed'
      ).message
    };
  }
}

// Try to authenticate using cookies
async function tryCookieSession(request: NextRequest): Promise<AuthResponse> {
  console.log('[SessionUtils] Trying cookie-based session');
  
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_CONFIGS.ACCESS_TOKEN.name)?.value;
    const refreshToken = cookieStore.get(COOKIE_CONFIGS.REFRESH_TOKEN.name)?.value;
    
    console.log('[SessionUtils] Available cookies:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    if (!accessToken) {
      return { session: null, user: null, error: null };
    }

    // Create a client that will use the cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            if (name === COOKIE_CONFIGS.ACCESS_TOKEN.name) return accessToken;
            if (name === COOKIE_CONFIGS.REFRESH_TOKEN.name) return refreshToken;
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options);
            } catch (e) {
              console.warn(`[SessionUtils] Failed to set cookie ${name}:`, e);
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, '', options);
            } catch (e) {
              console.warn(`[SessionUtils] Failed to remove cookie ${name}:`, e);
            }
          },
        },
      }
    );

    // Try to get the user with the access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      console.log('[SessionUtils] Cookie token validation failed:', userError?.message);
      return {
        session: null,
        user: null,
        error: createAuthError(
          AUTH_ERROR_CODES.INVALID_TOKEN,
          userError?.message || 'Invalid cookie token'
        ).message
      };
    }

    console.log('[SessionUtils] Successfully validated user from cookies:', user.email);
    
    const rawSession = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: user,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    const session = normalizeSession(rawSession, SessionSource.CLIENT_COOKIES);
    return { session, user: session?.user || null, error: null };

  } catch (e) {
    console.error('[SessionUtils] Error validating cookie session:', e);
    return {
      session: null,
      user: null,
      error: createAuthError(
        AUTH_ERROR_CODES.DATABASE_ERROR,
        e instanceof Error ? e.message : 'Cookie validation failed'
      ).message
    };
  }
}

// Try to authenticate using standard Supabase session
async function trySupabaseSession(request: NextRequest): Promise<AuthResponse> {
  console.log('[SessionUtils] Trying standard Supabase session');
  
  try {
    const supabase = await getSupabaseServerClient(request);
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[SessionUtils] Error getting Supabase session:', error);
      return {
        session: null,
        user: null,
        error: createAuthError(
          AUTH_ERROR_CODES.DATABASE_ERROR,
          error.message
        ).message
      };
    }

    if (!session) {
      console.log('[SessionUtils] No Supabase session found');
      return { session: null, user: null, error: null };
    }

    console.log('[SessionUtils] Standard session result:', {
      user: session.user?.email,
      hasSession: !!session,
      sessionAccessToken: session.access_token?.substring(0, 20) + '...' || 'none'
    });

    const normalizedSession = normalizeSession(session, SessionSource.SUPABASE_CLIENT);
    return {
      session: normalizedSession,
      user: normalizedSession?.user || null,
      error: null
    };

  } catch (e) {
    console.error('[SessionUtils] Error in standard session fallback:', e);
    return {
      session: null,
      user: null,
      error: createAuthError(
        AUTH_ERROR_CODES.UNKNOWN_ERROR,
        e instanceof Error ? e.message : 'Supabase session failed'
      ).message
    };
  }
}

// Function to set session cookies on the server response
export function setSessionCookies(response: NextResponse, session: any) {
  if (!session || !session.access_token || !session.refresh_token) {
    console.warn('[SessionUtils] Attempted to set cookies with invalid session data.');
    return;
  }

  // Ensure these match the options in getSupabaseServerClient if they are relevant
  const cookieOptions: CookieOptions = { // Explicitly type to ensure 'sameSite' compatibility
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // This is already a valid literal string in CookieOptions
  };

  response.cookies.set('sb-access-token', session.access_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 }); // 7 days
  response.cookies.set('sb-refresh-token', session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }); // 30 days
  console.log('[SessionUtils] Session cookies set.');
}

// Function to clear session cookies on the server response
export function clearSessionCookies(response: NextResponse) {
  const cookieOptions: CookieOptions = { // Explicitly type to ensure 'sameSite' compatibility
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // This is already a valid literal string in CookieOptions
    maxAge: 0, // Expire immediately
  };

  response.cookies.set('sb-access-token', '', cookieOptions);
  response.cookies.set('sb-refresh-token', '', cookieOptions);
  console.log('[SessionUtils] Session cookies cleared.');
}

// Helper function to get user from session (used by API routes)
export async function getUser(request: NextRequest) {
  const sessionData = await getSessionServer(request);
  
  if (sessionData.error) {
    console.log('[SessionUtils] getUser result:', {
      user: undefined,
      error: typeof sessionData.error === 'string' ? sessionData.error : 'Authentication error'
    });
    return {
      user: undefined,
      error: typeof sessionData.error === 'string' ? sessionData.error : 'Authentication error'
    };
  }
  
  if (!sessionData.session || !sessionData.user) {
    console.log('[SessionUtils] getUser result:', { user: undefined, error: 'No session found' });
    return { user: undefined, error: 'No session found' };
  }
  
  console.log('[SessionUtils] getUser result:', { user: sessionData.user.email, error: undefined });
  return { user: sessionData.user.email, error: undefined };
}
