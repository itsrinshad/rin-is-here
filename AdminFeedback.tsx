import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { CATS, STATUS } from './Feedback'

export function AdminFeedback() {
  const [rows, setRows] = useState<any[]>([]); const [sel, setSel] = useState<any>(null); const [msg, setMsg] = useState('')
  const [st, setSt] = useState('pending'); const [resp, setResp] = useState(''); const [feat, setFeat] = useState(false); const [note, setNote] = useState(''); const [likers, setLikers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const load = useCallback(() => {
    supabase.from('community_feed').select('*').order('created_at', { ascending: false }).limit(500).then(r => setRows(r.data ?? []))
    supabase.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(20).then(r => setReports(r.data ?? []))
  }, [])
  useEffect(() => { load() }, [load])
  const open = async (r: any) => {
    setSel(r); setSt(r.status); setResp(r.admin_response ?? ''); setFeat(r.featured); setMsg(''); setNote(''); setLikers([])
    supabase.from('community_admin_notes').select('note').eq('submission_id', r.id).maybeSingle().then(x => setNote(x.data?.note ?? ''))
    supabase.from('community_votes').select('profiles(display_name,username)').eq('submission_id', r.id).then(x => setLikers(x.data ?? []))
  }
  const save = async () => {
    const { error } = await supabase.rpc('community_set_status', { p_id: sel.id, p_status: st, p_response: resp, p_featured: feat })
    if (error) return setMsg('❌ ' + error.message)
    await supabase.from('community_admin_notes').upsert({ submission_id: sel.id, note, updated_at: new Date().toISOString() })
    setMsg('✅ Saved. The member was notified.'); load()
  }
  const removeMsg = async (rp: any) => { const { error } = await supabase.rpc('admin_remove_message', { p_id: rp.target_id, p_reason: 'Reported by a member' }); if (!error) await supabase.from('reports').update({ status: 'closed' }).eq('id', rp.id); setMsg(error ? '❌ ' + error.message : '✅ Message removed'); load() }
  const dismiss = async (rp: any) => { await supabase.from('reports').update({ status: 'closed' }).eq('id', rp.id); load() }
  const by = (c: string) => rows.filter(r => r.category === c).length
  const stats: [string, number][] = [['Total', rows.length], ['Tournament', by('tournament')], ['Bugs', by('bug')], ['Ideas', by('feature')], ['Guild', by('guild')], ['General', by('general')],
    ['Likes', rows.reduce((a, r) => a + r.likes, 0)], ['Comments', rows.reduce((a, r) => a + r.comments, 0)], ['Pending', rows.filter(r => r.status === 'pending').length], ['Completed', rows.filter(r => r.status === 'completed').length]]
  const top = [...rows].sort((a, b) => b.likes - a.likes).slice(0, 3); const disc = [...rows].sort((a, b) => b.comments - a.comments).slice(0, 3)
  return (
    <div className="glass p-4">
      <h3 className="font-semibold mb-2">💡 Community feedback management</h3>
      {msg && <p className="text-sm mb-2">{msg}</p>}
      <div className="grid grid-cols-5 gap-1 text-center mb-3">{stats.map(([k, v]) => <div key={k} className="bg-white/5 rounded-lg py-1"><b className="block">{v}</b><span className="text-[9px] text-gray-400">{k}</span></div>)}</div>
      {!!top.length && <p className="text-xs text-gray-400 mb-1">Most popular: {top.map(t => `${t.title} (♥${t.likes})`).join(' · ')}</p>}
      {!!disc.length && <p className="text-xs text-gray-400 mb-2">Most discussed: {disc.map(t => `${t.title} (💬${t.comments})`).join(' · ')}</p>}
      {!!reports.length && <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-400/30"><b className="text-sm">⚑ Open reports ({reports.length})</b>
        {reports.map(rp => <div key={rp.id} className="text-xs border-t border-white/10 mt-1 pt-1">{rp.target_type} · {new Date(rp.created_at).toLocaleString()}
          <div className="flex gap-2 mt-1">{rp.target_type === 'message' && <button className="sym-btn danger !py-0.5" onClick={() => removeMsg(rp)}>Remove message</button>}{rp.target_type === 'community_comment' && <Link className="sym-btn !py-0.5" to="/feedback">Open board</Link>}<button className="sym-btn !py-0.5" onClick={() => dismiss(rp)}>Dismiss</button></div></div>)}</div>}
      <div className="max-h-64 overflow-y-auto">{rows.slice(0, 80).map(r => <button key={r.id} onClick={() => open(r)} className={'w-full text-left py-2 border-t border-white/10 text-sm ' + (sel?.id === r.id ? 'text-cyan-300' : '')}>
        {CATS[r.category]?.i} {r.title}<span className="block text-[11px] text-gray-500">{STATUS[r.status]?.i} {STATUS[r.status]?.n} · ♥{r.likes} · 💬{r.comments} · {r.author_name || r.author_username}</span></button>)}
        {!rows.length && <p className="text-sm text-gray-500">No submissions yet.</p>}</div>
      {sel && <div className="mt-3 p-3 rounded-xl bg-white/5">
        <b>{sel.title}</b><p className="text-xs text-gray-400 whitespace-pre-wrap my-1">{sel.body}</p>
        <Link to={'/feedback/' + sel.id} className="text-cyan-300 text-xs">Open full discussion →</Link>
        <select className="sym-inp mt-2" value={st} onChange={e => setSt(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.i} {v.n}</option>)}</select>
        <textarea className="sym-inp" rows={3} maxLength={1000} placeholder="Official response (members can see this)" value={resp} onChange={e => setResp(e.target.value)} />
        <textarea className="sym-inp" rows={2} placeholder="Private admin note (members can NOT see this)" value={note} onChange={e => setNote(e.target.value)} />
        <label className="text-sm"><input type="checkbox" checked={feat} onChange={e => setFeat(e.target.checked)} /> ⭐ Featured</label>
        <p className="text-[11px] text-gray-500 mt-1">Liked by ({likers.length}): {likers.map((l: any) => l.profiles?.display_name || l.profiles?.username).join(', ') || '—'}</p>
        <button className="sym-btn ok mt-2 w-full" onClick={save}>Save & notify member</button>
        <p className="text-[11px] text-gray-500 mt-1">Likes never approve anything automatically. You decide.</p>
      </div>}
    </div>
  )
}
