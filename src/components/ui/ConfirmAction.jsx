import { useState } from 'react'

export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  className = '',
  danger = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      setError(err.message || 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="confirm-action">
      <button className={className} type="button" disabled={disabled || busy} onClick={() => { setError(''); setOpen(true) }}>
        {children}
      </button>
      {open && (
        <span className="confirm-action-prompt" role="group" aria-label={title}>
          <strong>{title}</strong>
          <span>{description}</span>
          {error && <span className="confirm-action-error" role="alert">{error}</span>}
          <span className="confirm-action-buttons">
            <button type="button" disabled={busy} onClick={() => setOpen(false)}>Keep</button>
            <button type="button" className={danger ? 'confirm-danger' : ''} disabled={busy} onClick={confirm}>
              {busy ? 'Working…' : confirmLabel}
            </button>
          </span>
        </span>
      )}
    </span>
  )
}
