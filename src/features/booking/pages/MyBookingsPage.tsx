import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { useBookingApi } from '../hooks/useBookingApi'

export function MyBookingsPage({ rows, refresh, loading = false, error: dataError = '' }) {
  const bookingApi = useBookingApi()
  const [feedbackForm, setFeedbackForm] = useState({})
  const [error, setError] = useState('')
  const [busyFeedbackId, setBusyFeedbackId] = useState(null)
  const [payingBookingId, setPayingBookingId] = useState(null)

  useEffect(() => {
    const refreshPaymentStatuses = async () => {
      const unpaidConfirmedBookings = rows.filter(
        (row) => row.status === 'Confirmed' && row.payment_status === 'Pending',
      )
      await Promise.all(unpaidConfirmedBookings.map(async (row) => {
        try {
          await bookingApi.getPaymentStatus(row.id)
        } catch (requestError) {
          setError(requestError.message)
        }
      }))
      await refresh()
    }

    window.addEventListener('focus', refreshPaymentStatuses)
    return () => window.removeEventListener('focus', refreshPaymentStatuses)
  }, [bookingApi, refresh, rows])

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
    setPayingBookingId(bookingId)
    const checkoutWindow = window.open('about:blank', '_blank')
    if (!checkoutWindow) {
      setError('Allow pop-ups to open the secure PayMongo checkout.')
      setPayingBookingId(null)
      return
    }
    checkoutWindow.opener = null
    checkoutWindow.document.title = 'Opening PayMongo checkout'
    checkoutWindow.document.body.textContent = 'Opening secure checkout…'

    try {
      const result = await bookingApi.createPayment(bookingId)
      if (!result.checkout_url) throw new Error('PayMongo did not return a checkout link.')
      checkoutWindow.location.replace(result.checkout_url)
    } catch (requestError) {
      setError(requestError.message)
      checkoutWindow.close()
      setPayingBookingId(null)
    }
  }

  return (
    <main>
      <Banner title="My Bookings" breadcrumb="My Bookings" />
      <section className="content-section">
        {error && <p className="error-text" role="alert">{error}</p>}
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
                  <span className={`payment-status payment-status--${(row.payment_status || 'Unpaid').toLowerCase()}`}>
                    {row.payment_status || 'Unpaid'}
                  </span>
                </td>
                <td>₱{Number(row.total_amount).toFixed(2)}</td>
                <td>
                  {row.status === 'Confirmed' && row.payment_status !== 'Paid' && (
                    <button
                      className="button payment-action"
                      type="button"
                      disabled={payingBookingId === row.id}
                      onClick={() => startPayment(row.id)}
                    >
                      {payingBookingId === row.id
                        ? 'Opening checkout…'
                        : row.payment_status === 'Pending' ? 'Continue payment' : 'Pay now'}
                    </button>
                  )}
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
    </main>
  )
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const paymentResult = searchParams.get('payment')

  return (
    <main>
      <Banner title={paymentResult === 'success' ? 'Payment submitted' : 'Checkout closed'} breadcrumb="Payment" />
      <section className="content-section payment-result">
        <h2>{paymentResult === 'success' ? 'Thank you for your payment.' : 'Your booking is still awaiting payment.'}</h2>
        <p>
          {paymentResult === 'success'
            ? 'PayMongo is processing the payment. Return to your My Bookings tab to see the verified payment status.'
            : 'You can return to your My Bookings tab and continue checkout when you’re ready.'}
        </p>
        <button className="button" type="button" onClick={() => window.close()}>Close checkout tab</button>
      </section>
    </main>
  )
}
