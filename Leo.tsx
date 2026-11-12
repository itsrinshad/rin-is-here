import { useEffect, useRef, useState, type ReactElement } from 'react'
import { supabase } from './lib'
import { useAuth } from './auth'
import { getPrefs, setPrefs } from './prefs'
import { callLeo } from './leoApi'

const INK = '#4a210a', OR = '#f28c28', OR2 = '#d9701a', RED = '#7a1f12'
type Cfg = { l: string; r: string; mouth: string; brow?: string; extra?: string[]; anim?: string; wave?: boolean }
const CFG: Record<string, Cfg> = {
  normal: { l: 'open', r: 'open', mouth: 'smile' }, happy: { l: 'arc', r: 'arc', mouth: 'grin' },
  very_happy: { l: 'arc', r: 'arc', mouth: 'open', extra: ['blush'], anim: 'hop' }, laughing: { l: 'arc', r: 'arc', mouth: 'open', extra: ['joy'], anim: 'shake' },
  sad: { l: 'down', r: 'down', mouth: 'frown', brow: 'sad' }, crying: { l: 'down', r: 'down', mouth: 'frown', brow: 'sad', extra: ['tears'] },
  angry: { l: 'open', r: 'open', mouth: 'frown', brow: 'angry', extra: ['vein'] }, surprised: { l: 'wide', r: 'wide', mouth: 'o', brow: 'up' },
  shocked: { l: 'wide', r: 'wide', mouth: 'o', brow: 'up', extra: ['sweat'], anim: 'shake' }, confused: { l: 'open', r: 'open', mouth: 'wavy', brow: 'one', extra: ['q'] },
  thinking: { l: 'up', r: 'up', mouth: 'side', brow: 'one', extra: ['dots'] }, excited: { l: 'wide', r: 'wide', mouth: 'open', extra: ['spark'], anim: 'hop' },
  sleepy: { l: 'closed', r: 'closed', mouth: 'small', extra: ['zzz'] }, winking: { l: 'open', r: 'arc', mouth: 'grin' },
  shy: { l: 'down', r: 'down', mouth: 'smile2', extra: ['blush'] }, celebrating: { l: 'arc', r: 'arc', mouth: 'open', extra: ['spark'], anim: 'hop', wave: true },
  welcoming: { l: 'open', r: 'open', mouth: 'grin', wave: true }, disappointed: { l: 'down', r: 'down', mouth: 'flat', brow: 'sad' },
}
export const EMOTIONS = Object.keys(CFG)

