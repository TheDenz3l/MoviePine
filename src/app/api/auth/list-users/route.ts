import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // List all users
    const { data: users, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      users: users.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at
      }))
    })

  } catch (error: any) {
    console.error('List users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list users' },
      { status: 500 }
    )
  }
}
