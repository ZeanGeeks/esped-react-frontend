import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type ConfirmActionProps = {
  children: ReactNode
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  className?: string
  danger?: boolean
  disabled?: boolean
}

type PopoverPosition = {
  top: number
  left: number
  width: number
}

export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  className = '',
  danger = false,
  disabled = false,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const promptRef = useRef<HTMLSpanElement>(null)

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

  useLayoutEffect(() => {
    if (!open) return undefined

    const updatePosition = () => {
      const anchor = buttonRef.current?.getBoundingClientRect()
      const prompt = promptRef.current
      if (!anchor || !prompt) return

      const width = Math.min(290, Math.max(0, window.innerWidth - 24))
      const height = prompt.offsetHeight
      const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))
      const below = window.innerHeight - anchor.bottom - 12 >= height + 8
      const top = below
        ? anchor.bottom + 8
        : Math.max(12, Math.min(anchor.top - height - 8, window.innerHeight - height - 12))

      setPosition((current) => current?.top === top && current?.left === left && current?.width === width
        ? current
        : { top, left, width })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, error])

  return (
    <span className="confirm-action">
      <button
        ref={buttonRef}
        className={className}
        type="button"
        disabled={disabled || busy}
        aria-expanded={open}
        onClick={() => { setError(''); setOpen(true) }}
      >
        {children}
      </button>
      {open && createPortal(
        <span
          ref={promptRef}
          className="confirm-action-prompt"
          role="group"
          aria-label={title}
          style={position ? { top: position.top, left: position.left, width: position.width } : undefined}
        >
          <strong>{title}</strong>
          <span>{description}</span>
          {error && <span className="confirm-action-error" role="alert">{error}</span>}
          <span className="confirm-action-buttons">
            <button type="button" disabled={busy} onClick={() => setOpen(false)}>Keep</button>
            <button type="button" className={danger ? 'confirm-danger' : ''} disabled={busy} onClick={confirm}>
              {busy ? 'Working…' : confirmLabel}
            </button>
          </span>
        </span>,
        document.body,
      )}
    </span>
  )
}
