import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banner } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmAction } from '../../components/ui/ConfirmAction'

export function BookingPage({ api, user, services, onBookingCreated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    service_id: '',
    check_in_date: '',
    check_out_date: '',
    guests: '',
    special_requests: '',
  })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const selectedService = services.find((service) => String(service.id) === form.service_id)
  const [minDate] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const review = (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (form.check_in_date < minDate || form.check_out_date <= form.check_in_date) {
      setError('Choose a check-in date today or later, and a check-out date after check-in.')
      return
    }
    if (selectedService && Number(form.guests) > Number(selectedService.capacity)) {
      setError(`This service can accommodate up to ${selectedService.capacity} guest(s).`)
      return
    }
    setReviewing(true)
  }

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await api('/bookings', { method: 'POST', body: form })
      setOk(`Booking ${res.booking.reference_no} submitted.`)
      setReviewing(false)
      await onBookingCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <Banner title="Booking" breadcrumb="Home / Booking" />
      <section className="content-section">
        <form className="form-grid" onSubmit={review}>
          <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} required disabled={!services.length}>
            <option value="">Select service</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.service_type})</option>)}
          </select>
          <label>Check-in<input type="date" min={minDate} value={form.check_in_date} onChange={(e) => setForm({ ...form, check_in_date: e.target.value })} required /></label>
          <label>Check-out<input type="date" min={form.check_in_date || minDate} value={form.check_out_date} onChange={(e) => setForm({ ...form, check_out_date: e.target.value })} required /></label>
          <label>Guests<input type="number" min="1" max={selectedService?.capacity} placeholder="Number of guests" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} required /></label>
          <textarea placeholder="Special requests" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
          <button className="button" type="submit" disabled={!services.length || reviewing}>Review booking</button>
        </form>
        {!services.length && <p className="form-note">Bookings will be available when the resort adds services.</p>}
        {error && <p className="error-text">{error}</p>}
        {ok && <p className="ok-text">{ok}</p>}
        {reviewing && selectedService && (
          <div className="booking-review" role="region" aria-labelledby="booking-review-title">
            <p className="section-kicker">Please review</p>
            <h2 id="booking-review-title">Confirm your booking request</h2>
            <dl>
              <div><dt>Service</dt><dd>{selectedService.name}</dd></div>
              <div><dt>Dates</dt><dd>{form.check_in_date} to {form.check_out_date}</dd></div>
              <div><dt>Guests</dt><dd>{form.guests}</dd></div>
              <div><dt>Price per night</dt><dd>₱{Number(selectedService.price).toFixed(2)}</dd></div>
            </dl>
            <p className="form-note">Submitting sends a booking request for resort approval; it does not confirm availability.</p>
            <div className="form-actions">
              <button className="button" type="button" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Confirm request'}</button>
              <button className="button button-secondary" type="button" disabled={busy} onClick={() => setReviewing(false)}>Go back</button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export function MyBookingsPage({ api, rows, refresh }) {
  const [feedbackForm, setFeedbackForm] = useState({})
  const [error, setError] = useState('')
  const [busyFeedbackId, setBusyFeedbackId] = useState(null)

  const cancelBooking = async (id) => {
    await api(`/bookings/${id}/cancel`, { method: 'DELETE', body: {} })
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
      await api(`/bookings/${bookingId}/feedback`, { method: 'POST', body: { rating, comment } })
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
                      <input aria-label="Rating from 1 to 5" type="number" min="1" max="5" step="1" placeholder="Rating (1-5)" disabled={busyFeedbackId === row.id} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, [row.id]: { ...(prev[row.id] || {}), rating: e.target.value } }))} />
                      <input aria-label="Feedback comment" placeholder="Comment" disabled={busyFeedbackId === row.id} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, [row.id]: { ...(prev[row.id] || {}), comment: e.target.value } }))} />
                      <button disabled={busyFeedbackId === row.id || !feedbackForm[row.id]?.rating || !feedbackForm[row.id]?.comment?.trim()} onClick={() => submitFeedback(row.id)}>{busyFeedbackId === row.id ? 'Sending…' : 'Submit feedback'}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div> : <EmptyState title="No bookings yet" description="Your reservations will appear here after you book a resort service."><Link className="button" to="/services">Explore services</Link></EmptyState>}
      </section>
    </main>
  )
}
