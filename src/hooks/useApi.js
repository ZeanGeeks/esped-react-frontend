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
    const currentToken = csrfTokenRef.current
    if (!currentToken && options.method && options.method !== 'GET') {
      const tokenRes = await getCsrf()
      csrfTokenRef.current = tokenRes.csrf_token || ''
      setCsrfToken(tokenRes.csrf_token || '')
      return request(path, { ...options, csrfToken: tokenRes.csrf_token })
    }
    return request(path, { ...options, csrfToken: currentToken })
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
