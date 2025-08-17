import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setSessionCookies } from '@/lib/sessionUtils'

/**
 * DEV ONLY: Directly create a session for an email using service key and return access token.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'disabled' }, { status: 403 })
  }
  const { email } = await req.json().catch(() => ({ email: null }))
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'missing config' }, { status: 500 })

  try {
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    // ensure user
    await admin.auth.admin.createUser({ email, email_confirm: true }).catch(()=>{})
    // generate link to extract one-time password or token_hash fallback
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (linkErr || !linkData?.properties?.action_link) return NextResponse.json({ error: linkErr?.message || 'generateLink failed' }, { status: 500 })
    const link = new URL(linkData.properties.action_link)
    const token_hash = link.searchParams.get('token_hash')
    if (!token_hash) return NextResponse.json({ error: 'token_hash missing' }, { status: 500 })
    // use public endpoint /auth/v1/verify to turn token_hash into a session
    const verifyUrl = `${url}/auth/v1/verify?type=magiclink&token_hash=${encodeURIComponent(token_hash)}`
    const resp = await fetch(verifyUrl, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
    const json = await resp.json().catch(()=>null)
    if (!resp.ok) return NextResponse.json({ error: 'verify failed', status: resp.status, body: json }, { status: 500 })

    const response = NextResponse.json({ success: true, session: json, email });
    setSessionCookies(response, json);
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 })
  }
}
