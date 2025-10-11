import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const userId = 'eb553c02-c01d-4cbb-9acb-94c80dbb5763'
    
    // Create a temporary session by signing in the user programmatically
    // Supabase Admin API createUser does not accept user_id; use id for explicit UUID
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'unlockfreedom1@gmail.com',
      id: userId,
      email_confirm: true
    } as any)

    if (error && !error.message.includes('already')) {
      return NextResponse.json({ 
        error: 'Failed to ensure user exists',
        details: error.message 
      }, { status: 500 })
    }

    // Get the user's current session tokens (if any)
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (!user.user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Create a simple working token manually (for testing only)
    const testToken = `test-token-${userId}-${Date.now()}`
    
    // Test our APIs with a bypass for this specific token
    return NextResponse.json({
      success: true,
      message: 'Use this special test token',
      testToken: testToken,
      userId: userId,
      userEmail: user.user.email,
      instructions: 'This is a special test token that bypasses normal auth for testing'
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
