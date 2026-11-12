import { useEffect, useState } from 'react'
import { supabase } from './lib'
import { callLeo } from './leoApi'
import { useAuth } from './auth'
import { pubUrl } from './Social'

type Rule = { id?: string; title: string; body: string; category: string; published: boolean; sort: number }
const blank: Rule = { title: '', body: '', category: 'rule', published: true, sort: 0 }

export function AdminLeoPanel() {
  const { session } = useAuth(); const uid = session!.user.id
  const [msg, setMsg] = useState('')
  // --- LEO config ---
  const [cfg, setCfg] = useState<any>({ enabled: true, daily_limit: 40, weekly_target: 0, extra_personality: '' })
  const [stats, setStats] = useState<{ today: number; week: number; tokens: number } | null>(null); const [errs, setErrs] = useState<any[]>([])
  // --- rules ---
  const [rules, setRules] = useState<any[]>([]); const [f, setF] = useState<Rule>(blank)
  // --- music ---
  const [mus, setMus] = useState<any>({ enabled: false }); const [busy, setBusy] = useState(false)
  const loadRules = () => supabase.from('guild_rules').select('*').order('category').order('sort').then(r => setRules(r.data ?? []))
  useEffect(() => {
    supabase.from('leo_settings').select('value').eq('key', 'config').maybeSingle().then(r => r.data?.value && setCfg((x: any) => ({ ...x, ...r.data.value })))
    supabase.from('site_settings').select('value').eq('key', 'bg_music').maybeSingle().then(r => r.data?.value && setMus(r.data.value))
    const since = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10)
    supabase.from('leo_usage').select('day,msgs,tokens').gte('day', since).then(r => { const d = r.data ?? []; const t = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10); setStats({ today: d.filter((x: any) => x.day === t).reduce((a: number, x: any) => a + x.msgs, 0), week: d.reduce((a: number, x: any) => a + x.msgs, 0), tokens: d.reduce((a: number, x: any) => a + x.tokens, 0) }) })
    supabase.from('leo_errors').select('at,msg').order('at', { ascending: false }).limit(6).then(r => setErrs(r.data ?? []))
    loadRules()
  }, [])
  const [test, setTest] = useState<string[] | null>(null)
  const runTest = async () => {
    setTest(['Testing… (up to 25 seconds)'])
    const { data, error } = await callLeo({ ping: true })
    if (error) {
      const c = (error as any).context; const st = c?.status; let d = ''
      try { const j = await c.json(); d = j?.detail || j?.msg || j?.message || j?.error || '' } catch { /* ignore */ }
      return setTest([`FAIL: cannot use the function "leo" (${st ?? 'no connection'}) ${d}`, st === 404 || !st ? '→ The function is not deployed.' : st === 401 ? '→ Open the function settings, turn "Verify JWT" OFF, then Deploy again.' : '→ Open Supabase > Edge Functions > smart-responder > Logs for details.'])
    }
    setTest(Object.entries((data as any)?.checks ?? {}).map(([k, v]) => `${k}: ${v}`))
  }
  const saveCfg = async () => {
    const value = { enabled: !!cfg.enabled, daily_limit: Math.max(1, Math.min(500, Number(cfg.daily_limit) || 40)), weekly_target: Math.max(0, Number(cfg.weekly_target) || 0), extra_personality: String(cfg.extra_personality ?? '').slice(0, 500) }
    const { error } = await supabase.from('leo_settings').upsert({ key: 'config', value, updated_at: new Date().toISOString() }); setMsg(error ? '❌ ' + error.message : '✅ LEO settings saved')
  }
  const saveRule = async () => {
    if (!f.title.trim() || !f.body.trim()) return setMsg('❌ Title and text are required.')
    const row = { title: f.title.trim(), body: f.body.trim(), category: f.category, published: f.published, sort: Number(f.sort) || 0 }
    const { error } = f.id ? await supabase.from('guild_rules').update(row).eq('id', f.id) : await supabase.from('guild_rules').insert({ ...row, created_by: uid })
    setMsg(error ? '❌ ' + error.message : '✅ Rule saved'); if (!error) { setF(blank); loadRules() }
  }
  const togglePub = async (r: any) => { const { error } = await supabase.from('guild_rules').update({ published: !r.published }).eq('id', r.id); setMsg(error ? '❌ ' + error.message : r.published ? 'Unpublished (hidden from members and LEO)' : '✅ Published'); loadRules() }
  const delRule = async (r: any) => { if (!confirm(`Delete "${r.title}"?`)) return; const { error } = await supabase.from('guild_rules').delete().eq('id', r.id); setMsg(error ? '❌ ' + error.message : 'Deleted'); loadRules() }
  const saveMus = async (v: any) => { const { error } = await supabase.from('site_settings').upsert({ key: 'bg_music', value: v, updated_at: new Date().toISOString() }); setMsg(error ? '❌ ' + error.message : '✅ Music saved'); if (!error) setMus(v) }
  const upload = async (file?: File) => {
    if (!file) return; if (file.size > 20 * 1024 * 1024) return setMsg('❌ Music file is too big (max 20 MB).')
    setBusy(true); setMsg('Uploading music…')
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${uid}/music-${Date.now()}.${ext}`
    const up = await supabase.storage.from('social').upload(path, file, { contentType: file.type || 'audio/mpeg' })
    setBusy(false); if (up.error) return setMsg('❌ ' + up.error.message)
    await saveMus({ path, title: file.name.replace(/\.[^.]+$/, ''), enabled: true })
  }
  return (
    <div className="space-y-4">
      {msg && <p className="glass p-3 text-sm">{msg}</p>}

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">🎵 Website background music</h3>
        {mus.path ? <p className="text-sm mb-2">Current: <b>{mus.title}</b> <audio src={pubUrl(mus.path)} controls className="w-full mt-1" /></p> : <p className="text-sm text-gray-400 mb-2">No music yet.</p>}
        <label className="sym-btn inline-block cursor-pointer">{busy ? 'Uploading…' : mus.path ? 'Replace music file' : 'Upload music file'}<input type="file" accept="audio/*" className="hidden" onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} /></label>
        {mus.path && <div className="flex gap-2 mt-2"><button className="sym-btn" onClick={() => saveMus({ ...mus, enabled: !mus.enabled })}>{mus.enabled ? 'Turn music OFF for everyone' : 'Turn music ON for everyone'}</button><button className="sym-btn danger" onClick={() => saveMus({ enabled: false })}>Remove</button></div>}
        <p className="text-xs text-gray-500 mt-2">Members can mute it in Settings. Phones start the sound after the first tap on the page.</p>
      </div>

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">📜 Guild rules & info (LEO reads only the published ones)</h3>
        <input className="sym-inp" placeholder="Title (e.g. Weekly glory target)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <textarea className="sym-inp" rows={4} placeholder="Text (e.g. Members must maintain 3500 weekly glory.)" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
        <div className="flex gap-2 flex-wrap items-center mb-2">
          <select className="sym-inp !w-auto !mb-0" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['rule', 'info', 'faq', 'tournament', 'recruitment'].map(c => <option key={c}>{c}</option>)}</select>
          <input className="sym-inp !w-24 !mb-0" type="number" placeholder="Order" value={f.sort} onChange={e => setF({ ...f, sort: Number(e.target.value) })} />
          <label className="text-sm"><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} /> Published</label>
        </div>
        <div className="flex gap-2"><button className="sym-btn ok" onClick={saveRule}>{f.id ? 'Update rule' : 'Add rule'}</button>{f.id && <button className="sym-btn" onClick={() => setF(blank)}>Cancel edit</button>}</div>
        <div className="mt-3">{rules.map(r => <div key={r.id} className="border-t border-white/10 py-2 text-sm">
          <div><b>{r.title}</b> <span className="text-xs text-gray-400">· {r.category} · {r.published ? '🟢 published' : '⚪ draft'}</span></div>
          <p className="text-gray-400 text-xs line-clamp-2">{r.body}</p>
          <div className="flex gap-2 mt-1"><button className="sym-btn !py-1" onClick={() => { setF(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button><button className="sym-btn !py-1" onClick={() => togglePub(r)}>{r.published ? 'Unpublish' : 'Publish'}</button><button className="sym-btn danger !py-1" onClick={() => delRule(r)}>Delete</button></div>
        </div>)}{!rules.length && <p className="text-xs text-gray-500">No rules yet.</p>}</div>
      </div>

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">🧡 LEO AI settings</h3>
        <label className="row"><span>LEO enabled</span><button className={'sw' + (cfg.enabled ? ' on' : '')} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} /></label>
        <div className="grid grid-cols-2 gap-2 mt-2"><div><small className="text-gray-400">Messages per member per day</small><input className="sym-inp" type="number" value={cfg.daily_limit} onChange={e => setCfg({ ...cfg, daily_limit: e.target.value })} /></div>
          <div><small className="text-gray-400">Weekly glory target (0 = none)</small><input className="sym-inp" type="number" value={cfg.weekly_target} onChange={e => setCfg({ ...cfg, weekly_target: e.target.value })} /></div></div>
        <small className="text-gray-400">Extra personality notes (style only)</small>
        <textarea className="sym-inp" rows={2} maxLength={500} placeholder="e.g. Tease members a little about Free Fire headshots" value={cfg.extra_personality} onChange={e => setCfg({ ...cfg, extra_personality: e.target.value })} />
        <button className="sym-btn ok" onClick={saveCfg}>Save LEO settings</button>
        <button className="sym-btn ml-2" onClick={runTest}>🔧 Test LEO connection</button>
        {test && <div className="mt-2 text-xs rounded bg-black/40 p-2 space-y-1">{test.map((t, i) => <div key={i} className={t.includes('FAIL') || t.startsWith('→') ? 'text-red-300' : 'text-green-300'}>{t}</div>)}</div>}
        {stats && <p className="text-sm mt-3">Usage: <b>{stats.today}</b> messages today · <b>{stats.week}</b> in 7 days · ~<b>{stats.tokens.toLocaleString()}</b> tokens (7 days)</p>}
        {!!errs.length && <div className="mt-2 text-xs text-amber-300"><b>Recent errors</b>{errs.map((e, i) => <div key={i}>{new Date(e.at).toLocaleString()} — {e.msg}</div>)}</div>}
        <p className="text-xs text-gray-500 mt-2">Chats are not stored on the server. The API key lives only in Supabase secrets.</p>
      </div>
    </div>
  )
}
