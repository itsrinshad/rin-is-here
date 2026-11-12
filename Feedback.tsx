import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { timeAgo } from './Social'

export const CATS: Record<string, { i: string; n: string }> = {
  tournament: { i: '🏆', n: 'Tournament Request' }, bug: { i: '🐛', n: 'Bug Report' }, feature: { i: '💡', n: 'New Feature Idea' },
  guild: { i: '🎮', n: 'Guild Improvement' }, general: { i: '📢', n: 'General Suggestion' },
}
export const STATUS: Record<string, { i: string; n: string }> = {
  pending: { i: '🟡', n: 'Pending Review' }, consideration: { i: '🔵', n: 'Under Consideration' }, planned: { i: '🟣', n: 'Planned' },
  progress: { i: '🟠', n: 'In Progress' }, completed: { i: '🟢', n: 'Completed' }, rejected: { i: '🔴', n: 'Rejected' }, archived: { i: '⚫', n: 'Archived' },
}
type Row = { id: string; category: string; title: string; body: string; status: string; featured: boolean; admin_response: string | null; created_at: string; author_name: string | null; author_username: string; likes: number; comments: number; liked: boolean }

export function Feedback() {
  const { id } = useParams()
  return id ? <Detail id={id} /> : <Board />
}

function useLike(setRows: (f: (r: Row[]) => Row[]) => void) {
  return async (r: Row, uid: string) => {
    setRows(rs => rs.map(x => x.id === r.id ? { ...x, liked: !r.liked, likes: x.likes + (r.liked ? -1 : 1) } : x))   // instant feedback
    const { error } = r.liked ? await supabase.from('community_votes').delete().eq('submission_id', r.id).eq('user_id', uid) : await supabase.from('community_votes').insert({ submission_id: r.id, user_id: uid })
    if (error) setRows(rs => rs.map(x => x.id === r.id ? { ...x, liked: r.liked, likes: r.likes } : x))
  }
}