function Eye({ x, k }: { x: number; k: string }) {
  const y = 56
  if (k === 'arc') return <path d={`M${x - 8} ${y + 4} Q${x} ${y - 9} ${x + 8} ${y + 4}`} fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
  if (k === 'closed') return <path d={`M${x - 8} ${y} Q${x} ${y + 6} ${x + 8} ${y}`} fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
  const w = k === 'wide'; const dy = k === 'down' ? 4 : k === 'up' ? -3 : 1
  return (<g className="leo-blink"><ellipse cx={x} cy={y} rx={w ? 10 : 8.5} ry={w ? 12.5 : 10.5} fill="#fff8ea" stroke={INK} strokeWidth="2.6" />
    <circle cx={x} cy={y + dy} r={w ? 3.6 : 5.2} fill={INK} /><circle cx={x + 1.6} cy={y + dy - 1.8} r="1.5" fill="#fff" /></g>)
}
const MOUTH: Record<string, ReactElement> = {
  smile: <path d="M51 80 Q60 86 69 80" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  grin: <path d="M47 77 Q60 93 73 77" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />,
  open: <><path d="M46 76 Q60 99 74 76 Z" fill={RED} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" /><ellipse cx="60" cy="87" rx="6" ry="3.2" fill="#ff8a7a" /></>,
  frown: <path d="M51 87 Q60 79 69 87" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  o: <ellipse cx="60" cy="84" rx="5.5" ry="7" fill={RED} stroke={INK} strokeWidth="2.4" />,
  wavy: <path d="M49 83 q5 -5 10 0 t10 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  side: <path d="M54 83 Q60 80 69 85" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  small: <path d="M55 83 Q60 86 65 83" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  smile2: <path d="M53 81 Q60 87 67 81" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
  flat: <path d="M52 84 H68" stroke={INK} strokeWidth="3" strokeLinecap="round" />,
}
const BROW: Record<string, ReactElement> = {
  sad: <><path d="M36 47 L52 41" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M68 41 L84 47" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>,
  angry: <><path d="M36 41 L52 47" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /><path d="M68 47 L84 41" stroke={INK} strokeWidth="3.4" strokeLinecap="round" /></>,
  up: <><path d="M38 38 Q45 32 52 38" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M68 38 Q75 32 82 38" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>,
  one: <><path d="M38 43 H52" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M68 36 Q75 30 82 37" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>,
}
const EXTRA: Record<string, ReactElement> = {
  blush: <><circle cx="35" cy="72" r="5.5" fill="#ff6b6b" opacity=".5" /><circle cx="85" cy="72" r="5.5" fill="#ff6b6b" opacity=".5" /></>,
  tears: <><path d="M40 68 q-4 9 0 12 q4 -3 0 -12z" fill="#5bc8ff" /><path d="M80 68 q-4 9 0 12 q4 -3 0 -12z" fill="#5bc8ff" /></>,
  joy: <><path d="M32 62 q-6 6 -2 10 q5 -2 2 -10z" fill="#5bc8ff" /><path d="M88 62 q6 6 2 10 q-5 -2 -2 -10z" fill="#5bc8ff" /></>,
  sweat: <path d="M92 34 q-5 9 0 12 q5 -3 0 -12z" fill="#5bc8ff" />,
  vein: <path d="M84 30 l6 6 m0 -6 l-6 6" stroke="#e11d48" strokeWidth="2.6" strokeLinecap="round" />,
  q: <text x="88" y="34" fontSize="24" fontWeight="800" fill="#fff">?</text>,
  dots: <><circle cx="90" cy="30" r="2.6" fill="#fff" /><circle cx="98" cy="24" r="3.4" fill="#fff" /><circle cx="108" cy="16" r="4.4" fill="#fff" /></>,
  spark: <><text x="14" y="26" fontSize="16" fill="#ffe14d">✦</text><text x="96" y="20" fontSize="20" fill="#ffe14d">✦</text><text x="102" y="60" fontSize="12" fill="#fff">✦</text></>,
  zzz: <><text x="88" y="34" fontSize="16" fontWeight="800" fill="#cbd5ff">z</text><text x="98" y="22" fontSize="12" fontWeight="800" fill="#cbd5ff">z</text></>,
}

