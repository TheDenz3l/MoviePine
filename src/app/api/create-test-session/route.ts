import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json()
    
    // For testing purposes, create a simple success response
    // In production, you'd use the admin client to create actual users
    
    console.log('Creating test session for:', { email, userId })
    
    // Create a mock session that matches Supabase session structure
    const testSession = {
      access_token: `test-token-${Date.now()}`,
      refresh_token: `test-refresh-${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: userId || `test-user-${Date.now()}`,
        email: email || 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {}
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      session: testSession,
      message: 'Test session created'
    })
    
  } catch (error) {
    console.error('Test session creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create test session' },
      { status: 500 }
    )
  }
}
