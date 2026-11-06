export type GoogleCredentialResponse = {
  credential?: string
}

type GoogleButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  width?: number
}

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
      }) => void
      renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

let googleScriptPromise: Promise<GoogleIdentity> | null = null

export function loadGoogleIdentityServices(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) {
    return Promise.resolve(window.google)
  }

  if (!googleScriptPromise) {
    const scriptPromise = new Promise<GoogleIdentity>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.accounts.id) {
          resolve(window.google)
        } else {
          reject(new Error('Google Identity Services did not initialize.'))
        }
      }
      script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'))
      document.head.appendChild(script)
    })
    googleScriptPromise = scriptPromise.catch((error: unknown) => {
      googleScriptPromise = null
      throw error
    })
  }

  return googleScriptPromise
}
