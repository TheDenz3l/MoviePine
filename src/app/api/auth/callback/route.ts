import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const access_token = requestUrl.searchParams.get('access_token');
  const refresh_token = requestUrl.searchParams.get('refresh_token');
  const allParams = Object.fromEntries(requestUrl.searchParams.entries());

  console.log('🔐 Auth Callback - Full Debug:', {
    fullUrl: requestUrl.toString(),
    allParams,
    hasCode: !!code,
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
    error,
    error_description,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });

  const redirectWithError = (errorMessage: string, errorCode: string) => {
    const errorUrl = new URL('/auth/auth-code-error', requestUrl.origin);
    errorUrl.searchParams.set('error', errorMessage);
    errorUrl.searchParams.set('error_code', errorCode);
    return NextResponse.redirect(errorUrl.toString());
  };

  // Handle authentication errors from Supabase directly
  if (error === 'invalid_grant' || (error_description && error_description.includes('invalid or expired')) ) {
    console.error('❌ Auth Error: Invalid or expired code from Supabase parameters');
    return redirectWithError('The magic link is invalid or has expired. Please request a new one.', 'EXPIRED_OR_INVALID_MAGIC_LINK');
  }

  // Check if we have direct tokens (some flows provide these)
  if (access_token && refresh_token) {
    console.log('🔑 Direct tokens received, creating session...');
    try {
      const response = NextResponse.redirect(new URL('/', requestUrl.origin));
      
      response.cookies.set('sb-access-token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      response.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      console.log('✅ Direct token authentication successful, redirecting to home');
      return response;
    } catch (error) {
      console.error('❌ Error handling direct tokens:', error);
    }
  }

  // Handle the case where callback is called without parameters (common with modern Supabase)
  if (!code && !error && !access_token) {
    console.log('🔄 No auth parameters, checking for existing session...');
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Check if there's an active session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        console.log('✅ Found existing session, redirecting to home');
        const response = NextResponse.redirect(new URL('/', requestUrl.origin));
        
        response.cookies.set('sb-access-token', sessionData.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });
        response.cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        });
        
        return response;
      } else {
        console.log('ℹ️ No active session found');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
    }
  }

  // Handle general authentication errors or missing code (fallback from initial URL params)
  if (error || !code) {
    console.error('❌ Auth Error: Missing code or general error in URL parameters', { error, error_description, code });
    const errorMessage = error_description || 'Authentication failed. Please try again.';
    const errorCode = !code ? 'MISSING_AUTH_CODE' : 'AUTHENTICATION_FAILED';
    return redirectWithError(errorMessage, errorCode);
  }

  try {
    console.log('🔄 Creating Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log('🔑 Exchanging code for session...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ Code exchange failed:', { exchangeError_message: exchangeError.message, exchangeError_details: exchangeError });
      let errorMessage = `Code exchange failed: ${exchangeError.message}`;
      let errorCode = 'CODE_EXCHANGE_FAILED';

      if (exchangeError.message.includes('invalid or expired')) {
         errorMessage = 'The magic link is invalid or has expired. Please request a new one.';
         errorCode = 'EXPIRED_OR_INVALID_MAGIC_LINK';
      } else if (exchangeError.message.includes('AuthApiError: Email link is invalid or has expired')) {
         // Specific handling for common Supabase AuthApiError
         errorMessage = 'The magic link is invalid or has expired. Please request a new one.';
         errorCode = 'EXPIRED_OR_INVALID_MAGIC_LINK';
      }
      return redirectWithError(errorMessage, errorCode);
    }

    if (!data.session) {
      console.error('❌ No session created after code exchange');
      return redirectWithError('No session was created from the authentication code. Please try again.', 'NO_SESSION_CREATED');
    }

    console.log('✅ Authentication successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      sessionExpires: data.session?.expires_at
    });

    const response = NextResponse.redirect(new URL('/', requestUrl.origin));
    
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    console.log('🏠 Redirecting to home page with auth cookies');
    return response;

  } catch (error) {
    console.error('💥 Unexpected error in auth callback:', error);
    const errorMessage = `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return redirectWithError(errorMessage, 'UNEXPECTED_CALLBACK_ERROR');
  }
}
