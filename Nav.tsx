import { NavLink } from 'react-router-dom'
import { Bell, Flame, Home, Lightbulb, Medal, Megaphone, MessageCircle, ScrollText, Settings, ShieldCheck, Trophy, User, Users, Vote, X } from 'lucide-react'
import type { ComponentType } from 'react'

type Item = { to: string; label: string; tip: string; Icon: ComponentType<{ size?: number }>; admin?: boolean; end?: boolean; badge?: 'notif' | 'admin' }
export const NAV: Item[] = [
  { to: '/', label: 'Home', tip: 'Your dashboard', Icon: Home, end: true },
  { to: '/profile', label: 'My Profile', tip: 'Edit your profile', Icon: User },
  { to: '/chat', label: 'Guild Chat', tip: 'Groups and direct chats', Icon: MessageCircle },
  { to: '/leaderboard', label: 'Leaderboard', tip: 'Glory rankings', Icon: Trophy },
  { to: '/glory', label: 'Glory Tracker', tip: 'Your glory history', Icon: Flame },
  { to: '/rules', label: 'Guild Rules', tip: 'Rules and info', Icon: ScrollText },
  { to: '/announcements', label: 'Announcements', tip: 'Guild news', Icon: Megaphone },
  { to: '/polls', label: 'Polls', tip: 'Vote on guild polls', Icon: Vote },
  { to: '/members', label: 'Guild Members', tip: 'Everyone in the guild', Icon: Users },
  { to: '/achievements', label: 'Achievements', tip: 'Badges and awards', Icon: Medal },
  { to: '/notifications', label: 'Notifications', tip: 'Your updates', Icon: Bell, badge: 'notif' },
  { to: '/feedback', label: 'Community Feedback', tip: 'Requests, bugs and ideas', Icon: Lightbulb },
  { to: '/admin', label: 'Admin Control Center', tip: 'Admins only', Icon: ShieldCheck, admin: true, badge: 'admin' },
  { to: '/settings', label: 'Settings', tip: 'Theme, music, account', Icon: Settings },
]

export function Drawer({ open, onClose, isAdmin, notif, pend }: { open: boolean; onClose: () => void; isAdmin: boolean; notif: number; pend: number }) {
  return (
    <>
      {open && <div className="drawer-bg" onClick={onClose} />}
      <aside className={'drawer' + (open ? ' open' : '')} aria-label="Menu">
        <div className="drawer-h"><b className="tracking-widest">MENU</b><button onClick={onClose} aria-label="Close menu" className="drawer-x"><X size={22} /></button></div>
        <nav className="drawer-list">
          {NAV.filter(n => !n.admin || isAdmin).map(({ to, label, tip, Icon, end, badge }) => {
            const b = badge === 'notif' ? notif : badge === 'admin' ? pend : 0
            return (
              <NavLink key={to} to={to} end={end} title={tip} onClick={onClose} className={({ isActive }) => 'drawer-i' + (isActive ? ' on' : '')}>
                <Icon size={22} /><span className="drawer-t">{label}</span>{b > 0 && <span className="drawer-b">{b > 99 ? '99+' : b}</span>}
              </NavLink>)
          })}
        </nav>
      </aside>
    </>
  )
}
