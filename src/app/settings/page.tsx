"use client"

import { useAuth } from '@/components/auth/AuthProvider'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/components/settings/useSettings'

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const [active, setActive] = useState('profile')

  if (loading) return <div className="p-8">Loading auth...</div>
  if (!user) return <div className="p-8 max-w-md">
    <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
    <p className="text-sm text-neutral-400">Please sign in to manage your settings.</p>
  </div>

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'playback', label: 'Playback & Subtitles' },
    { id: 'ui', label: 'UI & Accessibility' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'devices', label: 'Devices' },
    { id: 'security', label: 'Account Security' },
    { id: 'billing', label: 'Billing' }
  ]

  return (
    <div className="min-h-screen pt-24 px-8 pb-16">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="flex gap-10">
        <aside className="w-56 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={()=>setActive(s.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition ${active===s.id? 'bg-red-600 text-white':'bg-neutral-800/40 hover:bg-neutral-700/40 text-neutral-300'}`}>{s.label}</button>
          ))}
        </aside>
        <main className="flex-1 max-w-3xl space-y-10">
          {active === 'profile' && <ProfileSection />}
          {active === 'playback' && <PlaybackSection />}
          {active === 'ui' && <UISection />}
            {active === 'privacy' && <PrivacySection />}
          {active === 'devices' && <DevicesSection />}
          {active === 'security' && <SecuritySection />}
          {active === 'billing' && <BillingSection />}
        </main>
      </div>
    </div>
  )
}

function PlaceholderCard({ title, children }: { title: string; children?: any }) {
  return <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-5 space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children || <p className="text-sm text-neutral-400">Coming soon</p>}
  </div>
}

function sanitizeDisplayName(raw: string) {
  return raw.replace(/[\p{Cc}\p{Cn}]/gu,'').trim().slice(0,40)
}

function ProfileSection() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState<string>(user?.user_metadata?.display_name || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { push } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const saveProfile = async () => {
    const clean = sanitizeDisplayName(displayName)
  if (clean.length < 2) { push({ type:'error', message:'Name must be 2–40 characters.' }); return }
  setSaving(true)
    try {
      const { supabase } = await import('@/lib/supabaseClient')
      if (!supabase) throw new Error('Supabase not configured')
      const { error, data } = await supabase.auth.updateUser({ data: { display_name: clean, avatar_url: avatarUrl || undefined } })
      if (error) throw error
      // Optimistically mutate local user object to reflect changes immediately.
      if (data.user) {
        (data.user as any).user_metadata.display_name = clean
        if (avatarUrl) (data.user as any).user_metadata.avatar_url = avatarUrl
      }
      push({ type:'success', message:'Profile updated' })
    } catch (e: any) { push({ type:'error', message:e.message }) } finally { setSaving(false) }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024*1024) { push({ type:'error', message:'Avatar must be ≤ 1MB.' }); return }
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) { push({ type:'error', message:'Use PNG, JPG or WEBP.' }); return }
    setUploading(true)
    try {
      const { supabase } = await import('@/lib/supabaseClient')
      if (!supabase) throw new Error('Supabase not configured')
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: upload, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      // Try to get a public URL (bucket should be public or use signed URL fallback)
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(upload.path)
      setAvatarUrl(pub.publicUrl)
      push({ type:'info', message:'Avatar uploaded (save to apply)' })
    } catch (e: any) { push({ type:'error', message: e.message.includes('Not Found') ? 'Bucket "avatars" missing – create it in Supabase Storage (public).' : e.message }) } finally { setUploading(false) }
  }

  return <PlaceholderCard title="Profile">
    <div className="flex flex-col gap-6 max-w-lg text-sm">
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="size-20 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" /> : <span className="text-neutral-500 text-xs">No Avatar</span>}
          </div>
          <button type="button" onClick={()=>fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-neutral-700 hover:bg-neutral-600 text-[10px] px-2 py-1 rounded-full border border-neutral-500">{uploading? '...' : 'Edit'}</button>
          <input ref={fileInputRef} onChange={onFileChange} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="block text-[11px] uppercase tracking-wide text-neutral-400 font-medium">Display Name</label>
          <input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={40} placeholder="Your name" className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600" />
          <div className="text-[10px] text-neutral-500">2–40 chars. Shown in future social features.</div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button size="sm" onClick={saveProfile} disabled={saving || uploading}>Save Profile</Button>
  <Button size="sm" variant="secondary" onClick={()=>{ setDisplayName(user?.user_metadata?.display_name||''); setAvatarUrl(user?.user_metadata?.avatar_url||null) }} disabled={saving || uploading}>Reset</Button>
      </div>
    </div>
  </PlaceholderCard>
}

