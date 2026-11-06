import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { ApiRequestError } from '@/lib/api'
import { useBookingApi } from '../hooks/useBookingApi'
import { dateKey, isStayAvailable } from '../utils/availability'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BookingPage({ user, services, onBookingCreated, serviceState, onRetryServices }) {
  const bookingApi = useBookingApi()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkedServiceId = searchParams.get('service_id') || ''
  const [form, setForm] = useState({
    service_id: linkedServiceId,
    check_in_date: '',
    check_out_date: '',
    guests: '',
    special_requests: '',
  })
  const [error, setError] = useState('')
  const [needsBookingCheck, setNeedsBookingCheck] = useState(false)
  const [ok, setOk] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dateField, setDateField] = useState('')
  const [today] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [availableDates, setAvailableDates] = useState(new Set())
  const [availabilityLoading, setAvailabilityLoading] = useState(Boolean(linkedServiceId))
  const [availabilityError, setAvailabilityError] = useState('')
  const availabilityRequestId = useRef(0)
  const selectedService = services.find((service) => String(service.id) === form.service_id)
  const minDate = dateKey(today)

  const loadAvailability = useCallback(async (serviceId) => {
    const requestId = ++availabilityRequestId.current
    try {
      const result = await bookingApi.getServiceAvailability(serviceId)
      if (!Array.isArray(result.available_dates)) {
        throw new Error('The availability response was invalid.')
      }
      if (requestId === availabilityRequestId.current) {
        setAvailableDates(new Set(result.available_dates))
      }
    } catch (err) {
      if (requestId === availabilityRequestId.current) setAvailabilityError(err.message)
    } finally {
      if (requestId === availabilityRequestId.current) setAvailabilityLoading(false)
    }
  }, [bookingApi])

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
    }
  }, [user, location.pathname, location.search, navigate])

  useEffect(() => {
    if (form.service_id && services.some((service) => String(service.id) === form.service_id)) {
      // Start the availability request for services selected through a direct booking link.
      // oxlint-disable-next-line react/set-state-in-effect
      loadAvailability(form.service_id)
    }
  }, [form.service_id, services, loadAvailability])

  const review = (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (form.check_in_date < minDate || form.check_out_date <= form.check_in_date) {
      setError('Choose a check-in date today or later, and a check-out date after check-in.')
      return
    }
    if (!isStayAvailable(form.check_in_date, form.check_out_date, availableDates)) {
      setError('One or more nights in this date range are unavailable. Choose different dates.')
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
    setNeedsBookingCheck(false)
    setBusy(true)
    try {
      const res = await bookingApi.createBooking(form)
      const referenceNo = res?.booking?.reference_no
      if (!referenceNo) {
        throw new ApiRequestError('The server returned an incomplete booking confirmation.', 200)
      }
      setOk(`Booking ${referenceNo} submitted.`)
      setReviewing(false)
      await onBookingCreated()
    } catch (err) {
      if (err instanceof ApiRequestError && err.status >= 200 && err.status < 300) {
        setError('The booking may have been saved, but the server did not confirm it. Check My Bookings before trying again.')
        setNeedsBookingCheck(true)
        setReviewing(false)
        await onBookingCreated()
      } else {
        setError(err.message)
      }
      if (err.status === 409) {
        setForm((current) => ({ ...current, check_in_date: '', check_out_date: '' }))
        setReviewing(false)
        await loadAvailability(form.service_id)
      }
    } finally {
      setBusy(false)
    }
  }

  const chooseDate = (value) => {
    if (dateField === 'check_in_date') {
      const currentCheckOut = form.check_out_date
      setForm({
        ...form,
        check_in_date: value,
        check_out_date: currentCheckOut > value && isStayAvailable(value, currentCheckOut, availableDates)
          ? currentCheckOut
          : '',
      })
      setDateField('check_out_date')
      return
    }

    setForm({ ...form, check_out_date: value })
    setDateField('')
  }

  const firstDayOffset = (visibleMonth.getDay() + 6) % 7
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const calendarDays = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <main>
      <Banner title="Booking" breadcrumb="Booking" />
      <section className="content-section">
        <form className="form-grid" onSubmit={review}>
          <select value={form.service_id} onChange={(e) => {
            const serviceId = e.target.value
            setForm({ ...form, service_id: serviceId, check_in_date: '', check_out_date: '' })
            setReviewing(false)
            setDateField('')
            setAvailableDates(new Set())
            setAvailabilityError('')
            setAvailabilityLoading(Boolean(serviceId))
            if (!serviceId) {
              availabilityRequestId.current += 1
            }
          }} required disabled={!services.length}>
            <option value="">Select service</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.service_type})</option>)}
          </select>
          {serviceState.error ? (
            <p className="error-text field-wide" role="alert">
              Services could not be loaded. Booking is unavailable until the service list is restored.{' '}
              <button className="inline-retry-button" type="button" onClick={() => onRetryServices()}>Retry</button>
            </p>
          ) : serviceState.loading ? (
            <p className="field-wide" role="status">Loading available services…</p>
          ) : null}
          <div className="booking-date-picker">
            <p className="booking-date-label">Stay dates</p>
            <div className="booking-date-fields">
              <button
                className={dateField === 'check_in_date' ? 'booking-date-field is-active' : 'booking-date-field'}
                type="button"
                aria-expanded={dateField === 'check_in_date'}
                onClick={() => setDateField(dateField === 'check_in_date' ? '' : 'check_in_date')}
                disabled={!form.service_id || availabilityLoading || Boolean(availabilityError)}
              >
                <span>Check-in</span>
                <strong>{form.check_in_date || 'Select date'}</strong>
              </button>
              <button
                className={dateField === 'check_out_date' ? 'booking-date-field is-active' : 'booking-date-field'}
                type="button"
                aria-expanded={dateField === 'check_out_date'}
                onClick={() => setDateField(dateField === 'check_out_date' ? '' : 'check_out_date')}
                disabled={!form.service_id || !form.check_in_date || availabilityLoading || Boolean(availabilityError)}
              >
                <span>Check-out</span>
                <strong>{form.check_out_date || 'Select date'}</strong>
              </button>
            </div>
            {dateField && (
              <div className="booking-calendar" role="group" aria-label={`${dateField === 'check_in_date' ? 'Check-in' : 'Check-out'} date calendar`}>
                <div className="booking-calendar-header">
                  <button
                    className="booking-calendar-nav"
                    type="button"
                    aria-label="Previous month"
                    disabled={visibleMonth.getFullYear() === today.getFullYear() && visibleMonth.getMonth() === today.getMonth()}
                    onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                  >
                    ‹
                  </button>
                  <strong>{monthLabel}</strong>
                  <button
                    className="booking-calendar-nav"
                    type="button"
                    aria-label="Next month"
                    onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                  >
                    ›
                  </button>
                </div>
                <div className="booking-calendar-grid">
                  {WEEKDAYS.map((day) => <span className="booking-calendar-weekday" key={day}>{day}</span>)}
                  {calendarDays.map((day, index) => {
                    if (!day) return <span className="booking-calendar-blank" key={`blank-${index}`} />

                    const value = dateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day))
                    const canSelect = dateField === 'check_in_date'
                      ? value >= minDate && availableDates.has(value)
                      : value > form.check_in_date && isStayAvailable(form.check_in_date, value, availableDates)
                    const isSelected = value === form[dateField]
                    return (
                      <button
                        className={isSelected ? 'booking-calendar-day is-selected' : 'booking-calendar-day'}
                        type="button"
                        key={value}
                        disabled={!canSelect || availabilityLoading}
                        aria-label={`${value}${canSelect ? '' : ', unavailable'}`}
                        aria-pressed={isSelected}
                        onClick={() => chooseDate(value)}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                {availabilityLoading && <p className="booking-calendar-note">Checking availability…</p>}
                {!availabilityLoading && availableDates.size === 0 && !availabilityError && (
                  <p className="booking-calendar-note">No available dates are listed for this service yet.</p>
                )}
              </div>
            )}
            {availabilityError && (
              <p className="booking-calendar-error" role="alert">
                Could not load availability: {availabilityError}{' '}
                <button className="inline-retry-button" type="button" onClick={() => {
                  setAvailabilityError('')
                  setAvailabilityLoading(true)
                  loadAvailability(form.service_id)
                }}>Retry</button>
              </p>
            )}
            {form.service_id && availabilityLoading && <p className="booking-calendar-note" aria-live="polite">Checking available dates…</p>}
            {!form.service_id && <p className="booking-calendar-note">Choose a service to see its available dates.</p>}
          </div>
          <label>Guests<input type="number" min="1" max={selectedService?.capacity} placeholder="Number of guests" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} required /></label>
          <textarea placeholder="Special requests" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
          <button className="button" type="submit" disabled={!services.length || reviewing}>Review booking</button>
        </form>
        {!services.length && <p className="form-note">Bookings will be available when the resort adds services.</p>}
        {error && <p className="error-text" role="alert">
          {error}
          {needsBookingCheck && <> <Link className="text-link dark-link" to="/my-bookings">View My Bookings</Link></>}
        </p>}
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
