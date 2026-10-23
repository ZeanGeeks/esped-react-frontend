import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banner } from '../../components/layout/AppShell'

export function AuthPage({ mode, api, onAuth }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isLogin = mode === 'login'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isLogin) {
        const res = await api('/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
        onAuth(res.user)
        navigate(res.user.role === 'admin' ? '/admin' : '/')
      } else {
        await api('/auth/register', { method: 'POST', body: { username: form.username, email: form.email, password: form.password } })
        navigate('/login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <Banner title={isLogin ? 'Login' : 'Register'} breadcrumb={isLogin ? 'Home / Login' : 'Home / Register'} />
      <section className="content-section">
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
            {error && <p className="error-text" role="alert">{error}</p>}
            <p className="auth-switch">
              {isLogin ? <>New to ESPED Resort? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Sign in</Link></>}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