export function Leo({ emotion = 'normal', size = 80, talking = false }: { emotion?: string; size?: number; talking?: boolean }) {
  const c = CFG[emotion] ?? CFG.normal
  return (
    <svg className="leo-svg" viewBox="0 0 120 150" width={size} height={size * 1.25} aria-label="LEO">
      <ellipse cx="60" cy="144" rx="24" ry="4" fill="rgba(0,0,0,.35)" />
      <g className={c.anim === 'hop' ? 'leo-hop' : c.anim === 'shake' ? 'leo-shake' : 'leo-bob'}>
        <path d="M48 104 L46 130 M72 104 L74 130" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="43" cy="134" rx="10" ry="5.5" fill={OR2} stroke={INK} strokeWidth="2.5" /><ellipse cx="77" cy="134" rx="10" ry="5.5" fill={OR2} stroke={INK} strokeWidth="2.5" />
        <path d="M21 76 Q8 82 7 99" fill="none" stroke={OR} strokeWidth="6" strokeLinecap="round" /><circle cx="7" cy="101" r="6.5" fill="#fff8ea" stroke={INK} strokeWidth="2.4" />
        {c.wave
          ? <g className="leo-wave"><path d="M99 76 Q116 66 113 50" fill="none" stroke={OR} strokeWidth="6" strokeLinecap="round" /><circle cx="113" cy="47" r="6.5" fill="#fff8ea" stroke={INK} strokeWidth="2.4" /></g>
          : <><path d="M99 76 Q112 82 113 99" fill="none" stroke={OR} strokeWidth="6" strokeLinecap="round" /><circle cx="113" cy="101" r="6.5" fill="#fff8ea" stroke={INK} strokeWidth="2.4" /></>}
        <circle cx="60" cy="62" r="42" fill={OR} stroke={INK} strokeWidth="3.6" />
        <path d="M94 48 A42 42 0 0 1 84 96" fill="none" stroke={OR2} strokeWidth="7" strokeLinecap="round" opacity=".7" />
        <path d="M28 44 Q36 26 58 22" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="5" strokeLinecap="round" />
        <Eye x={44} k={c.l} /><Eye x={76} k={c.r} />
        {c.brow && BROW[c.brow]}
        <circle cx="60" cy="68" r="2.6" fill={INK} />
        <g className={talking ? 'leo-talk' : undefined}>{MOUTH[c.mouth]}</g>
        {c.extra?.map(e => <g key={e}>{EXTRA[e]}</g>)}
      </g>
    </svg>
  )
}

