import { useEffect, useState } from 'react'
import { supabase } from './lib'

const CAT: Record<string, string> = { rule: '📜 Rules', info: 'ℹ️ Info', faq: '❓ FAQ', tournament: '🏆 Tournaments', recruitment: '🤝 Recruitment' }
export function Rules() {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => { supabase.from('guild_rules').select('id,title,body,category,sort,updated_at').eq('published', true).order('sort').order('updated_at', { ascending: false }).then(r => setRows(r.data ?? [])) }, [])
  if (!rows) return <p className="text-center text-gray-400 mt-10">Loading…</p>
  const cats = Object.keys(CAT).filter(c => rows.some(r => r.category === c))
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Guild rules & info</h2>
      {!rows.length && <div className="glass p-6 text-center text-gray-400 text-sm">No rules published yet.</div>}
      {cats.map(c => <div key={c} className="glass p-4"><h3 className="font-semibold mb-2">{CAT[c]}</h3>
        {rows.filter(r => r.category === c).map(r => <details key={r.id} className="py-2 border-t border-white/10 first:border-0"><summary className="cursor-pointer font-medium">{r.title === 'GUILD_ORIGIN_STORY' ? '📖 Our Story' : r.title}</summary><p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{r.body}</p></details>)}
      </div>)}
      <p className="text-xs text-gray-500 text-center">Ask LEO (the orange mascot) if you have questions about the rules.</p>
    </div>
  )
}
