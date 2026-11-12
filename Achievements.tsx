import { useEffect, useState } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'
import { BADGE_ICON } from './Social'

export function Achievements() {
  const { session } = useAuth(); const uid = session!.user.id
  const [all, setAll] = useState<any[]>([]); const [mine, setMine] = useState<any[]>([])
  useEffect(() => {
    supabase.from('badges').select('id,code,name,description').order('id').then(r => setAll(r.data ?? []))
    supabase.from('member_badges').select('badge_id,awarded_at').eq('member_id', uid).then(r => setMine(r.data ?? []))
  }, [uid])
  const got = new Map(mine.map(m => [m.badge_id, m.awarded_at]))
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Achievements <span className="text-sm text-gray-400">{got.size}/{all.length}</span></h2>
      {!all.length && <div className="glass p-6 text-center text-gray-400 text-sm">No achievements defined yet.</div>}
      <div className="grid grid-cols-2 gap-2">{all.map(b => { const has = got.has(b.id); return (
        <div key={b.id} className={'glass p-3 text-center ' + (has ? '' : 'opacity-40')}>
          <div className="text-3xl">{(BADGE_ICON as any)?.[b.code] ?? '🎖️'}</div><b className="text-sm block">{b.name}</b>
          <p className="text-[11px] text-gray-400">{b.description}</p>{has && <p className="text-[10px] text-cyan-300 mt-1">Awarded {new Date(got.get(b.id)!).toLocaleDateString()}</p>}
        </div>) })}</div>
      <p className="text-xs text-gray-500 text-center">Achievements are awarded by admins.</p>
    </div>
  )
}
