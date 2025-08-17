import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // This is a simple test endpoint to help debug authentication
    // In production, this should be removed or secured
    
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    const authCookies = allCookies.filter((cookie: any) => 
      cookie.name.includes('sb-') || 
      cookie.name.includes('auth') || 
      cookie.name.includes('session')
    )
    
    return NextResponse.json({ 
      success: true, 
      cookies: authCookies.map((c: any) => ({ name: c.name, hasValue: !!c.value })),
      message: 'This endpoint is for testing only and should be removed in production'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
