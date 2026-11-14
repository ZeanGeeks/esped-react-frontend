import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { TurnstileWidget } from '@/components/ui/TurnstileWidget'
import {
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
  verifyPasswordResetCode,
} from '../api/authApi'
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
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false)
  const [verificationStep, setVerificationStep] = useState('email')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [verificationResetKey, setVerificationResetKey] = useState(0)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [passwordResetStep, setPasswordResetStep] = useState('email')
  const [passwordResetEmail, setPasswordResetEmail] = useState('')
  const [passwordResetCode, setPasswordResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordResetToken, setPasswordResetToken] = useState('')
  const [passwordResetResetKey, setPasswordResetResetKey] = useState(0)
  const [passwordResetBusy, setPasswordResetBusy] = useState(false)
  const [passwordResetError, setPasswordResetError] = useState('')
  const [passwordResetNotice, setPasswordResetNotice] = useState('')
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

  const handlePasswordResetToken = useCallback((token) => {
    setPasswordResetToken(token)
  }, [])

  useEffect(() => {
    if (showVerification || showForgotPassword) return undefined

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
  }, [googleClientId, handleGoogleCredential, isLogin, showForgotPassword, showVerification])

  const submit = async (e) => {
    e.preventDefault()
    if (turnstileProof.action !== turnstileAction || !turnstileProof.token) return
    setLoginNeedsVerification(false)
    setVerificationNotice('')
    const result = await submitAuth(mode, { ...form, turnstile_token: turnstileProof.token })
    setTurnstileProof({ action: '', token: '' })
    setTurnstileResetKey((version) => version + 1)
    if (result?.verificationRequired) {
      clearError()
      setVerificationEmail(result.email)
      setVerificationCode('')
      setVerificationError('')
      setVerificationNotice(isLogin
        ? 'Your password is correct, but this email needs verification.'
        : '')
      setVerificationStep('email')
      if (isLogin) {
        setLoginNeedsVerification(true)
        return
      }
      setShowVerification(true)
      return
    }
    finishAuth(result)
  }

  const sendVerificationCode = async (e) => {
    e.preventDefault()
    if (!verificationToken) return
    setVerificationBusy(true)
    setVerificationError('')
    setVerificationNotice('')
    try {
      const result = await resendEmailVerification({
        email: verificationEmail,
        turnstile_token: verificationToken,
      })
      setVerificationStep('code')
      setVerificationNotice(result.message)
      setVerificationToken('')
      setVerificationResetKey((version) => version + 1)
    } catch (requestError) {
      setVerificationError(requestError.message)
    } finally {
      setVerificationBusy(false)
    }
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
      setLoginNeedsVerification(false)
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

  const openForgotPassword = () => {
    clearError()
    setVerificationNotice('')
    setLoginNeedsVerification(false)
    setShowVerification(false)
    setShowForgotPassword(true)
    setPasswordResetStep('email')
    setPasswordResetEmail(form.email)
    setPasswordResetCode('')
    setNewPassword('')
    setPasswordConfirmation('')
    setPasswordResetToken('')
    setPasswordResetError('')
    setPasswordResetNotice('')
  }

  const sendPasswordResetCode = async (e) => {
    e.preventDefault()
    if (!passwordResetToken) return
    setPasswordResetBusy(true)
    setPasswordResetError('')
    setPasswordResetNotice('')
    try {
      const result = await requestPasswordReset({
        email: passwordResetEmail,
        turnstile_token: passwordResetToken,
      })
      setPasswordResetStep('code')
      setPasswordResetNotice(result.message)
      setPasswordResetToken('')
      setPasswordResetResetKey((version) => version + 1)
    } catch (requestError) {
      setPasswordResetError(requestError.message)
    } finally {
      setPasswordResetBusy(false)
    }
  }

  const confirmPasswordResetCode = async (e) => {
    e.preventDefault()
    setPasswordResetBusy(true)
    setPasswordResetError('')
    setPasswordResetNotice('')
    try {
      const result = await verifyPasswordResetCode({
        email: passwordResetEmail,
        code: passwordResetCode,
      })
      setPasswordResetStep('password')
      setPasswordResetNotice(result.message)
    } catch (requestError) {
      setPasswordResetError(requestError.message)
    } finally {
      setPasswordResetBusy(false)
    }
  }

  const submitPasswordReset = async (e) => {
    e.preventDefault()
    if (newPassword !== passwordConfirmation) {
      setPasswordResetError('The passwords do not match.')
      return
    }

    setPasswordResetBusy(true)
    setPasswordResetError('')
    setPasswordResetNotice('')
    try {
      const result = await resetPassword({
        email: passwordResetEmail,
        code: passwordResetCode,
        new_password: newPassword,
      })
      setShowForgotPassword(false)
      setPasswordResetCode('')
      setNewPassword('')
      setPasswordConfirmation('')
      setLoginNeedsVerification(false)
      setForm((current) => ({ ...current, email: passwordResetEmail }))
      setVerificationNotice(result.message)
    } catch (requestError) {
      setPasswordResetError(requestError.message)
    } finally {
      setPasswordResetBusy(false)
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
            {showForgotPassword ? (
              <form className="form-grid" onSubmit={
                passwordResetStep === 'email'
                  ? sendPasswordResetCode
                  : passwordResetStep === 'code'
                    ? confirmPasswordResetCode
                    : submitPasswordReset
              }>
                <h3>{passwordResetStep === 'email'
                  ? 'Reset your password'
                  : passwordResetStep === 'code'
                    ? 'Confirm your reset code'
                    : 'Choose a new password'}</h3>
                <p>{passwordResetStep === 'email'
                  ? 'Enter your email and we’ll send a 6-digit password reset code if an account exists.'
                  : passwordResetStep === 'code'
                    ? 'Enter the 6-digit code from your email to continue.'
                    : 'The code is confirmed. Choose a new password.'}</p>
                <label>Email address
                  <input
                    autoComplete="email"
                    type="email"
                    value={passwordResetEmail}
                    readOnly={passwordResetStep !== 'email'}
                    onChange={(e) => setPasswordResetEmail(e.target.value)}
                    required
                  />
                </label>
                {passwordResetStep === 'email' && (
                  <div className="turnstile-verification">
                    <TurnstileWidget
                      key={`password-reset-${passwordResetStep}-${passwordResetResetKey}`}
                      action="password_reset"
                      onToken={handlePasswordResetToken}
                      resetKey={passwordResetResetKey}
                    />
                  </div>
                )}
                {passwordResetStep === 'code' && (
                  <label>Reset code
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={passwordResetCode}
                      onChange={(e) => setPasswordResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </label>
                )}
                {passwordResetStep === 'password' && (
                  <>
                    <label>New password
                      <input
                        autoComplete="new-password"
                        type="password"
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </label>
                    <label>Confirm new password
                      <input
                        autoComplete="new-password"
                        type="password"
                        minLength={8}
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        required
                      />
                    </label>
                    {passwordConfirmation && newPassword !== passwordConfirmation && (
                      <p className="error-text" role="alert">The passwords do not match.</p>
                    )}
                  </>
                )}
                <button
                  className="button"
                  type="submit"
                  disabled={passwordResetBusy
                    || !passwordResetEmail
                    || (passwordResetStep === 'email' && !passwordResetToken)
                    || (passwordResetStep === 'code' && passwordResetCode.length !== 6)
                    || (passwordResetStep === 'password' && (
                      newPassword.length < 8
                      || newPassword !== passwordConfirmation
                    ))}
                >
                  {passwordResetBusy
                    ? 'Please wait…'
                    : passwordResetStep === 'email'
                      ? 'Send reset code'
                      : passwordResetStep === 'code'
                        ? 'Confirm code'
                        : 'Reset password'}
                </button>
                {passwordResetStep !== 'email' && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setPasswordResetStep('email')
                      setPasswordResetCode('')
                      setNewPassword('')
                      setPasswordConfirmation('')
                      setPasswordResetToken('')
                      setPasswordResetNotice('')
                    }}
                  >
                    Change email or resend code
                  </button>
                )}
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setPasswordResetError('')
                    setPasswordResetNotice('')
                  }}
                >
                  Back to sign in
                </button>
                {passwordResetError && <p className="error-text" role="alert">{passwordResetError}</p>}
                {passwordResetNotice && <p className="resource-notice" role="status">{passwordResetNotice}</p>}
              </form>
            ) : showVerification ? (
              <form className="form-grid" onSubmit={verificationStep === 'email' ? sendVerificationCode : submitVerification}>
                <h3>{verificationStep === 'email' ? 'Send a verification code' : 'Verify your email'}</h3>
                <p>{verificationStep === 'email'
                  ? 'Enter your email address and we’ll send you a 6-digit code.'
                  : 'If this address needs verification, a code is on its way. Enter it below.'}</p>
                <label>Email address
                  <input
                    autoComplete="email"
                    type="email"
                    value={verificationEmail}
                    readOnly={verificationStep === 'code'}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    required
                  />
                </label>
                {verificationStep === 'code' && (
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
                )}
                <div className="turnstile-verification">
                  <TurnstileWidget
                    key={`verification-${verificationStep}-${verificationResetKey}`}
                    action="signup"
                    onToken={handleVerificationToken}
                    resetKey={verificationResetKey}
                  />
                </div>
                <button
                  className="button"
                  type="submit"
                  disabled={verificationBusy || !verificationEmail || (verificationStep === 'email' && !verificationToken) || (verificationStep === 'code' && verificationCode.length !== 6)}
                >
                  {verificationBusy
                    ? 'Please wait…'
                    : verificationStep === 'email'
                      ? 'Send code'
                      : 'Verify email'}
                </button>
                {verificationStep === 'code' && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setVerificationStep('email')
                      setVerificationCode('')
                      setVerificationToken('')
                      setVerificationNotice('')
                    }}
                  >
                    Change email
                  </button>
                )}
                {verificationStep === 'code' && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={resendVerification}
                    disabled={verificationBusy || !verificationToken}
                  >
                    Resend code
                  </button>
                )}
                <button className="button button-secondary" type="button" onClick={() => setShowVerification(false)}>
                  Back to {isLogin ? 'sign in' : 'registration'}
                </button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={submit}>
                {!isLogin && <label>Full name<input autoComplete="name" placeholder="Your name" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>}
                <label>Email address<input autoComplete="email" placeholder="you@example.com" type="email" value={form.email} onChange={(e) => {
                  setForm({ ...form, email: e.target.value })
                  setLoginNeedsVerification(false)
                  setVerificationNotice('')
                }} required /></label>
                <label>Password
                  <span className="password-field">
                    <input autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="Enter your password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => {
                      setForm({ ...form, password: e.target.value })
                      setLoginNeedsVerification(false)
                      setVerificationNotice('')
                    }} required minLength={8} />
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
                {isLogin && loginNeedsVerification && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setVerificationStep('email')
                      setVerificationEmail(form.email)
                      setVerificationCode('')
                      setVerificationToken('')
                      setVerificationError('')
                      setShowVerification(true)
                    }}
                  >
                    Verify email or resend a code
                  </button>
                )}
                {isLogin && (
                  <button className="button button-secondary" type="button" onClick={openForgotPassword}>
                    Forgot password?
                  </button>
                )}
              </form>
            )}
            <div className="google-auth">
              {!showVerification && !showForgotPassword && <span className="google-auth-divider">or continue with</span>}
              {!showVerification && !showForgotPassword && (googleClientId
                ? <div ref={googleButton} className={`google-auth-button${busy ? ' is-busy' : ''}`} />
                : <p className="google-auth-config" role="status">Google sign-in is unavailable. Add VITE_GOOGLE_CLIENT_ID to the frontend environment and restart the dev server.</p>)}
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            {googleLoadError && <p className="error-text" role="alert">{googleLoadError}</p>}
            {verificationError && <p className="error-text" role="alert">{verificationError}</p>}
            {verificationNotice && <p className="resource-notice" role="status">{verificationNotice}</p>}
            {!showVerification && !showForgotPassword && <p className="auth-switch">
              {isLogin ? <>New to ESPED Resort? <Link to="/register" state={location.state}>Create an account</Link></> : <>Already registered? <Link to="/login" state={location.state}>Sign in</Link></>}
            </p>}
          </div>
        </div>
      </section>
    </main>
  )
}
