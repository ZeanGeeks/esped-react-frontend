import { useCallback, useEffect, useRef, useState } from 'react'
import { getCsrf, request } from '../lib/api'

export function useApi() {
  const [csrfToken, setCsrfToken] = useState('')
  const csrfTokenRef = useRef(csrfToken)

  useEffect(() => {
    getCsrf().then((res) => {
      csrfTokenRef.current = res.csrf_token || ''
      setCsrfToken(res.csrf_token || '')
    }).catch(() => {})
  }, [])

  const api = useCallback(async (path, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const currentToken = csrfTokenRef.current
    let result

    if (!currentToken && method !== 'GET') {
      const tokenRes = await getCsrf()
      csrfTokenRef.current = tokenRes.csrf_token || ''
      setCsrfToken(tokenRes.csrf_token || '')
      result = await request(path, { ...options, csrfToken: tokenRes.csrf_token })
    } else {
      result = await request(path, { ...options, csrfToken: currentToken })
    }

    if (path === '/auth/logout' && method === 'POST') {
      csrfTokenRef.current = ''
      setCsrfToken('')
    }

    return result
  }, [])

  const refreshCsrf = useCallback(async () => {
    const res = await getCsrf()
    csrfTokenRef.current = res.csrf_token || ''
    setCsrfToken(res.csrf_token || '')
    return res.csrf_token
  }, [])

  return { api, csrfToken, refreshCsrf }
}

export function getBootErrorMessage(error) {
  return error instanceof TypeError
    ? 'Could not connect to the resort server. Make sure Apache is running, then try again.'
    : error.message
}
