import { useCallback, useRef, useState } from 'react'
import { ApiRequestError } from '@/lib/api'
import { googleLogin, login, register } from '../api/authApi'

export function useAuth() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const googleRequestInFlight = useRef(false)
  const clearError = useCallback(() => setError(''), [])

  const submit = useCallback(async (mode, form) => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await login({
          email: form.email,
          password: form.password,
          turnstile_token: form.turnstile_token,
        })
        return { user: result.user, destination: result.user.role === 'admin' ? '/admin' : '/' }
      }

      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        turnstile_token: form.turnstile_token,
      })
      return { verificationRequired: true, email: form.email }
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.requiresEmailVerification) {
        return { verificationRequired: true, email: form.email }
      }
      setError(requestError.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const submitGoogle = useCallback(async (credential: string) => {
    if (googleRequestInFlight.current) return null
    googleRequestInFlight.current = true
    setError('')
    setBusy(true)
    try {
      const result = await googleLogin(credential)
      return {
        user: result.user,
        destination: result.user.role === 'admin' ? '/admin' : '/',
      }
    } catch (requestError) {
      setError(requestError.message)
      return null
    } finally {
      googleRequestInFlight.current = false
      setBusy(false)
    }
  }, [])

  return { error, busy, submit, submitGoogle, clearError }
}
