import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    urlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null
  })
}