const JOKES = ['Njan joke paranjal guild motham chirich marikkum! 😂 Pakshe aadyam ninte headshot onn kaanikk!', 'Enthaanu Free Fire player-nte favourite subject? Geography… karanam avan eppozhum "zone"-il aanu! 😂', 'Bot enthina match-il pokunne? Real players-ne kanan! 😂 Ninakk athu pattilla alle? 😜']
async function lite(q: string, uid: string, name: string): Promise<{ text: string; emotion: string } | null> {
  const s = q.toLowerCase().trim()
  if (/^(hi|hello|hey|hai|edaa|eda|yo|namaste)\b/.test(s)) return { text: `Edaa ${name}! 😁 Njan LEO. Rules, glory, guild story — entha venelum chodikko!`, emotion: 'welcoming' }
  if (/(joke|funny|chirip|comedy)/.test(s)) return { text: JOKES[Math.floor(Math.random() * JOKES.length)], emotion: 'laughing' }
  if (/(founder|founded|founding|creator|created|who made|made the|rinshad|\brin\b|shahil|hemanadh|shammas|sathya)/.test(s)) return { text: 'SYMBIOTES founders: RIN and SHAHIL. Founding members: HEMANADH, SHAMMAS and SATHYA. The website was created by RIN (RINSHAD), and SHAHIL is also a back supporter. Tap 📖 OUR STORY to hear the full story! 🧡', emotion: 'celebrating' }
  if (/(history|story|origin|meaning|means|why.*guild|enthina)/.test(s)) return { text: 'SYMBIOTES means connection: different players, one united family. Tap the 📖 OUR STORY button and I will tell you the whole story! 🧡', emotion: 'happy' }
  if (/(glory|weekly|top player|leader|rank|leading)/.test(s)) {
    const [top, mine] = await Promise.all([supabase.from('lb_weekly').select('username,display_name,glory,rnk').order('rnk').limit(3), supabase.from('lb_weekly').select('glory,rnk').eq('member_id', uid).maybeSingle()])
    if (top.error || !top.data?.length) return { text: 'No glory is recorded yet this week.', emotion: 'thinking' }
    const t = top.data.map((r: any) => `#${r.rnk} ${r.display_name || r.username} (${r.glory})`).join(', ')
    return { text: `This week's top: ${t}.` + (mine.data ? ` Your weekly glory: ${mine.data.glory} (rank #${mine.data.rnk}).` : ' You have no glory recorded this week yet.'), emotion: 'excited' }
  }
  const rules = await supabase.from('guild_rules').select('title,body').eq('published', true).limit(60)
  if (rules.error) return null
  const rows = rules.data ?? []
  const words = s.split(/[^a-z0-9\u0D00-\u0D7F]+/).filter(w => w.length > 2 && !['the', 'and', 'what', 'are', 'our', 'how', 'who', 'for', 'tell', 'about'].includes(w))
  const scored = rows.map((r: any) => ({ r, n: words.filter(w => (r.title + ' ' + r.body).toLowerCase().includes(w)).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 2)
  if (scored.length) return { text: scored.map(x => `${x.r.title}: ${String(x.r.body).slice(0, 280)}`).join('\n\n'), emotion: 'normal' }
  if (/(rule|niyam|guideline)/.test(s)) return { text: rows.length ? 'Published info: ' + rows.slice(0, 8).map((r: any) => r.title).join(', ') + '. Ask me about any of them, or open Guild Rules in the menu.' : 'No rules are published yet. The admins will add them soon.', emotion: 'normal' }
  return null
}
const STORY: [string, string][] = [
  ['Every family has a beginning. Every legend has a first chapter.', 'welcoming'],
  ['SYMBIOTES started with an idea, a friendship and a shared passion for gaming.', 'happy'],
  ['The guild was founded by RIN and SHAHIL, alongside the founding members HEMANADH, SHAMMAS and SATHYA.', 'celebrating'],
  ['What started as a small group of players became something bigger: a family built on friendship, teamwork, loyalty and the desire to grow together.', 'very_happy'],
  ['The name SYMBIOTES represents connection. Different players, different personalities, but one united family.', 'thinking'],
  ['The goal was never just to collect players or win matches. It was to create a place where everyone could improve, compete, support each other and make unforgettable memories.', 'excited'],
  ['RIN (RINSHAD), the guild founder, also created the SYMBIOTES website to bring the family closer through technology.', 'winking'],
  ["Today, every new member becomes part of this continuing story. We don't just play together. We grow together.", 'happy'],
  ['WE ARE SYMBIOTES. 🧡', 'celebrating'],
]
const SUG = ['What are our guild rules?', 'Explain the glory system', 'Who is the weekly top player?', 'How much glory do I need this week?', 'How do I update my profile?', 'How can I contact an admin?', 'Tell me something funny', "Let's chat!"]
const MSG = {
  offline: 'Oops! Njan ippo offline aanu bro 😅 Kurach kazhinj try cheyyu!',
  limit: 'Innathe chat limit theernnu bro 😅 Naale veendum varu!',
  off: 'Njan ippo rest edukkuvaanu 😴 Admin LEO off aakki vechirikkuka aanu.',
  restricted: 'Athu private information aanu bro. Ath access cheyyan enikk permission illa!',
}
type M = { role: 'user' | 'assistant'; content: string; emotion?: string }

export function LeoWidget() {
  const { session, profile, isAdmin } = useAuth()
  const [adminOn, setAdminOn] = useState(true); const [pref, setPref] = useState(getPrefs().leo)
  const [open, setOpen] = useState(false); const [big, setBig] = useState(false)
  const [msgs, setMsgs] = useState<M[]>(() => { try { return JSON.parse(sessionStorage.getItem('leo_msgs') || '[]') } catch { return [] } })
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [idle, setIdle] = useState('normal')
  const endRef = useRef<HTMLDivElement>(null); const [talk, setTalk] = useState(false)
  const [voice, setVoice] = useState(getPrefs().voice)
  useEffect(() => { const f = () => { setPref(getPrefs().leo); setVoice(getPrefs().voice) }; window.addEventListener('sym-prefs', f); return () => window.removeEventListener('sym-prefs', f) }, [])
  useEffect(() => {
    if (!session) return
    supabase.from('leo_settings').select('value').eq('key', 'config').maybeSingle().then(r => { if (r.data?.value && r.data.value.enabled === false) setAdminOn(false) })
  }, [session])
  useEffect(() => { try { sessionStorage.setItem('leo_msgs', JSON.stringify(msgs.slice(-30))) } catch { /* ignore */ } endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy, open])
  useEffect(() => {
    if (open) return
    const opts = ['happy', 'winking', 'welcoming', 'shy', 'very_happy']
    const t = setInterval(() => { setIdle(opts[Math.floor(Math.random() * opts.length)]); setTimeout(() => setIdle('normal'), 2600) }, 9000)
    return () => clearInterval(t)
  }, [open])
  if (!session || !adminOn || !pref) return null
  const name = profile?.display_name || profile?.username || 'bro'
  const last = [...msgs].reverse().find(m => m.role === 'assistant')
  const send = async (raw: string) => {
    const t = raw.trim(); if (!t || busy) return
    const next: M[] = [...msgs, { role: 'user', content: t.slice(0, 600) }]; setMsgs(next); setText(''); setBusy(true)
    const say = (content: string, emotion: string) => { setMsgs(m => [...m, { role: 'assistant', content, emotion }]); speak(content) }
    const offlineReply = async (detail: string) => {
      const a = await lite(t, session!.user.id, profile?.display_name || profile?.username || 'bro').catch(() => null)
      const dbg = isAdmin ? `\n\n[admin debug] ${detail}\nLEO is in lite mode because the AI function (smart-responder) is not connected. Admin > LEO settings > Test LEO connection.` : ''
      if (a) say(a.text + dbg, a.emotion); else say(MSG.offline + dbg, 'sad')
    }
    try {
      const call = callLeo({ messages: next.slice(-12).map(m => ({ role: m.role, content: m.content })) })
      const { data, error } = await Promise.race([call, new Promise<any>((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))])
      if (error) {
        let code = 'offline'; let detail = String((error as any).message ?? error)
        try { const j = await (error as any).context?.json?.(); code = j?.error || code; if (j?.detail) detail = j.detail } catch { /* ignore */ }
        if (code === 'limit') say(MSG.limit, 'sad'); else if (code === 'disabled') say(MSG.off, 'sleepy'); else if (code === 'restricted') say(MSG.restricted, 'shy'); else await offlineReply(detail)
      } else if (data?.error) {
        const c = data.error
        if (c === 'limit') say(MSG.limit, 'sad'); else if (c === 'disabled') say(MSG.off, 'sleepy'); else if (c === 'restricted') say(MSG.restricted, 'shy'); else await offlineReply(String(data.detail ?? c))
      } else if (data?.reply) say(String(data.reply), CFG[data.emotion] ? data.emotion : 'normal')
      else await offlineReply('empty reply')
    } catch (e) { await offlineReply(String(e).slice(0, 160)) }
    setBusy(false)
  }
  const speak = (t: string): Promise<void> => new Promise(res => {
    const clean = t.replace(/\[admin (?:debug|info)[\s\S]*$/, '').replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400)
    if (!clean || !getPrefs().voice || !('speechSynthesis' in window)) return res()
    const synth = window.speechSynthesis; synth.cancel()
    const ml = /[\u0D00-\u0D7F]/.test(clean); const vs = synth.getVoices()
    const v = (ml ? vs.find(x => x.lang.toLowerCase().startsWith('ml')) : undefined) || vs.find(x => x.lang === 'en-IN') || vs.find(x => x.lang.toLowerCase().startsWith('en'))
    const u = new SpeechSynthesisUtterance(clean); if (v) { u.voice = v; u.lang = v.lang } else u.lang = ml ? 'ml-IN' : 'en-IN'
    u.pitch = 1.45; u.rate = 1.05; u.onstart = () => setTalk(true); u.onend = () => { setTalk(false); res() }; u.onerror = () => { setTalk(false); res() }
    synth.speak(u); setTimeout(res, 20000)
  })
  // OUR STORY: the approved text is shown (and spoken) section by section, word for word, nothing is invented.
  const tellStory = async () => {
    if (busy) return; setBusy(true)
    setMsgs(m => [...m, { role: 'user', content: '📖 Our Story' }])
    for (const [text, emotion] of STORY) {
      setMsgs(m => [...m, { role: 'assistant', content: text, emotion }])
      const t0 = Date.now(); await speak(text)
      const min = Math.min(4500, 900 + text.length * 35); const left = min - (Date.now() - t0); if (left > 0) await new Promise(r => setTimeout(r, left))
    }
    setMsgs(m => [...m, { role: 'assistant', content: 'Ini entha ariyendath? Founders-ne patti, website-ne patti, ethenkilum chodichol! 😁', emotion: 'welcoming' }]); setBusy(false)
  }
  const sugg = msgs.length ? SUG.slice(2, 6) : SUG.slice(0, 5)
  if (!open) return (
    <button className="leo-fab" onClick={() => setOpen(true)} aria-label="Open LEO assistant">
      {idle === 'welcoming' && <span className="bub">Hey {name}!</span>}
      <Leo emotion={idle} size={56} />
    </button>
  )
  return (
    <div className={'leo-panel' + (big ? ' big' : '')} role="dialog" aria-label="LEO chat">
      <div className="leo-head">
        <Leo emotion={busy ? 'thinking' : last?.emotion ?? 'welcoming'} size={46} talking={talk} />
        <div className="flex-1 leading-tight"><b className="tracking-widest">LEO</b><div className="text-[10px] text-orange-200 tracking-wider">SYMBIOTES AI ASSISTANT</div><div className="text-[10px] text-green-400">● Online</div></div>
        <button className="px-1.5" title="LEO voice" onClick={() => { setPrefs({ voice: !voice }); if (voice) { window.speechSynthesis?.cancel(); setTalk(false) } }}>{voice ? '🔊' : '🔇'}</button>
        <button className="px-1.5" title="Expand" onClick={() => setBig(!big)}>{big ? '⤡' : '⤢'}</button>
        <button className="px-1.5" title="Clear chat" onClick={() => { window.speechSynthesis?.cancel(); setTalk(false); setMsgs([]); try { sessionStorage.removeItem('leo_msgs') } catch { /* ignore */ } }}>🗑</button>
        <button className="px-1.5 text-lg" title="Close" onClick={() => { window.speechSynthesis?.cancel(); setTalk(false); setOpen(false) }}>✕</button>
      </div>
      <div className="leo-msgs">
        {!msgs.length && <div className="lm bot"><Leo emotion="welcoming" size={34} /><div className="t">Hey {name}! 😁 Njan LEO, SYMBIOTES guild-inte official AI. Rules, glory, website — entha venelum chodikko!</div></div>}
        {msgs.map((m, i) => m.role === 'user'
          ? <div key={i} className="lm me"><div className="t">{m.content}</div></div>
          : <div key={i} className="lm bot"><Leo emotion={m.emotion} size={34} talking={talk && i === msgs.length - 1} /><div className="t">{m.content}</div></div>)}
        {busy && <div className="lm bot"><Leo emotion="thinking" size={34} /><div className="t dots"><span /><span /><span /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="leo-sug"><button className="story-btn" disabled={busy} onClick={tellStory}>📖 OUR STORY</button>{sugg.map(s => <button key={s} disabled={busy} onClick={() => send(s)}>{s}</button>)}</div>
      <div className="leo-in">
        <input value={text} maxLength={600} placeholder="Message LEO…" onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(text)} />
        <button className="sym-btn" disabled={busy || !text.trim()} onClick={() => send(text)}>Send</button>
      </div>
    </div>
  )
}
