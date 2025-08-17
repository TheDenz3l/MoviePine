import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const redirectToUrl = `${req.nextUrl.origin}/auth/callback`;
    console.log(`[Magic Link API] Attempting to send magic link to: ${email}`);
    console.log(`[Magic Link API] emailRedirectTo set to: ${redirectToUrl}`);

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectToUrl,
        data: {
          redirect_to: redirectToUrl
        }
      },
    });

    if (error) {
      console.error('[Magic Link API] signInWithOtp failed:', { error_message: error.message, error_details: error });
      let userMessage = 'Failed to send magic link. Please check your email and try again.';
      let errorCode = 'MAGIC_LINK_SEND_FAILED';
      let statusCode = error.status || 500; // Default to 500 if error.status is not available

      if (error.message.includes('Invalid email address')) {
        userMessage = 'Invalid email address format. Please enter a valid email.';
        errorCode = 'INVALID_EMAIL_FORMAT';
        statusCode = 400;
      } else if (error.message.includes('Rate limit exceeded')) {
        userMessage = 'Too many attempts. Please try again in a few minutes.';
        errorCode = 'RATE_LIMIT_EXCEEDED';
        statusCode = 429; // HTTP status code for Too Many Requests
      } else if (error.message.includes('Service unavailable') || error.message.includes('network failed')) {
        userMessage = 'Authentication service is currently unavailable. Please try again later.';
        errorCode = 'SERVICE_UNAVAILABLE';
        statusCode = 503; // HTTP status code for Service Unavailable
      }
      
      return NextResponse.json({ error: userMessage, errorCode }, { status: statusCode });
    }

    console.log('[Magic Link API] signInWithOtp successful:', data);
    return NextResponse.json({
      success: true,
      message: 'Magic link sent! Check your email.',
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in send-magic-link:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while sending the magic link.', errorCode: 'UNEXPECTED_ERROR' },
      { status: 500 }
    );
  }
}
