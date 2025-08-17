import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Test SMTP configuration by sending a test magic link
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log('[SMTP Test] Testing SMTP with email:', email)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Test magic link sending (this will use Supabase's SMTP configuration)
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${req.nextUrl.origin}/api/auth/callback`
      }
    })

    if (error) {
      console.error('[SMTP Test] Error:', error.message)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: 'SMTP configuration might need adjustment in Supabase dashboard'
      }, { status: 400 })
    }

    console.log('[SMTP Test] Success! Magic link sent.')
    return NextResponse.json({
      success: true,
      message: 'SMTP test successful! Magic link sent.',
      data,
      instructions: 'Check your email for the magic link'
    })

  } catch (error: any) {
    console.error('[SMTP Test] Exception:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message,
      suggestion: 'Check Supabase SMTP configuration in dashboard'
    }, { status: 500 })
  }
}
