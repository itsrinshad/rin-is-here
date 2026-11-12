import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Avatar } from './Social'
import { Logo } from './Symbiote'
import { waLink, waGroup, igLink, WaIcon, IgIcon, PhoneIcon } from './ui'

export function GuildLinks({ admin }: { admin?: boolean }) {
  const [l, setL] = useState<any>(null)
  useEffect(() => { supabase.from('site_settings').select('value').eq('key', 'guild_links').maybeSingle().then(r => setL(r.data?.value ?? {})) }, [])
  if (!l) return null
  const items = [
    { h: waGroup(l.wa_group), t: 'WhatsApp Group', c: 'g-wa', i: <WaIcon /> },
    { h: igLink(l.ig_group), t: 'Instagram Group', c: 'g-ig', i: <IgIcon /> },
    { h: igLink(l.ig_page), t: 'Instagram Page', c: 'g-ig', i: <IgIcon /> },
    { h: waLink(l.admin_wa), t: 'Contact Admin', c: 'g-ct', i: <PhoneIcon /> },
  ].filter(x => x.h)
  if (!items.length) return admin ? <div className="glass p-3 text-xs text-gray-400 text-center">Add your WhatsApp/Instagram links in Admin → Guild links.</div> : null
  return <div className="glinks">{items.map(x => <a key={x.t} href={x.h} target="_blank" rel="noreferrer" className={'gbtn ' + x.c}>{x.i}{x.t}</a>)}</div>
}


export function Home() {
  const { session, profile, isAdmin } = useAuth(); const uid = session?.user.id
  const [stat, setStat] = useState<any>(null); const [top, setTop] = useState<any[]>([]); const [mine, setMine] = useState<any>(null); const [news, setNews] = useState<any[]>([])
  useEffect(() => {
    supabase.from('guild_stats').select('*').maybeSingle().then(r => setStat(r.data))
    supabase.from('lb_weekly').select('member_id,username,display_name,avatar_url,glory,rnk').order('rnk').limit(3).then(r => setTop(r.data ?? []))
    if (!uid) return
    supabase.from('lb_weekly').select('glory,rnk').eq('member_id', uid).maybeSingle().then(r => setMine(r.data))
    supabase.from('announcements').select('*').order('publish_at', { ascending: false }).limit(2).then(r => setNews(r.data ?? []))
  }, [uid])
  const podium = (
    <div className="glass p-4">
      <h3 className="font-semibold mb-3">🏆 Top 3 this week</h3>
      {!top.length ? <p className="text-sm text-gray-500">No glory recorded yet this week.</p> :
        <div className="flex items-end justify-center gap-3">{[top[1], top[0], top[2]].map((t, i) => t && (
          <Link key={t.member_id} to={session ? `/u/${t.username}` : '/leaderboard'} className="flex flex-col items-center text-center" style={{ width: '30%' }}>
            <span className="text-xl">{['🥈', '🥇', '🥉'][i]}</span>
            <Avatar url={t.avatar_url} name={t.display_name || t.username} size={i === 1 ? 62 : 48} ring="none" />
            <b className="text-xs mt-1 truncate w-full">{t.display_name || t.username}</b><span className="text-xs text-cyan-300">{t.glory}</span>
          </Link>))}</div>}
    </div>
  )
  if (!session) return (
    <div className="space-y-3 mt-4">
      <div className="glass p-6 text-center space-y-3"><Logo size={30} /><p className="text-gray-300 text-sm">Official SYMBIOTES guild website. Accounts are created by the admin.</p>
        <div className="flex gap-2 justify-center"><Link to="/login" className="sym-btn">Member login</Link><Link to="/admin-login" className="sym-btn">Admin</Link></div></div>
      <GuildLinks />{podium}
    </div>
  )
  const name = profile?.display_name || profile?.username
  return (
    <div className="space-y-3">
      <div className="glass p-4 flex items-center gap-3">
        <Avatar url={profile?.avatar_url} name={name} size={56} />
        <div className="flex-1 min-w-0"><div className="text-xs text-gray-400">Welcome back</div><b className="text-lg truncate block">{name}</b></div>
        <div className="text-center"><b className="text-xl text-cyan-300">{mine?.glory ?? 0}</b><div className="text-[10px] text-gray-400">WEEKLY GLORY</div></div>
        <div className="text-center"><b className="text-xl">{mine?.rnk ? '#' + mine.rnk : '—'}</b><div className="text-[10px] text-gray-400">RANK</div></div>
      </div>
      <div className="chips">
        <Link to="/leaderboard">🏆 Rank</Link><Link to="/rules">📜 Rules</Link><Link to="/announcements">📢 News</Link><Link to="/polls">🗳 Polls</Link><Link to="/members">👥 Members</Link>{isAdmin && <Link to="/admin/glory">⚡ Glory</Link>}
      </div>
      <GuildLinks admin={isAdmin} />
      {podium}
      {stat && <div className="grid grid-cols-2 gap-2"><div className="glass p-3 text-center text-xs text-gray-400">Members<br /><b className="text-xl text-white">{stat.members}</b></div><div className="glass p-3 text-center text-xs text-gray-400">Total glory<br /><b className="text-xl text-white">{Number(stat.total_glory).toLocaleString()}</b></div></div>}
      {!!news.length && <div className="glass p-4"><h3 className="font-semibold mb-2">📢 Latest news</h3>{news.map((n: any) => <div key={n.id} className="border-t border-white/10 first:border-0 py-2"><b className="text-sm">{n.title}</b><p className="text-xs text-gray-400 line-clamp-2 whitespace-pre-wrap">{n.body}</p></div>)}<Link to="/announcements" className="text-cyan-300 text-xs">All news →</Link></div>}
    </div>
  )
}
