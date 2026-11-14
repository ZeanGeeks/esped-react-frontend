import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import resortBackground from '@/assets/images/resort-background.jpg'
import { ConfirmAction } from '@/components/ui/ConfirmAction'

type UserSummary = {
  username: string
  role: string
}

type AppShellProps = {
  children: ReactNode
  user: UserSummary | null
  onLogout: () => void | Promise<void>
}

type BannerProps = {
  title: string
  breadcrumb: string
  hero?: boolean
  compact?: boolean
  children?: ReactNode
}

const guestLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/recommendation', label: 'AI Recommendation' },
  { to: '/booking', label: 'Booking' },
  { to: '/my-bookings', label: 'My Bookings' },
  { to: '/contact', label: 'Contact' },
]

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/bookings', label: 'Booking Management' },
  { to: '/admin/services', label: 'Services Management' },
  { to: '/admin/guests', label: 'Guest Management' },
  { to: '/admin/feedback', label: 'Feedback' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/activity', label: 'Activity Logs' },
  { to: '/admin/settings', label: 'System Settings' },
]

export function AppShell({ children, user, onLogout }: AppShellProps) {
  const location = useLocation()
  const isAdmin = user?.role === 'admin'
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const isMenuOpen = menuPath === location.pathname

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuPath(null)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

  return (
    <div className="site-shell" style={{ '--resort-background': `url(${resortBackground})` } as CSSProperties}>
      <div className="utility-bar">
        <span>ESPED Resort • Classic comfort</span>
        <span>{user ? `Signed in as ${user.username} (${user.role})` : 'Guest access'}</span>
      </div>
      <header className={`site-header${isAdmin ? ' site-header--admin' : ''}`}>
        <Link className="brand" to="/">
          <span className="brand-mark">E</span>
          <span>ESPED Resort</span>
        </Link>
        <button
          ref={menuButtonRef}
          aria-controls="site-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="menu-toggle"
          onClick={() => setMenuPath(isMenuOpen ? null : location.pathname)}
          type="button"
        >
          {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
        <nav
          aria-label="Main navigation"
          className={`site-nav${isMenuOpen ? ' site-nav--open' : ''}`}
          id="site-navigation"
          onClick={() => setMenuPath(null)}
        >
          {(isAdmin ? adminLinks : guestLinks).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active-link' : '')}>
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <ConfirmAction
              title="Sign out?"
              description="You’ll need to sign in again to manage your bookings."
              confirmLabel="Sign out"
              className="nav-button"
              onConfirm={onLogout}
            >Logout</ConfirmAction>
          ) : (
            <>
              <Link className="nav-button" to="/login">Login</Link>
              {!isAdmin && <Link className="nav-register" to="/register">Register</Link>}
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  )
}

export function Banner({ title, breadcrumb, hero = false, compact = false, children }: BannerProps) {
  return (
    <section className={`${hero ? 'welcome-section' : 'welcome-section page-banner'}${compact ? ' page-banner--compact' : ''}`}>
      <div className="hero-copy">
        {breadcrumb ? <p className="eyebrow">{breadcrumb}</p> : null}
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  )
}
