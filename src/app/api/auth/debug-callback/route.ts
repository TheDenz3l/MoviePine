import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint to see what parameters are being sent to auth callback
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const allParams = Object.fromEntries(requestUrl.searchParams.entries())
  
  console.log('🔍 Debug Auth Callback:', {
    fullUrl: requestUrl.toString(),
    searchParams: allParams,
    hash: requestUrl.hash,
    pathname: requestUrl.pathname
  })

  return NextResponse.json({
    debug: true,
    fullUrl: requestUrl.toString(),
    searchParams: allParams,
    hash: requestUrl.hash,
    pathname: requestUrl.pathname,
    timestamp: new Date().toISOString()
  })
}
