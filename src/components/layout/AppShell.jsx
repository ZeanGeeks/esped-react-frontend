import { Link, NavLink, useLocation } from 'react-router-dom'
import resortBackground from '../../assets/images/resort-background.jpg'
import { ConfirmAction } from '../ui/ConfirmAction'

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

export function AppShell({ children, user, onLogout }) {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <div className="site-shell" style={{ '--resort-background': `url(${resortBackground})` }}>
      <div className="utility-bar">
        <span>ESPED Resort • Classic comfort</span>
        <span>{user ? `Signed in as ${user.username} (${user.role})` : 'Guest access'}</span>
      </div>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">E</span>
          <span>ESPED Resort</span>
        </Link>
        <nav aria-label="Main navigation">
          {(isAdminRoute ? adminLinks : guestLinks).map((item) => (
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
              {!isAdminRoute && <Link className="nav-register" to="/register">Register</Link>}
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  )
}

export function Banner({ title, breadcrumb, hero = false, children }) {
  return (
    <section className={hero ? 'welcome-section' : 'welcome-section page-banner'}>
      <div className="hero-copy">
        <p className="eyebrow">{breadcrumb}</p>
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  )
}
