import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { THEMES, getPrefs, setPrefs } from './prefs'
import { pubUrl } from './Social'

function usePrefs() { const [p, setP] = useState(getPrefs()); useEffect(() => { const f = () => setP(getPrefs()); window.addEventListener('sym-prefs', f); return () => window.removeEventListener('sym-prefs', f) }, []); return p }
const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => <button className={'sw' + (on ? ' on' : '')} onClick={() => set(!on)} aria-pressed={on} />

// Background music player (track chosen by the admin). Browsers only allow sound after a first tap.
export function BgMusic() {
  const p = usePrefs(); const [track, setTrack] = useState<{ path?: string; enabled?: boolean } | null>(null); const a = useRef<HTMLAudioElement | null>(null)
  useEffect(() => { supabase.from('site_settings').select('value').eq('key', 'bg_music').maybeSingle().then(r => setTrack(r.data?.value ?? null)) }, [])
  const url = track?.enabled && track.path ? pubUrl(track.path) : ''
  useEffect(() => {
    if (!url) return
    const el = new Audio(url); el.loop = true; el.volume = getPrefs().vol; a.current = el
    // Music is ON by default. Browsers only allow sound after a tap, so try now and retry on the first tap/key.
    const start = () => { if (getPrefs().music && el.paused) el.play().catch(() => { /* waits for the first tap */ }) }
    start()
    const evs = ['pointerdown', 'touchstart', 'keydown']; evs.forEach(ev => document.addEventListener(ev, start, { once: true }))
    return () => { evs.forEach(ev => document.removeEventListener(ev, start)); el.pause(); a.current = null }
  }, [url])
  useEffect(() => { const el = a.current; if (!el) return; el.volume = p.vol; if (!p.music) el.pause(); else if (el.paused) el.play().catch(() => { /* needs a tap */ }) }, [p.music, p.vol, url])
  if (!url) return null
  return <button className={'music-btn' + (p.music ? '' : ' off')} aria-label="Music on/off" onClick={() => { const el = a.current; if (p.music) { el?.pause(); setPrefs({ music: false }) } else { setPrefs({ music: true }); el?.play().catch(() => { /* ignore */ }) } }}>{p.music ? '🎵' : '🔇'}</button>
}

export function Settings() {
  const p = usePrefs(); const { session, profile, isAdmin } = useAuth(); const nav = useNavigate()
  const [npw, setNpw] = useState(''); const [msg, setMsg] = useState('')
  const changePw = async () => { if (npw.length < 6) return setMsg('Password must be at least 6 characters.'); const { error } = await supabase.auth.updateUser({ password: npw }); setMsg(error ? error.message : 'Password changed ✅'); if (!error) setNpw('') }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>
      <div className="glass p-4">
        <h3 className="font-semibold mb-3">🎨 Theme</h3>
        <div className="flex gap-3 flex-wrap">{THEMES.map(t => (
          <button key={t.id} className={'swatch' + (p.theme === t.id ? ' on' : '')} onClick={() => setPrefs({ theme: t.id })}><i style={{ background: `linear-gradient(135deg,${t.a},${t.b})` }} />{t.name}</button>))}</div>
        <div className="row mt-3"><span>Text size</span><span className="flex gap-2 items-center"><button className="sym-btn !px-3" onClick={() => setPrefs({ font: Math.max(14, p.font - 1) })}>A−</button><b>{p.font}</b><button className="sym-btn !px-3" onClick={() => setPrefs({ font: Math.min(20, p.font + 1) })}>A+</button></span></div>
        <div className="row"><span>Lite mode<small className="block text-gray-500">Turns off the moving background. Faster on slow phones.</small></span><Toggle on={p.lite} set={v => setPrefs({ lite: v })} /></div>
      </div>
      <div className="glass p-4">
        <h3 className="font-semibold mb-1">🔊 Sound & LEO</h3>
        <div className="row"><span>Background music<small className="block text-gray-500">Plays if the admin added a track.</small></span><Toggle on={p.music} set={v => setPrefs({ music: v })} /></div>
        <div className="row"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value={p.vol} onChange={e => setPrefs({ vol: Number(e.target.value) })} /></div>
        <div className="row"><span>LEO speaks replies<small className="block text-gray-500">Reads LEO's answers aloud (uses your phone's voice).</small></span><Toggle on={p.voice} set={v => setPrefs({ voice: v })} /></div>
        <div className="row"><span>Show LEO assistant</span><Toggle on={p.leo} set={v => setPrefs({ leo: v })} /></div>
      </div>
      {session && <div className="glass p-4">
        <h3 className="font-semibold mb-2">👤 Account</h3>
        <p className="text-sm text-gray-400 mb-2">Logged in as <b className="text-white">{profile?.display_name || profile?.username}</b></p>
        <div className="flex gap-2 flex-wrap mb-3"><Link to="/profile" className="sym-btn">Edit profile</Link>{isAdmin && <Link to="/admin" className="sym-btn">Admin panel</Link>}<Link to="/rules" className="sym-btn">Guild rules</Link></div>
        <input className="sym-inp" type="password" placeholder="New password (min 6)" value={npw} onChange={e => setNpw(e.target.value)} />
        <button className="sym-btn w-full" onClick={changePw}>Change my password</button>
        {msg && <p className="text-amber-300 text-sm mt-2">{msg}</p>}
        <button className="sym-btn danger w-full mt-3" onClick={() => supabase.auth.signOut().then(() => nav('/login'))}>Logout</button>
      </div>}
      <div className="glass p-4 text-sm">
        <h3 className="font-semibold mb-2">ℹ️ About SYMBIOTES</h3>
        <p className="text-gray-300">Official guild website.</p>
        <p className="text-gray-300 mt-2">Created by <b className="text-white">RIN (Rinshad)</b>, one of the founders of the SYMBIOTES guild. Back supporter: <b className="text-white">Shahil</b>.</p>
        <p className="text-gray-500 text-xs mt-2">Accounts are created by the admin only.</p>
      </div>
    </div>
  )
}
