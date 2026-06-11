import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import clsx from 'clsx'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const investorNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { to: '/kiosks', label: 'My Kiosks', icon: <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> },
  { to: '/earnings', label: 'Earnings', icon: <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { to: '/payouts', label: 'Payouts', icon: <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { to: '/reports', label: 'Reports', icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to: '/live', label: 'Live Activity', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  { to: '/waitlist', label: 'My Waitlist', icon: <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { to: '/profile', label: 'Profile', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg> },
]

const adminNav: NavItem[] = [
  { to: '/admin/colleges', label: 'Colleges', icon: <svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg> },
  { to: '/admin/investors', label: 'Investors', icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/admin/kiosks', label: 'Kiosks', icon: <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> },
  { to: '/admin/revenue', label: 'Revenue', icon: <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { to: '/admin/expenses', label: 'Expenses', icon: <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { to: '/admin/waitlists', label: 'Waitlists', icon: <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
  { to: '/admin/payments', label: 'Payments', icon: <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { to: '/admin/analytics', label: 'Analytics', icon: <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
]

export function Sidebar({ admin = false }: { admin?: boolean }) {
  const { investor, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const nav = admin ? adminNav : investorNav

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const roleLabel = admin
    ? 'Administrator'
    : isAdmin
      ? 'Investor · Admin access'
      : 'Investor'

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-logo">
        <div className="sidebar-logo-dot" />
        <div>
          <div className="sidebar-logo-text">Smart Printer</div>
          <div className="sidebar-logo-sub">{admin ? 'Admin Portal' : 'Investor Portal'}</div>
        </div>
      </Link>
      <div className="sidebar-section">Menu</div>
      <nav className="sidebar-nav">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx('nav-item', isActive && 'active')}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        {admin ? (
          <NavLink to="/dashboard" className="nav-item" style={{ marginTop: '1rem' }}>
            <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Investor View
          </NavLink>
        ) : isAdmin ? (
          <NavLink to="/admin/colleges" className="nav-item" style={{ marginTop: '1rem' }}>
            <svg viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/></svg>
            Admin Dashboard
          </NavLink>
        ) : null}
      </nav>
      <div className="sidebar-footer">
        <div className="investor-pill">
          <div className="investor-avatar">{investor?.avatar_initials || 'VP'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="investor-name">{investor?.full_name || 'Investor'}</div>
            <div className="investor-role">{roleLabel}</div>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log out
        </button>
      </div>
    </aside>
  )
}
