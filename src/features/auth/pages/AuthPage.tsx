import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { TurnstileWidget } from '@/components/ui/TurnstileWidget'
import { resendEmailVerification, verifyEmail } from '../api/authApi'
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
  const [turnstileProof, setTurnstileProof] = useState({ action: '', token: '' })
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [verificationResetKey, setVerificationResetKey] = useState(0)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')
  const { error, busy, submit: submitAuth, submitGoogle, clearError } = useAuth()
  const isLogin = mode === 'login'
  const turnstileAction = isLogin ? 'login' : 'signup'
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

  const handleTurnstileToken = useCallback((token) => {
    setTurnstileProof({ action: turnstileAction, token })
  }, [turnstileAction])

  const handleVerificationToken = useCallback((token) => {
    setVerificationToken(token)
  }, [])

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
          width: Math.max(120, Math.min(360, button.clientWidth || 360)),
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
    if (turnstileProof.action !== turnstileAction || !turnstileProof.token) return
    const result = await submitAuth(mode, { ...form, turnstile_token: turnstileProof.token })
    setTurnstileProof({ action: '', token: '' })
    setTurnstileResetKey((version) => version + 1)
    if (result?.verificationRequired) {
      clearError()
      setVerificationEmail(result.email)
      setVerificationCode('')
      setVerificationError('')
      setVerificationNotice('')
      setShowVerification(true)
      return
    }
    finishAuth(result)
  }

  const submitVerification = async (e) => {
    e.preventDefault()
    setVerificationBusy(true)
    setVerificationError('')
    setVerificationNotice('')
    try {
      const result = await verifyEmail({
        email: verificationEmail,
        code: verificationCode,
      })
      setVerificationCode('')
      setShowVerification(false)
      setVerificationNotice(result.message)
    } catch (requestError) {
      setVerificationError(requestError.message)
    } finally {
      setVerificationBusy(false)
    }
  }

  const resendVerification = async () => {
    if (!verificationToken) return
    setVerificationBusy(true)
    setVerificationError('')
    setVerificationNotice('')
    try {
      const result = await resendEmailVerification({
        email: verificationEmail,
        turnstile_token: verificationToken,
      })
      setVerificationNotice(result.message)
      setVerificationToken('')
      setVerificationResetKey((version) => version + 1)
    } catch (requestError) {
      setVerificationError(requestError.message)
    } finally {
      setVerificationBusy(false)
    }
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
            {showVerification ? (
              <form className="form-grid" onSubmit={submitVerification}>
                <h3>Verify your email</h3>
                <p>Enter the 6-digit code we sent to your email address.</p>
                <label>Email address
                  <input
                    autoComplete="email"
                    type="email"
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    required
                  />
                </label>
                <label>Verification code
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </label>
                <button className="button" type="submit" disabled={verificationBusy || verificationCode.length !== 6}>
                  {verificationBusy ? 'Please wait…' : 'Verify email'}
                </button>
                <div className="turnstile-verification">
                  <TurnstileWidget
                    key={`verification-${verificationResetKey}`}
                    action="signup"
                    onToken={handleVerificationToken}
                    resetKey={verificationResetKey}
                  />
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={resendVerification}
                  disabled={verificationBusy || !verificationToken || !verificationEmail}
                >
                  Resend code
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowVerification(false)}>
                  Back to {isLogin ? 'sign in' : 'registration'}
                </button>
              </form>
            ) : (
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
                <div className="turnstile-verification">
                  <TurnstileWidget
                    key={turnstileAction}
                    action={turnstileAction}
                    onToken={handleTurnstileToken}
                    resetKey={turnstileResetKey}
                  />
                </div>
                <button
                  className="button"
                  type="submit"
                  disabled={busy || turnstileProof.action !== turnstileAction || !turnstileProof.token}
                >
                  {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    clearError()
                    setVerificationEmail(form.email)
                    setVerificationToken('')
                    setVerificationError('')
                    setVerificationNotice('')
                    setShowVerification(true)
                  }}
                >
                  Verify an email or resend a code
                </button>
              </form>
            )}
            <div className="google-auth">
              {!showVerification && <span className="google-auth-divider">or continue with</span>}
              {!showVerification && (googleClientId
                ? <div ref={googleButton} className={`google-auth-button${busy ? ' is-busy' : ''}`} />
                : <p className="google-auth-config" role="status">Google sign-in is unavailable. Add VITE_GOOGLE_CLIENT_ID to the frontend environment and restart the dev server.</p>)}
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            {googleLoadError && <p className="error-text" role="alert">{googleLoadError}</p>}
            {verificationError && <p className="error-text" role="alert">{verificationError}</p>}
            {verificationNotice && <p className="resource-notice" role="status">{verificationNotice}</p>}
            {!showVerification && <p className="auth-switch">
              {isLogin ? <>New to ESPED Resort? <Link to="/register" state={location.state}>Create an account</Link></> : <>Already registered? <Link to="/login" state={location.state}>Sign in</Link></>}
            </p>}
          </div>
        </div>
      </section>
    </main>
  )
}
