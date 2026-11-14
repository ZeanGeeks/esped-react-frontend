import { useEffect, useRef, useState } from 'react'

type TurnstileRenderOptions = {
  sitekey: string
  action: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': (errorCode: string | number) => boolean
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
}

type TurnstileWidgetProps = {
  action: string
  onToken: (token: string) => void
  resetKey?: number
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => window.turnstile
      ? resolve()
      : reject(new Error('Turnstile loaded without its API.'))
    script.onerror = () => reject(new Error('Could not load Turnstile.'))
    document.head.appendChild(script)
  }).catch((error) => {
    turnstileScriptPromise = null
    throw error
  })

  turnstileScriptPromise = promise
  return promise
}

function getErrorMessage(errorCode: string | number) {
  const code = String(errorCode)
  if (code === '110200') {
    return 'This hostname is not authorized for Turnstile. Add it to the widget hostnames in Cloudflare.'
  }
  if (['110100', '110110', '400020', '400070'].includes(code)) {
    return `Turnstile configuration error (${code}). Check the site key and widget status in Cloudflare.`
  }
  if (code === '200500') {
    return 'Could not load the Turnstile challenge. Check that challenges.cloudflare.com is reachable.'
  }
  return `Could not verify the anti-spam challenge (${code}). Please retry.`
}

export function TurnstileWidget({ action, onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? ''
  const [error, setError] = useState('')

  useEffect(() => {
    if (!siteKey) return undefined

    let cancelled = false
    let widgetId = ''
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          action,
          callback: (token) => {
            onToken(token)
            setError('')
          },
          'expired-callback': () => {
            onToken('')
            setError('Verification expired. Complete the challenge again.')
          },
          'error-callback': (errorCode) => {
            onToken('')
            setError(getErrorMessage(errorCode))
            return true
          },
        })
      })
      .catch(() => {
        if (!cancelled) {
          onToken('')
          setError('Could not load anti-spam verification. Check your connection and try again.')
        }
      })

    return () => {
      cancelled = true
      if (widgetId) window.turnstile?.remove(widgetId)
    }
  }, [action, onToken, resetKey, siteKey])

  return (
    <div className="turnstile-widget">
      <div ref={container} />
      {(!siteKey || error) && (
        <p className="error-text" role="alert">
          {error || 'Anti-spam verification is not configured. Please contact the resort.'}
        </p>
      )}
    </div>
  )
}
