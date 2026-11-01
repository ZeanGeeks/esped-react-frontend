import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { useBookingApi } from '../hooks/useBookingApi'

export function MyBookingsPage({ rows, refresh, loading = false, error: dataError = '' }) {
  const bookingApi = useBookingApi()
  const [feedbackForm, setFeedbackForm] = useState({})
  const [error, setError] = useState('')
  const [busyFeedbackId, setBusyFeedbackId] = useState(null)

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

  return (
    <main>
      <Banner title="My Bookings" breadcrumb="Home / My Bookings" />
      <section className="content-section">
        {error && <p className="error-text" role="alert">{error}</p>}
        {rows.length ? <div className="table-wrap"><table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Service</th>
              <th>Dates</th>
              <th>Status</th>
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
                <td>₱{Number(row.total_amount).toFixed(2)}</td>
                <td>
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