function PlaybackSection() {
  const { settings, update, pending } = useSettings()
  const { push } = useToast()
  const prevPending = useRef(false)
  
  // Existing settings
  const autoplay = settings?.playback?.autoplayNext ?? true
  const preferred = settings?.playback?.preferredFormat || 'auto'
  const subLang = settings?.subtitles?.language || 'en'
  
  // New advanced settings
  const skipIntros = settings?.playback?.skipIntros ?? false
  const defaultQuality = settings?.playback?.defaultQuality || 'auto'
  const defaultSpeed = settings?.playback?.defaultSpeed || 1.0
  const autoplayCountdown = settings?.playback?.autoplayCountdown ?? 15
  const resumeThreshold = settings?.playback?.resumeThreshold ?? 10
  
  // Subtitle style settings
  const subSize = settings?.subtitles?.fontSize || 'medium'
  const subColor = settings?.subtitles?.color || '#ffffff'
  const subBackground = settings?.subtitles?.background || 'transparent'
  const subOpacity = settings?.subtitles?.opacity || 1.0
  
  const persist = (patch: any) => { 
    update({ 
      playback: { ...(settings?.playback||{}), ...patch.playback }, 
      subtitles: { ...(settings?.subtitles||{}), ...patch.subtitles } 
    }) 
  }
  
  useEffect(() => {
    if (prevPending.current && !pending) push({ type:'success', message:'Playback settings saved' })
    prevPending.current = pending
  }, [pending, push])
  
  return <PlaceholderCard title="Playback & Subtitles">
    <div className="space-y-6">
      {/* Playback Controls */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-white">Playback</h3>
        
        <label className="flex items-center gap-3 text-sm">
          <input 
            type="checkbox" 
            checked={autoplay} 
            onChange={e=>persist({ playback: { autoplayNext: e.target.checked } })} 
          /> 
          Autoplay next episode
        </label>
        
        <label className="flex items-center gap-3 text-sm">
          <input 
            type="checkbox" 
            checked={skipIntros} 
            onChange={e=>persist({ playback: { skipIntros: e.target.checked } })} 
          /> 
          Automatically skip intros
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm space-y-1">
            <div className="font-medium">Preferred format</div>
            <select 
              value={preferred} 
              onChange={e=>persist({ playback: { preferredFormat: e.target.value } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
            >
              <option value="auto">Auto</option>
              <option value="hls">HLS</option>
              <option value="mp4">MP4</option>
            </select>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="font-medium">Default quality</div>
            <select 
              value={defaultQuality} 
              onChange={e=>persist({ playback: { defaultQuality: e.target.value } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
            >
              <option value="auto">Auto</option>
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm space-y-1">
            <div className="font-medium">Default speed</div>
            <select 
              value={defaultSpeed} 
              onChange={e=>persist({ playback: { defaultSpeed: parseFloat(e.target.value) } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x (Normal)</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="font-medium">Autoplay countdown</div>
            <select 
              value={autoplayCountdown} 
              onChange={e=>persist({ playback: { autoplayCountdown: parseInt(e.target.value) } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>
        </div>
        
        <div className="text-sm space-y-1">
          <div className="font-medium">Resume threshold</div>
          <div className="text-xs text-gray-400 mb-2">Skip to beginning if less than this time has passed</div>
          <select 
            value={resumeThreshold} 
            onChange={e=>persist({ playback: { resumeThreshold: parseInt(e.target.value) } })} 
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
          >
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
          </select>
        </div>
      </div>
      
      {/* Subtitle Settings */}
      <div className="space-y-4 border-t border-neutral-700 pt-4">
        <h3 className="font-medium text-sm text-white">Subtitles</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm space-y-1">
            <div className="font-medium">Default language</div>
            <input 
              value={subLang} 
              onChange={e=>persist({ subtitles: { language: e.target.value } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full" 
              placeholder="en"
            />
          </div>
          
          <div className="text-sm space-y-1">
            <div className="font-medium">Font size</div>
            <select 
              value={subSize} 
              onChange={e=>persist({ subtitles: { fontSize: e.target.value } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="x-large">Extra Large</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm space-y-1">
            <div className="font-medium">Text color</div>
            <input 
              type="color" 
              value={subColor} 
              onChange={e=>persist({ subtitles: { color: e.target.value } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-1 py-1 text-sm w-full h-8" 
            />
          </div>
          
          <div className="text-sm space-y-1">
            <div className="font-medium">Background</div>
            <select 
              value={subBackground} 
              onChange={e=>persist({ subtitles: { background: e.target.value } })} 
              className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-full"
            >
              <option value="transparent">Transparent</option>
              <option value="black">Black</option>
              <option value="semi-black">Semi-transparent Black</option>
              <option value="white">White</option>
            </select>
          </div>
        </div>
        
        <div className="text-sm space-y-1">
          <div className="font-medium">Opacity</div>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            value={subOpacity} 
            onChange={e=>persist({ subtitles: { opacity: parseFloat(e.target.value) } })} 
            className="w-full"
          />
          <div className="text-xs text-gray-400">{Math.round(subOpacity * 100)}%</div>
        </div>
        
        {/* Subtitle Preview */}
        <div className="mt-4 p-3 bg-neutral-900 rounded border">
          <div className="text-xs text-gray-400 mb-2">Preview:</div>
          <div 
            className="text-center py-2 px-3 rounded inline-block"
            style={{
              color: subColor,
              fontSize: subSize === 'small' ? '14px' : subSize === 'large' ? '20px' : subSize === 'x-large' ? '24px' : '16px',
              backgroundColor: subBackground === 'black' ? 'rgba(0,0,0,1)' : 
                              subBackground === 'semi-black' ? 'rgba(0,0,0,0.7)' : 
                              subBackground === 'white' ? 'rgba(255,255,255,1)' : 'transparent',
              opacity: subOpacity,
              textShadow: subBackground === 'transparent' ? '1px 1px 2px rgba(0,0,0,0.7)' : 'none'
            }}
          >
            Sample subtitle text
          </div>
        </div>
      </div>
    </div>
  </PlaceholderCard>
}

function UISection() {
  const { settings, update, pending } = useSettings()
  const { push } = useToast()
  const prevPending = useRef(false)
  const reduced = settings?.ui?.reducedMotion ?? false
  const theme = settings?.ui?.theme || (typeof window !== 'undefined' ? (localStorage.getItem('ui_theme') || 'dark') : 'dark')
  const persist = (patch: any) => { update({ ui: { ...(settings?.ui||{}), ...patch.ui } }) }
  useEffect(() => {
    if (prevPending.current && !pending) push({ type:'success', message:'Accessibility preferences saved' })
    prevPending.current = pending
  }, [pending, push])
  return <PlaceholderCard title="Accessibility">
    <div className="space-y-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={e=>persist({ ui: { reducedMotion: e.target.checked } })} /> Reduced motion</label>
      <div className="space-y-1">
        <div className="font-medium">Theme</div>
        <select value={theme} onChange={e=>persist({ ui: { theme: e.target.value } })} className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm w-40">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
        <div className="text-[10px] text-neutral-500">Applies instantly & persists.</div>
      </div>
    </div>
  </PlaceholderCard>
}

function PrivacySection() {
  const { settings, update, pending } = useSettings()
  const { push } = useToast()
  const prevPending = useRef(false)
  const [clearing, setClearing] = useState(false)
  const track = settings?.privacy?.trackProgress ?? true
  useEffect(() => { import('@/lib/settingsCache').then(m => m.setPrivacyTrackFlag(track)) }, [track])
  const persist = (patch: any) => { update({ privacy: { ...(settings?.privacy||{}), ...patch.privacy } }) }
  useEffect(() => {
    if (prevPending.current && !pending) push({ type:'success', message:'Privacy settings saved' })
    prevPending.current = pending
  }, [pending, push])
  const clearHistory = async () => {
    if (clearing) return
    if (!confirm('Clear all watch & episode progress? This cannot be undone.')) return
    setClearing(true)
    try {
      const res = await fetch('/api/progress?scope=all', { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        push({ type:'success', message:`Cleared ${json.deleted.watch + json.deleted.episodes} progress entries` })
      } else throw new Error(json.error)
    } catch (e:any) { push({ type:'error', message:e.message }) } finally { setClearing(false) }
  }
  return <PlaceholderCard title="Privacy">
    <div className="space-y-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={track} onChange={e=>persist({ privacy: { trackProgress: e.target.checked } })} /> Track watch progress</label>
      <Button size="sm" variant="destructive" onClick={clearHistory} disabled={clearing}>{clearing? 'Clearing...' : 'Clear watch history'}</Button>
      <div className="text-[10px] text-neutral-500">Removes all saved progress (episodes & movies). Local caches may update on next page load.</div>
    </div>
  </PlaceholderCard>
}

function DevicesSection() {
  const { session } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push } = useToast()
  const load = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/me/sessions', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (json.success) setSessions(json.sessions)
      else setError(json.error || 'Failed to load')
    } catch (e:any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [session])
  const revoke = async (id: string) => {
    const current = localStorage.getItem('device_session_id') === id
    if (current && !confirm('Revoke this current session? You will be signed out.')) return
    await fetch('/api/me/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ id, revoke: true }) })
    if (current) {
      push({ type:'info', message:'Session revoked. Redirecting to sign in...' })
      setTimeout(()=>{ window.location.href='/sign-in' }, 1200)
    }
    load()
  }
  const heartbeat = async () => {
    await fetch('/api/me/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ id: sessions[0]?.id }) })
  }
  return <PlaceholderCard title="Devices">
    <div className="space-y-3 text-sm">
      <div className="flex gap-2"><Button size="sm" onClick={load}>Refresh</Button><Button size="sm" variant="secondary" onClick={heartbeat} disabled={!sessions.length}>Heartbeat</Button></div>
      {loading && <div>Loading sessions...</div>}
      {error && <div className="text-red-400 text-xs">{error}</div>}
      <ul className="space-y-2 max-h-64 overflow-auto pr-2">
        {sessions.map(s => {
          const isCurrent = localStorage.getItem('device_session_id') === s.id
          return <li key={s.id} className={`flex items-center justify-between px-3 py-2 rounded border ${isCurrent? 'bg-red-600/15 border-red-500/40':'bg-neutral-800/40 border-neutral-700/50'}`}>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate flex items-center gap-2">{s.device_label || s.user_agent?.slice(0,40) || 'Unknown Device'} {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/80">Current</span>}</div>
              <div className="text-[10px] text-neutral-400">Last seen {s.last_seen_at?.replace('T',' ').replace('Z','')} {s.revoked_at && '(revoked)'}</div>
            </div>
            {!s.revoked_at && <Button size="sm" variant="ghost" onClick={()=>revoke(s.id)}>Revoke</Button>}
          </li>
        })}
        {!sessions.length && !loading && <div className="text-neutral-400 text-xs">No sessions yet. Opening this page will register soon.</div>}
      </ul>
    </div>
  </PlaceholderCard>
}

function SecuritySection() {
  const { session } = useAuth()
  const [email, setEmail] = useState(session?.user?.email || '')
  const [newEmail, setNewEmail] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const { push } = useToast()
  const [loading, setLoading] = useState(false)
  const submitEmail = async () => {
    if (!newEmail) return
  setLoading(true)
    try {
      const { error } = await (await import('@/lib/supabaseClient')).supabase!.auth.updateUser({ email: newEmail })
      if (error) {
    push({ type:'error', message:error.message })
      } else {
    push({ type:'success', message:'Verification email sent' })
      }
  } catch (e:any) { push({ type:'error', message:e.message }) } finally { setLoading(false) }
  }
  const submitPassword = async () => {
  if (!pw1 || pw1 !== pw2 || pw1.length < 8) { push({ type:'error', message:'Passwords must match & be ≥8 chars' }); return }
  setLoading(true)
    try {
      const { error } = await (await import('@/lib/supabaseClient')).supabase!.auth.updateUser({ password: pw1 })
      if (error) {
    push({ type:'error', message:error.message })
      } else {
    push({ type:'success', message:'Password updated' })
      }
      setPw1(''); setPw2('')
  } catch (e:any) { push({ type:'error', message:e.message }) } finally { setLoading(false) }
  }
  return <PlaceholderCard title="Account Security">
    <div className="space-y-8 text-sm">
      <div>
        <div className="font-medium mb-2">Change Email</div>
        <div className="flex flex-col gap-2 max-w-sm">
          <input disabled value={email} className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs opacity-70" />
          <input type="email" placeholder="New email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs" />
          <Button size="sm" onClick={submitEmail} disabled={!newEmail || loading}>Update Email</Button>
        </div>
      </div>
      <div>
        <div className="font-medium mb-2">Change Password</div>
        <div className="flex flex-col gap-2 max-w-sm">
          <input type="password" placeholder="New password" value={pw1} onChange={e=>setPw1(e.target.value)} className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs" />
          <input type="password" placeholder="Confirm password" value={pw2} onChange={e=>setPw2(e.target.value)} className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs" />
          <Button size="sm" variant="secondary" onClick={submitPassword} disabled={!pw1 || pw1!==pw2 || loading}>Update Password</Button>
          <div className="text-[10px] text-neutral-500">Minimum 8 characters</div>
        </div>
      </div>
    </div>
  </PlaceholderCard>
}

function BillingSection() {
  return <PlaceholderCard title="Billing">
    <p className="text-sm text-neutral-300">Current plan: <span className="font-semibold">Free</span></p>
    <Button size="sm" className="mt-3" disabled>Upgrade (Coming Soon)</Button>
  </PlaceholderCard>
}
