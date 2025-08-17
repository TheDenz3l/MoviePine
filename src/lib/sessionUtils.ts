import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, CookieOptions } from '@supabase/ssr';

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

// Function to retrieve the current user session from cookies or Authorization header on the server
export async function getSessionServer(request: NextRequest) {
  console.log('[SessionUtils] getSessionServer called');
  
  // First, try to get session from Authorization header
  const authHeader = request.headers.get('authorization');
  console.log('[SessionUtils] Authorization header:', authHeader ? 'present' : 'missing');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('[SessionUtils] Extracted token from Authorization header, length:', token.length);
    
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

    // Set the session manually with the provided token
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      console.log('[SessionUtils] getUser result:', { user: user?.email, error: error?.message });
      
      if (!error && user) {
        console.log('[SessionUtils] Successfully authenticated user via Authorization header:', user.email);
        // Create a minimal session object
        const session = {
          access_token: token,
          user: user,
          expires_at: Math.floor(Date.now() / 1000) + 3600 // Assume 1 hour expiry
        };
        return { session, user, error: null };
      }
    } catch (e) {
      console.error('[SessionUtils] Error validating token:', e);
    }
  }

  // Fallback to cookie-based session
  console.log('[SessionUtils] Falling back to cookie-based session');
  const supabase = await getSupabaseServerClient(request);
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[SessionUtils] Error getting session on server:', error);
    return { session: null, user: null, error };
  }
  console.log('[SessionUtils] Cookie session result:', { user: session?.user?.email, hasSession: !!session });
  return { session, user: session?.user || null, error: null };
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