function Board() {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate()
  const [rows, setRows] = useState<Row[] | null>(null); const [cat, setCat] = useState('all'); const [st, setSt] = useState('all'); const [sort, setSort] = useState('new'); const [q, setQ] = useState('')
  const [form, setForm] = useState(false); const [f, setF] = useState({ category: 'general', title: '', body: '' }); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => { supabase.from('community_feed').select('*').order('created_at', { ascending: false }).limit(300).then(r => setRows((r.data ?? []) as Row[])) }, [])
  useEffect(() => {
    load(); let t: any
    const ch = supabase.channel('fb-board').on('postgres_changes', { event: '*', schema: 'public', table: 'community_votes' }, () => { clearTimeout(t); t = setTimeout(load, 500) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, () => { clearTimeout(t); t = setTimeout(load, 500) }).subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [load])
  const like = useLike(fn => setRows(r => (r ? fn(r) : r)))
  const list = useMemo(() => {
    let a = (rows ?? []).filter(r => (cat === 'all' || r.category === cat) && (st === 'all' ? r.status !== 'archived' : r.status === st))
    const s = q.trim().toLowerCase(); if (s) a = a.filter(r => (r.title + ' ' + r.body).toLowerCase().includes(s))
    return [...a].sort((x, y) => sort === 'liked' ? y.likes - x.likes : sort === 'discussed' ? y.comments - x.comments : +new Date(y.created_at) - +new Date(x.created_at))
  }, [rows, cat, st, sort, q])
  const submit = async () => {
    setMsg(''); const title = f.title.trim(), body = f.body.trim()
    if (title.length < 3) return setMsg('Title is too short (min 3 characters).'); if (body.length < 10) return setMsg('Please describe it in at least 10 characters.')
    if (title.length > 120 || body.length > 2000) return setMsg('Too long.')
    setBusy(true); const { data, error } = await supabase.from('community_submissions').insert({ author_id: uid, category: f.category, title, body }).select('id').single(); setBusy(false)
    if (error) return setMsg(error.message)
    setF({ category: 'general', title: '', body: '' }); setForm(false); load(); if (data) nav('/feedback/' + data.id)
  }
  const top = rows ? [...rows].filter(r => r.status !== 'archived').sort((a, b) => b.likes - a.likes).slice(0, 3).filter(r => r.likes > 0) : []
  return (
    <div className="space-y-3">
      <div className="flex items-center"><h2 className="text-xl font-bold">Community Feedback</h2><span className="ml-auto" /><button className="sym-btn" onClick={() => setForm(!form)}>{form ? 'Close' : '+ New request'}</button></div>
      {form && <div className="glass p-4">
        <select className="sym-inp" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.i} {v.n}</option>)}</select>
        <input className="sym-inp" maxLength={120} placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <textarea className="sym-inp" rows={5} maxLength={2000} placeholder="Describe it in detail…" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
        <button className="sym-btn ok w-full" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Submit'}</button>{msg && <p className="text-amber-300 text-sm mt-2">{msg}</p>}
        <p className="text-xs text-gray-500 mt-2">Max 5 requests per day. Admins make the final decision on every request.</p></div>}
      {!!top.length && <div className="glass p-3"><b className="text-sm">🔥 Most liked</b>{top.map(t => <Link key={t.id} to={'/feedback/' + t.id} className="flex justify-between text-sm py-1 border-t border-white/10 mt-1"><span className="truncate">{CATS[t.category]?.i} {t.title}</span><span className="text-cyan-300 flex-none ml-2">♥ {t.likes}</span></Link>)}</div>}
      <input className="sym-inp" placeholder="Search requests…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <select className="sym-inp !mb-0 !text-xs" value={cat} onChange={e => setCat(e.target.value)}><option value="all">All categories</option>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.i} {v.n}</option>)}</select>
        <select className="sym-inp !mb-0 !text-xs" value={st} onChange={e => setSt(e.target.value)}><option value="all">Active</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.i} {v.n}</option>)}</select>
        <select className="sym-inp !mb-0 !text-xs" value={sort} onChange={e => setSort(e.target.value)}><option value="new">Newest</option><option value="liked">Most liked</option><option value="discussed">Most discussed</option></select>
      </div>
      {rows === null && <p className="text-center text-gray-400">Loading…</p>}
      {rows && !list.length && <div className="glass p-6 text-center text-gray-400 text-sm">Nothing here yet. Be the first to post an idea!</div>}
      {list.map(r => (
        <div key={r.id} className="glass p-3">
          <div className="flex items-center gap-2 text-xs"><span>{CATS[r.category]?.i} {CATS[r.category]?.n}</span><span className="ml-auto chipx">{STATUS[r.status]?.i} {STATUS[r.status]?.n}</span></div>
          <Link to={'/feedback/' + r.id} className="block font-semibold mt-1">{r.featured && '⭐ '}{r.title}</Link>
          <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">{r.body}</p>
          <div className="text-[11px] text-gray-500 mt-1">{r.author_name || r.author_username} · {timeAgo(r.created_at)}</div>
          <div className="flex items-center gap-2 mt-2">
            <button className={'sym-btn !py-1 !px-3 ' + (r.liked ? '' : 'opacity-70')} onClick={() => like(r, uid)}>{r.liked ? '♥' : '♡'} {r.likes}</button>
            <span className="text-sm text-gray-400">💬 {r.comments}</span><Link to={'/feedback/' + r.id} className="ml-auto text-cyan-300 text-sm">View details →</Link>
          </div>
        </div>))}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id
  const [r, setR] = useState<Row | null | undefined>(undefined); const [cs, setCs] = useState<any[]>([]); const [txt, setTxt] = useState(''); const [msg, setMsg] = useState('')
  const load = useCallback(() => {
    supabase.from('community_feed').select('*').eq('id', id).maybeSingle().then(x => setR((x.data as Row) ?? null))
    supabase.from('community_comments').select('id,body,removed,created_at,author_id,profiles(display_name,username)').eq('submission_id', id).order('created_at').then(x => setCs(x.data ?? []))
  }, [id])
  useEffect(() => {
    load(); const ch = supabase.channel('fb-' + id).on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments', filter: 'submission_id=eq.' + id }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'community_votes', filter: 'submission_id=eq.' + id }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, load])
  const like = useLike(fn => setR(x => (x ? fn([x])[0] : x)))
  const send = async () => {
    const body = txt.trim(); if (!body) return; if (body.length > 600) return setMsg('Comment is too long (max 600).')
    const { error } = await supabase.from('community_comments').insert({ submission_id: id, author_id: uid, body }); setMsg(error?.message ?? ''); if (!error) { setTxt(''); load() }
  }
  const report = async (cid: string) => { const { error } = await supabase.from('reports').insert({ reporter: uid, target_type: 'community_comment', target_id: cid, reason: 'Reported from feedback board' }); setMsg(error ? error.message : 'Reported to the admins. Thank you!') }
  const modRemove = async (cid: string) => { if (!confirm('Remove this comment?')) return; const { error } = await supabase.rpc('admin_remove_comment', { p_id: cid }); setMsg(error?.message ?? 'Removed'); load() }
  if (r === undefined) return <p className="text-center text-gray-400 mt-10">Loading…</p>
  if (r === null) return <div className="glass p-6 text-center">Request not found. <Link to="/feedback" className="text-cyan-300">Back</Link></div>
  return (
    <div className="space-y-3">
      <Link to="/feedback" className="text-cyan-300 text-sm">‹ All requests</Link>
      <div className="glass p-4">
        <div className="flex items-center gap-2 text-xs"><span>{CATS[r.category]?.i} {CATS[r.category]?.n}</span><span className="ml-auto chipx">{STATUS[r.status]?.i} {STATUS[r.status]?.n}</span></div>
        <h2 className="text-lg font-bold mt-1">{r.featured && '⭐ '}{r.title}</h2>
        <div className="text-[11px] text-gray-500 mb-2">{r.author_name || r.author_username} · {new Date(r.created_at).toLocaleString()}</div>
        <p className="text-sm whitespace-pre-wrap">{r.body}</p>
        <button className={'sym-btn mt-3 ' + (r.liked ? '' : 'opacity-70')} onClick={() => like(r, uid)}>{r.liked ? '♥ Liked' : '♡ Like'} · {r.likes}</button>
      </div>
      {r.admin_response && <div className="glass p-4 border-amber-400/50"><b className="text-amber-300 text-sm">🛡 Official response</b><p className="text-sm whitespace-pre-wrap mt-1">{r.admin_response}</p></div>}
      <div className="glass p-4"><h3 className="font-semibold mb-2 text-sm">💬 Discussion ({cs.filter(c => !c.removed).length})</h3>
        {!cs.length && <p className="text-sm text-gray-500">No comments yet.</p>}
        {cs.map(c => <div key={c.id} className="border-t border-white/10 py-2 text-sm">
          {c.removed ? <i className="text-gray-500">Removed by moderator.</i> : <><b className="text-cyan-300 text-xs">{c.profiles?.display_name || c.profiles?.username || 'member'}</b> <span className="text-[10px] text-gray-500">{timeAgo(c.created_at)}</span><p className="whitespace-pre-wrap">{c.body}</p>
            <div className="flex gap-3 text-[11px] text-gray-500">{c.author_id !== uid && <button onClick={() => report(c.id)}>⚑ Report</button>}{isAdmin && <button className="text-red-400" onClick={() => modRemove(c.id)}>Remove</button>}</div></>}
        </div>)}
        <div className="flex gap-2 mt-3"><input className="sym-inp !mb-0" maxLength={600} placeholder="Write a comment…" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} /><button className="sym-btn" onClick={send}>Send</button></div>
        {msg && <p className="text-amber-300 text-xs mt-2">{msg}</p>}
      </div>
    </div>
  )
}
