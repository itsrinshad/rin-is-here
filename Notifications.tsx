import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { timeAgo } from './Social'

export function Notifications() {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate()
  const [rows, setRows] = useState<any[] | null>(null)
  const load = useCallback(() => { supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60).then(r => setRows(r.data ?? [])) }, [uid])
  useEffect(() => { load(); const ch = supabase.channel('notif-page').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid }, load).subscribe(); return () => { supabase.removeChannel(ch) } }, [load, uid])
  const open = async (n: any) => { if (!n.read) { await supabase.from('notifications').update({ read: true }).eq('id', n.id); window.dispatchEvent(new Event('sym-notif')) } if (n.link) nav(n.link); else load() }
  const readAll = async () => { await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false); window.dispatchEvent(new Event('sym-notif')); load() }
  if (!rows) return <p className="text-center text-gray-400 mt-10">Loading…</p>
  const unread = rows.filter(r => !r.read).length
  return (
    <div className="space-y-3">
      <div className="flex items-center"><h2 className="text-xl font-bold">Notifications</h2><span className="ml-auto" />{unread > 0 && <button className="sym-btn !py-1" onClick={readAll}>Mark all read ({unread})</button>}</div>
      {!rows.length && <div className="glass p-6 text-center text-gray-400 text-sm">No notifications yet.</div>}
      {rows.map(n => (
        <button key={n.id} onClick={() => open(n)} className={'glass p-3 w-full text-left block ' + (n.read ? 'opacity-70' : 'border-cyan-400/50')}>
          <div className="flex items-center gap-2">{!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 flex-none" />}<b className="text-sm truncate">{n.title || n.type}</b><span className="ml-auto text-xs text-gray-500 flex-none">{timeAgo(n.created_at)}</span></div>
          {n.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.body}</p>}
        </button>))}
    </div>
  )
}
