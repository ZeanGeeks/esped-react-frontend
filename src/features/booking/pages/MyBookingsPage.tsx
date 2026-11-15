import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { useBookingApi } from '../hooks/useBookingApi'

type PaymentDetails = {
  bookingId: number
  deposit_amount: number | string
  balance_due: number | string
  payment: {
    status: string
    rejection_reason?: string | null
    reference_number?: string
  } | null
  intent: {
    id: number
    status: string
    expires_at: string
    submitted_late?: boolean | number
  } | null
  terms: {
    version: string
    short: string
    full: string
  }
  gcash: {
    number: string
    account_name: string
    qr_image_url: string
  } | null
}

function formatReference(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  return digits.match(/.{1,4}/g)?.join(' ') ?? ''
}

export function MyBookingsPage({ rows, refresh, loading = false, error: dataError = '' }) {
  const bookingApi = useBookingApi()
  const [feedbackForm, setFeedbackForm] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyFeedbackId, setBusyFeedbackId] = useState(null)
  const [payingBookingId, setPayingBookingId] = useState(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'terms' | 'qr' | 'proof'>('terms')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  useEffect(() => {
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const cancelBooking = async (id) => {
    await bookingApi.cancelBooking(id)
    await refresh()
  }

  const submitFeedback = async (bookingId) => {
    const data = feedbackForm[bookingId]
    setError('')
    const rating = Number(data?.rating)
    const comment = data?.comment?.trim()
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      setError('Enter a rating from 1 to 5 and a feedback comment.')
      return
    }
    setBusyFeedbackId(bookingId)
    try {
      await bookingApi.submitBookingFeedback(bookingId, { rating, comment })
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyFeedbackId(null)
    }
  }

  const startPayment = async (bookingId) => {
    setError('')
    setNotice('')
    setPayingBookingId(bookingId)
    try {
      const result = await bookingApi.getPaymentStatus(bookingId)
      setPaymentDetails({ bookingId, ...result })
      setReferenceNumber('')
      setPaymentReceipt(null)
      setTermsAccepted(false)
      setPaymentStep(
        result.intent && ['InProgress', 'Expired'].includes(result.intent.status)
          ? 'qr'
          : 'terms',
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPayingBookingId(null)
    }
  }

  const beginPayment = async () => {
    if (!paymentDetails) return
    setError('')
    setSubmittingPayment(true)
    try {
      const result = await bookingApi.startPaymentIntent(paymentDetails.bookingId, {
        terms_accepted: true,
        terms_version: paymentDetails.terms.version,
      })
      setPaymentDetails((current) => current ? { ...current, intent: result.intent } : current)
      setTermsAccepted(false)
      setPaymentStep('qr')
      if (result.admin_email_sent === false) {
        setNotice('Your payment session is saved, but the admin email alert could not be sent. You may still continue; the session is visible in the admin dashboard.')
      } else {
        setNotice('')
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmittingPayment(false)
    }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!paymentDetails || !paymentDetails.intent) return

    setError('')
    setSubmittingPayment(true)
    try {
      const formData = new FormData()
      formData.set('reference_number', referenceNumber)
      if (paymentReceipt) formData.set('receipt', paymentReceipt)
      await bookingApi.createPayment(paymentDetails.bookingId, formData)
      setPaymentDetails(null)
      setReferenceNumber('')
      setPaymentReceipt(null)
      setNotice('Your GCash transfer reference was submitted. The resort will verify the payment.')
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmittingPayment(false)
    }
  }

  const closePayment = () => {
    setPaymentDetails(null)
    setTermsAccepted(false)
    setPaymentStep('terms')
    setPaymentReceipt(null)
    setReferenceNumber('')
  }

  const paymentSubmitted = Boolean(
    paymentDetails?.payment
    && ['Pending', 'Verified'].includes(paymentDetails.payment.status),
  )
  const activePaymentSession = Boolean(
    paymentDetails?.intent
    && ['InProgress', 'Expired'].includes(paymentDetails.intent.status),
  )

  return (
    <main>
      <Banner title="My Bookings" breadcrumb="My Bookings" />
      <section className="content-section">
        {error && <p className="error-text" role="alert">{error}</p>}
        {notice && <p className="ok-text" role="status">{notice}</p>}
        {rows.length ? <div className="table-wrap"><table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Service</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.reference_no}</td>
                <td>{row.service_name}</td>
                <td>{row.check_in_date} → {row.check_out_date}</td>
                <td><span className={`status status-${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>
                  <span className={`payment-status${row.payment_status === 'Deposit paid' ? ' payment-status--paid' : row.payment_status === 'Rejected' ? ' payment-status--failed' : ''}`}>
                    {row.payment_status || 'Unpaid'}
                  </span>
                  {row.deposit_amount && <small className="payment-deposit-amount">₱{Number(row.deposit_amount).toFixed(2)} deposit</small>}
                  {row.payment_rejection_reason && <small className="payment-rejection-reason">{row.payment_rejection_reason}</small>}
                </td>
                <td>₱{Number(row.total_amount).toFixed(2)}</td>
                <td>
                  {row.status === 'Confirmed' && !['Deposit paid', 'Pending'].includes(row.payment_status) && (
                    <button
                      className="button payment-action"
                      type="button"
                      disabled={payingBookingId === row.id}
                      onClick={() => startPayment(row.id)}
                    >
                      {payingBookingId === row.id
                        ? 'Loading…'
                        : row.payment_status === 'Payment in progress' ? 'Continue payment'
                        : row.payment_status === 'Rejected' ? 'Retry deposit' : 'Pay 50% deposit'}
                    </button>
                  )}
                  {row.status === 'Confirmed' && row.payment_status === 'Pending' && <span className="form-note">Deposit awaiting verification</span>}
                  {row.status === 'Pending' && (
                    <ConfirmAction
                      title="Cancel this booking?"
                      description={`Booking ${row.reference_no} will be cancelled. This can’t be undone here.`}
                      confirmLabel="Cancel booking"
                      danger
                      onConfirm={() => cancelBooking(row.id)}
                    >Cancel booking</ConfirmAction>
                  )}
                  {row.status === 'Completed' && (
                    <div className="inline-feedback">
                      <input aria-label="Rating from 1 to 5" type="number" min="1" max="5" step="1" placeholder="Rating (1-5)" disabled={busyFeedbackId === row.id} onChange={(event) => setFeedbackForm((previous) => ({ ...previous, [row.id]: { ...(previous[row.id] || {}), rating: event.target.value } }))} />
                      <input aria-label="Feedback comment" placeholder="Comment" disabled={busyFeedbackId === row.id} onChange={(event) => setFeedbackForm((previous) => ({ ...previous, [row.id]: { ...(previous[row.id] || {}), comment: event.target.value } }))} />
                      <button disabled={busyFeedbackId === row.id || !feedbackForm[row.id]?.rating || !feedbackForm[row.id]?.comment?.trim()} onClick={() => submitFeedback(row.id)}>{busyFeedbackId === row.id ? 'Sending…' : 'Submit feedback'}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div> : !loading && !dataError ? <EmptyState title="No bookings yet" description="Your reservations will appear here after you book a resort service."><Link className="button" to="/services">Explore services</Link></EmptyState> : null}
      </section>
      {paymentDetails && (
        <div className="payment-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePayment()
        }}>
          <section aria-labelledby="gcash-payment-title" aria-modal="true" className="payment-dialog" role="dialog">
            <button aria-label="Close GCash payment" className="payment-dialog__close" onClick={closePayment} type="button">×</button>
            <p className="section-kicker">GCash deposit</p>
            <h2 id="gcash-payment-title">Pay 50% of your booking</h2>
            <p className="payment-dialog__amount">₱{Number(paymentDetails.deposit_amount).toFixed(2)}</p>
            <p>Remaining balance: ₱{Number(paymentDetails.balance_due).toFixed(2)}</p>
            <ol aria-label="Payment progress" className="gcash-payment-progress">
              <li className={activePaymentSession || paymentSubmitted ? 'is-complete' : 'is-current'}>Review terms</li>
              <li className={paymentSubmitted || paymentStep === 'proof' ? 'is-complete' : paymentStep === 'qr' ? 'is-current' : ''}>Send deposit</li>
              <li className={paymentSubmitted ? 'is-complete' : paymentStep === 'proof' ? 'is-current' : ''}>Submit reference</li>
            </ol>
            {paymentDetails.payment?.status === 'Rejected' && (
              <p className="payment-rejection-reason" role="alert">
                Previous payment was not verified: {paymentDetails.payment.rejection_reason || 'Contact the resort before retrying.'}
              </p>
            )}
            {paymentDetails.payment?.status === 'Pending' ? (
              <div className="payment-state-message" role="status">
                <h3>Payment submitted for review</h3>
                <p>Reference {paymentDetails.payment.reference_number} is awaiting manual verification. Do not send the payment again.</p>
              </div>
            ) : paymentDetails.payment?.status === 'Verified' ? (
              <div className="payment-state-message" role="status">
                <h3>Deposit verified</h3>
                <p>Your 50% deposit is recorded as paid. The remaining balance is payable at the resort.</p>
              </div>
            ) : paymentDetails.intent && ['qr', 'proof'].includes(paymentStep) ? (
              <>
                <div className="gcash-payment-details">
                  {paymentDetails.gcash?.qr_image_url && (
                    <img alt="GCash payment QR code" className="gcash-payment-qr" src={paymentDetails.gcash.qr_image_url} />
                  )}
                  <p><strong>GCash account:</strong> {paymentDetails.gcash?.account_name}</p>
                  <p><strong>GCash number:</strong> {paymentDetails.gcash?.number}</p>
                </div>
                <ol className="gcash-payment-steps">
                  <li>Scan the QR code in GCash or send to the number above.</li>
                  <li>Pay exactly ₱{Number(paymentDetails.deposit_amount).toFixed(2)} and include booking reference {rows.find((row) => row.id === paymentDetails.bookingId)?.reference_no} in the notes when available.</li>
                  <li>Enter the 10-13 digit GCash transaction reference below. The resort will verify your transfer manually.</li>
                </ol>
                <p className={`payment-window-note${paymentDetails.intent.status === 'Expired' ? ' payment-window-note--expired' : ''}`}>
                  {paymentDetails.intent.status === 'Expired'
                    ? 'The 30-minute payment window has ended. If you already paid, you may still submit the reference for staff review.'
                    : `Payment session expires at ${paymentDetails.intent.expires_at}. If you pay later, submit the reference and the resort will review it.`}
                </p>
                {paymentStep === 'qr' ? (
                  <button className="button" onClick={() => setPaymentStep('proof')} type="button">
                    I have sent the deposit — enter reference
                  </button>
                ) : (
                  <form className="gcash-payment-form" onSubmit={submitPayment}>
                    <p className="form-note">Submit the GCash reference from your completed transfer. Staff will verify the payment before marking the deposit as paid.</p>
                    <label htmlFor="gcash-reference">GCash transaction reference (10-13 digits)</label>
                    <input
                      autoComplete="off"
                      id="gcash-reference"
                      inputMode="numeric"
                      maxLength={16}
                      onChange={(event) => setReferenceNumber(formatReference(event.target.value))}
                      pattern="(?:[0-9]{1,4} ?){2,3}[0-9]{1,4}"
                      placeholder="1234 5678 9012"
                      required
                      value={referenceNumber}
                    />
                    <label htmlFor="gcash-receipt">Receipt image (optional, JPG/PNG/WebP, up to 5 MB)</label>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      id="gcash-receipt"
                      onChange={(event) => setPaymentReceipt(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                    <button className="button" disabled={submittingPayment} type="submit">
                      {submittingPayment ? 'Submitting…' : 'Confirm payment and submit reference'}
                    </button>
                  </form>
                )}
              </>
            ) : paymentDetails.terms ? (
              <div className="payment-terms-step">
                <p>{paymentDetails.terms.short}</p>
                <details className="payment-terms-details">
                  <summary>Read the full GCash payment terms</summary>
                  <pre>{paymentDetails.terms.full}</pre>
                </details>
                <label className="payment-terms-accept">
                  <input
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  <span>I have reviewed and agree to these payment terms for this booking.</span>
                </label>
                <button className="button" disabled={!termsAccepted || submittingPayment} onClick={beginPayment} type="button">
                  {submittingPayment ? 'Starting payment session…' : 'I agree — show payment QR'}
                </button>
              </div>
            ) : <p className="error-text" role="alert">Payment information is unavailable. Please close and try again.</p>}
          </section>
        </div>
      )}
    </main>
  )
}
