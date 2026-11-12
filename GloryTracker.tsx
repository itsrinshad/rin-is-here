import { useEffect, useState } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'

export function GloryTracker() {
  const { session } = useAuth(); const uid = session!.user.id
  const [days, setDays] = useState<any[]>([]); const [wk, setWk] = useState<any>(null); const [life, setLife] = useState<any>(null)
  useEffect(() => {
    supabase.from('glory_daily').select('day,gained,total').eq('member_id', uid).order('day', { ascending: false }).limit(30).then(r => setDays(r.data ?? []))
    supabase.from('lb_weekly').select('glory,rnk').eq('member_id', uid).maybeSingle().then(r => setWk(r.data))
    supabase.from('lb_lifetime').select('glory,rnk').eq('member_id', uid).maybeSingle().then(r => setLife(r.data))
  }, [uid])
  const max = Math.max(1, ...days.slice(0, 7).map(d => d.gained))
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Glory Tracker</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className="glass p-3 text-center"><div className="text-xs text-gray-400">This week</div><b className="text-2xl text-cyan-300">{wk?.glory ?? 0}</b><div className="text-xs text-gray-500">{wk?.rnk ? 'Rank #' + wk.rnk : 'No rank yet'}</div></div>
        <div className="glass p-3 text-center"><div className="text-xs text-gray-400">Lifetime</div><b className="text-2xl">{life?.glory ?? 0}</b><div className="text-xs text-gray-500">{life?.rnk ? 'Rank #' + life.rnk : ''}</div></div>
      </div>
      {!!days.length && <div className="glass p-4"><h3 className="font-semibold mb-3 text-sm">Last entries (gain)</h3>
        <div className="flex items-end gap-2 h-28">{days.slice(0, 7).reverse().map(d => <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full"><span className="text-[10px] text-cyan-300">{d.gained}</span><div className="w-full rounded-t" style={{ height: Math.max(4, (d.gained / max) * 80) + '%', background: 'linear-gradient(var(--b),var(--a))' }} /><span className="text-[10px] text-gray-500 mt-1">{String(d.day).slice(5)}</span></div>)}</div></div>}
      <div className="glass p-4"><h3 className="font-semibold mb-2 text-sm">History</h3>
        {!days.length && <p className="text-sm text-gray-500">No glory entries yet.</p>}
        {days.map(d => <div key={d.day} className="row text-sm"><span>{d.day}</span><span className="text-gray-400">total {d.total ?? '—'}</span><b className="text-cyan-300">+{d.gained}</b></div>)}</div>
      <p className="text-xs text-gray-500 text-center">Entries are added by admins. Gain = new total − last saved total.</p>
    </div>
  )
}
