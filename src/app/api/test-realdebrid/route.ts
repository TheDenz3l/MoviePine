import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_DEBRID_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'Real-Debrid API key not found in environment variables'
    }, { status: 400 })
  }

  // Validate API key format
  const keyValidation = {
    length: apiKey.length,
    expectedLength: 52,
    isValidLength: apiKey.length === 52,
    pattern: /^[A-Z0-9]{52}$/.test(apiKey),
    preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`
  }

  // Test different Real-Debrid endpoints
  const tests = []

  // Test 1: User endpoint (basic auth test)
  try {
    const userResponse = await fetch('https://api.real-debrid.com/rest/1.0/user', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    const responseText = await userResponse.text()
    let userData = null
    
    try {
      userData = JSON.parse(responseText)
    } catch {
      // Not JSON
    }
    
    tests.push({
      endpoint: '/user',
      status: userResponse.status,
      success: userResponse.ok,
      data: userData,
      error: !userResponse.ok ? responseText : null
    })
  } catch (error) {
    tests.push({
      endpoint: '/user',
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    })
  }

  // Test 2: Check if it's an old API key format (without Bearer)
  try {
    const oldFormatResponse = await fetch(`https://api.real-debrid.com/rest/1.0/user?auth_token=${apiKey}`)
    
    const responseText = await oldFormatResponse.text()
    let userData = null
    
    try {
      userData = JSON.parse(responseText)
    } catch {
      // Not JSON
    }
    
    tests.push({
      endpoint: '/user (old format)',
      status: oldFormatResponse.status,
      success: oldFormatResponse.ok,
      data: userData,
      error: !oldFormatResponse.ok ? responseText : null
    })
  } catch (error) {
    tests.push({
      endpoint: '/user (old format)',
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    })
  }

  // Analyze results
  const analysis = {
    keyFormat: keyValidation,
    apiKeyStatus: 'unknown',
    recommendation: ''
  }

  if (!keyValidation.isValidLength) {
    analysis.apiKeyStatus = 'invalid_format'
    analysis.recommendation = 'The API key should be exactly 52 characters long. Please check your Real-Debrid API key.'
  } else if (!keyValidation.pattern) {
    analysis.apiKeyStatus = 'invalid_characters'
    analysis.recommendation = 'The API key contains invalid characters. It should only contain uppercase letters and numbers.'
  } else if (tests[0].status === 401) {
    analysis.apiKeyStatus = 'invalid_or_expired'
    analysis.recommendation = 'The API key is invalid or expired. Please generate a new API key from Real-Debrid settings: https://real-debrid.com/apitoken'
  } else if (tests[0].success) {
    analysis.apiKeyStatus = 'valid'
    analysis.recommendation = 'API key is valid and working!'
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    apiKey: keyValidation,
    tests,
    analysis,
    instructions: {
      howToGetNewKey: [
        '1. Go to https://real-debrid.com/apitoken',
        '2. Login to your Real-Debrid account',
        '3. Click "Create new API Token"',
        '4. Copy the generated token',
        '5. Replace NEXT_PUBLIC_DEBRID_API_KEY in your .env.local file',
        '6. Restart your Next.js development server'
      ]
    }
  })
}
