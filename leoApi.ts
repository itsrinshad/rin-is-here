import { supabase } from './lib'

// Supabase builds a function's web address from its "slug", which can differ from the display name
// (e.g. name "leo" but slug "smart-responder"). Try the deployed slug first, then other likely names.
const NAMES = Array.from(new Set([((import.meta.env.VITE_LEO_FUNCTION as string | undefined) ?? '').trim(), 'smart-responder', 'leo', 'smart-response'].filter(Boolean)))
let good: string | null = null

export async function callLeo(body: unknown) {
  const order = good ? [good, ...NAMES.filter(n => n !== good)] : NAMES
  let last: Awaited<ReturnType<typeof supabase.functions.invoke>> | null = null
  for (const n of order) {
    const r = await supabase.functions.invoke(n, { body: body as Record<string, unknown> })
    if (!r.error) { good = n; return r }
    last = r
    const status = (r.error as any)?.context?.status
    const notThere = status === 404 || String(r.error.message).includes('Failed to send')
    if (!notThere) return r          // the function exists but returned something else: report it
  }
  return last!
}
