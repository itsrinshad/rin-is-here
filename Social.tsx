import { supabase } from './lib'

export const BUCKET = 'social'
export const pubUrl = (p?: string | null) => (p ? supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl : '')
export async function uploadMedia(file: File, uid: string) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  if (file.size > 50 * 1024 * 1024) throw new Error('File is too big (max 50 MB). Pick a smaller photo/video.')
  const guess: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg' }
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || guess[ext] || 'application/octet-stream' })
  if (error) throw new Error('Upload failed: ' + error.message)
  return path
}
export const timeAgo = (d: string) => {
  const s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}
export const BG = ['linear-gradient(135deg,#7c3aed,#06b6d4)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#10b981,#3b82f6)', 'linear-gradient(135deg,#ec4899,#8b5cf6)']
export const BADGE_ICON: Record<string, string> = { glory_champion: '🏆', weekly_mvp: '⭐', most_active: '🔥', tournament_winner: '🥇', guild_veteran: '🛡️', top_contributor: '💎', founding_member: '👑' }

export function Avatar({ url, name, size = 44, ring = 'none', onClick }: { url?: string | null; name?: string | null; size?: number; ring?: 'new' | 'seen' | 'none'; onClick?: () => void }) {
  const st = { width: size, height: size }
  return (
    <span className={'ring ' + (ring === 'new' ? '' : ring)} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <span className="ring-in">
        {url ? <img src={url} style={st} className="ava" /> : <span style={{ ...st, fontSize: size / 2.3 }} className="ava ph">{(name || '?')[0].toUpperCase()}</span>}
      </span>
    </span>
  )
}
