// Per-device display preferences (theme, lite mode, text size, music, Leo)
export type Prefs = { theme: string; lite: boolean; font: number; music: boolean; vol: number; leo: boolean; voice: boolean }
const K = 'sym_prefs'
const low = () => { const m = (navigator as any).deviceMemory; return !!m && m <= 2 }
const def = (): Prefs => ({ theme: 'violet', lite: low(), font: 16, music: true, vol: 0.4, leo: true, voice: true })
export const getPrefs = (): Prefs => { try { return { ...def(), ...JSON.parse(localStorage.getItem(K) || '{}') } } catch { return def() } }
export const applyPrefs = (p: Prefs = getPrefs()) => { const r = document.documentElement; r.dataset.theme = p.theme; r.dataset.lite = p.lite ? '1' : '0'; r.style.fontSize = p.font + 'px' }
export const setPrefs = (patch: Partial<Prefs>) => { const n = { ...getPrefs(), ...patch }; try { localStorage.setItem(K, JSON.stringify(n)) } catch { /* private mode */ } applyPrefs(n); window.dispatchEvent(new Event('sym-prefs')); return n }
export const THEMES: { id: string; name: string; a: string; b: string }[] = [
  { id: 'violet', name: 'Symbiote', a: '#8b5cf6', b: '#22d3ee' },
  { id: 'fire', name: 'Fire', a: '#f97316', b: '#facc15' },
  { id: 'emerald', name: 'Venom', a: '#10b981', b: '#a3e635' },
  { id: 'ice', name: 'Ice', a: '#38bdf8', b: '#818cf8' },
  { id: 'rose', name: 'Rose', a: '#f43f5e', b: '#f59e0b' },
]
