import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { getPostLoginDestination } from '../utils/authNavigation'
import { loadGoogleIdentityServices } from '../googleIdentity'
import { useAuth } from '../hooks/useAuth'

export function AuthPage({ mode, onAuth }) {
  const location = useLocation()
  const navigate = useNavigate()
  const googleButton = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoadError, setGoogleLoadError] = useState('')
  const { error, busy, submit: submitAuth, submitGoogle } = useAuth()
  const isLogin = mode === 'login'
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const finishAuth = useCallback((result) => {
    if (!result) return
    if (result.user) onAuth(result.user)
    const destination = result.user
      ? getPostLoginDestination(result.user.role, location.state?.from)
      : result.destination
    navigate(destination, { replace: true })
  }, [location.state, navigate, onAuth])

  const handleGoogleCredential = useCallback(async (credential) => {
    finishAuth(await submitGoogle(credential))
  }, [finishAuth, submitGoogle])

  useEffect(() => {
    const button = googleButton.current
    if (!googleClientId || !button) return undefined

    let active = true
    loadGoogleIdentityServices()
      .then((google) => {
        if (!active) return
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (credential) void handleGoogleCredential(credential)
          },
        })
        google.accounts.id.renderButton(button, {
          theme: 'outline',
          size: 'large',
          text: isLogin ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
          width: Math.max(120, Math.min(320, button.clientWidth || 320)),
        })
      })
      .catch(() => {
        if (active) setGoogleLoadError('Google sign-in is currently unavailable. Please try again later.')
      })

    return () => {
      active = false
      button.replaceChildren()
    }
  }, [googleClientId, handleGoogleCredential, isLogin])

  const submit = async (e) => {
    e.preventDefault()
    const result = await submitAuth(mode, form)
    finishAuth(result)
  }

  return (
    <main>
      <Banner title={isLogin ? 'Login' : 'Register'} breadcrumb="" compact />
      <section className="content-section auth-content-section">
        <div className="auth-panel">
          <div className="auth-copy">
            <p className="section-kicker">{isLogin ? 'Welcome back' : 'Your next stay starts here'}</p>
            <h2>{isLogin ? 'Sign in to continue.' : 'Create your guest account.'}</h2>
            <p>{isLogin
              ? 'Access your bookings and keep your resort plans in one place.'
              : 'Register as a guest to book services and manage your reservations.'}</p>
          </div>
          <div className="auth-form-wrap">
            <form className="form-grid" onSubmit={submit}>
              {!isLogin && <label>Full name<input autoComplete="name" placeholder="Your name" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>}
              <label>Email address<input autoComplete="email" placeholder="you@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label>Password
                <span className="password-field">
                  <input autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="Enter your password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                  <button className="password-visibility" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>
              <button className="button" type="submit" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
            </form>
            <div className="google-auth">
              <span className="google-auth-divider">or continue with</span>
              {googleClientId
                ? <div ref={googleButton} className={`google-auth-button${busy ? ' is-busy' : ''}`} />
                : <p className="google-auth-config" role="status">Google sign-in is unavailable. Add VITE_GOOGLE_CLIENT_ID to the frontend environment and restart the dev server.</p>}
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            {googleLoadError && <p className="error-text" role="alert">{googleLoadError}</p>}
            <p className="auth-switch">
              {isLogin ? <>New to ESPED Resort? <Link to="/register" state={location.state}>Create an account</Link></> : <>Already registered? <Link to="/login" state={location.state}>Sign in</Link></>}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
