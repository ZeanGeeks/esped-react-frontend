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
  gcash: {
    number: string
    account_name: string
    qr_image_url: string
  } | null
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
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPayingBookingId(null)
    }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!paymentDetails) return

    setError('')
    setSubmittingPayment(true)
    try {
      await bookingApi.createPayment(paymentDetails.bookingId, { reference_number: referenceNumber })
      setPaymentDetails(null)
      setReferenceNumber('')
      setNotice('Your GCash transfer reference was submitted. The resort will verify the payment.')
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmittingPayment(false)
    }
  }

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
          if (event.target === event.currentTarget) setPaymentDetails(null)
        }}>
          <section aria-labelledby="gcash-payment-title" aria-modal="true" className="payment-dialog" role="dialog">
            <button aria-label="Close GCash payment" className="payment-dialog__close" onClick={() => setPaymentDetails(null)} type="button">×</button>
            <p className="section-kicker">GCash deposit</p>
            <h2 id="gcash-payment-title">Pay 50% of your booking</h2>
            <p className="payment-dialog__amount">₱{Number(paymentDetails.deposit_amount).toFixed(2)}</p>
            <p>Remaining balance: ₱{Number(paymentDetails.balance_due).toFixed(2)}</p>
            <div className="gcash-payment-details">
              {paymentDetails.gcash?.qr_image_url && (
                <img alt="GCash payment QR code" className="gcash-payment-qr" src={paymentDetails.gcash.qr_image_url} />
              )}
              <p><strong>GCash account:</strong> {paymentDetails.gcash?.account_name}</p>
              <p><strong>GCash number:</strong> {paymentDetails.gcash?.number}</p>
            </div>
            <ol className="gcash-payment-steps">
              <li>Scan the QR code in GCash or send to the number above.</li>
              <li>Pay exactly ₱{Number(paymentDetails.deposit_amount).toFixed(2)}.</li>
              <li>Enter the GCash transaction reference below. The resort will verify your transfer manually.</li>
            </ol>
            <form className="gcash-payment-form" onSubmit={submitPayment}>
              <label htmlFor="gcash-reference">GCash transaction reference</label>
              <input
                autoComplete="off"
                id="gcash-reference"
                maxLength={100}
                onChange={(event) => setReferenceNumber(event.target.value)}
                pattern="[A-Za-z0-9][A-Za-z0-9-]{3,99}"
                required
                value={referenceNumber}
              />
              <button className="button" disabled={submittingPayment} type="submit">
                {submittingPayment ? 'Submitting…' : 'Submit payment reference'}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
