import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Debug magic link generation to see actual URL format
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Generate magic link using admin API to see the actual URL
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${req.nextUrl.origin}/auth/callback`
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const actionLink = data.properties.action_link
    console.log('[DEBUG MAGIC LINK] Full action link:', actionLink)
    
    // Parse the URL to see its structure
    const url = new URL(actionLink)
    const allParams = Object.fromEntries(url.searchParams.entries())
    
    return NextResponse.json({
      success: true,
      actionLink,
      urlStructure: {
        host: url.host,
        pathname: url.pathname,
        searchParams: allParams,
        hash: url.hash
      },
      redirectTo: `${req.nextUrl.origin}/api/auth/callback`,
      instructions: 'Check the URL structure to see why callback might not receive parameters'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
