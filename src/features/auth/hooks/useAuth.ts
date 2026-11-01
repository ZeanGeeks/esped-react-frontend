import { useCallback, useState } from 'react'
import { login, register } from '../api/authApi'

export function useAuth() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = useCallback(async (mode, form) => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await login({ email: form.email, password: form.password })
        return { user: result.user, destination: result.user.role === 'admin' ? '/admin' : '/' }
      }

      await register({ username: form.username, email: form.email, password: form.password })
      return { destination: '/login' }
    } catch (requestError) {
      setError(requestError.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  return { error, busy, submit }
}
