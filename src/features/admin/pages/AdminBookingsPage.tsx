import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { useAdminApi } from '../hooks/useAdminApi'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

type PendingPayment = {
  id: number
  booking_reference: string
  guest_name: string
  email: string
  amount: number | string
  reference_number: string
  created_at: string
  receipt_available: boolean
}

type ActivePaymentIntent = {
  id: number
  booking_reference: string
  guest_name: string
  email: string
  amount: number | string
  started_at: string
  expires_at: string
}

function toCalendarDate(value) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  }
  return new Date(value)
}

export function AdminBookings({ rows, refresh, events, loading, error, calendarLoading, calendarError }) {
  const adminApi = useAdminApi()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [calendarView, setCalendarView] = useState('month')
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [activePaymentIntents, setActivePaymentIntents] = useState<ActivePaymentIntent[]>([])
  const [paymentRejectionReasons, setPaymentRejectionReasons] = useState({})
  const [paymentReviewError, setPaymentReviewError] = useState('')
  const [reviewingPaymentId, setReviewingPaymentId] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState<{ paymentId: number; imageUrl: string } | null>(null)
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null)
  const [activeIntentError, setActiveIntentError] = useState('')

  useEffect(() => {
    const id = setTimeout(() => refresh({ search, status }), 250)
    return () => clearTimeout(id)
  }, [search, status, refresh])

  const loadPendingPayments = useCallback(async () => {
    try {
      const result = await adminApi.getPendingPayments()
      setPendingPayments(result.payments)
      setPaymentReviewError('')
    } catch (requestError) {
      setPaymentReviewError(requestError.message)
    }
  }, [adminApi])

  const loadActivePaymentIntents = useCallback(async () => {
    try {
      const result = await adminApi.getActivePaymentIntents()
      setActivePaymentIntents(result.intents || [])
      setActiveIntentError('')
    } catch (requestError) {
      setActiveIntentError(requestError.message)
    }
  }, [adminApi])

  useEffect(() => {
    void loadPendingPayments()
    void loadActivePaymentIntents()
  }, [loadActivePaymentIntents, loadPendingPayments])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPendingPayments()
      void loadActivePaymentIntents()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [loadActivePaymentIntents, loadPendingPayments])

  const viewReceipt = async (paymentId: number) => {
    setReceiptLoadingId(paymentId)
    setPaymentReviewError('')
    try {
      const result = await adminApi.getPaymentReceipt(paymentId)
      setReceiptPreview({
        paymentId,
        imageUrl: `data:${result.mime_type};base64,${result.image_base64}`,
      })
    } catch (requestError) {
      setPaymentReviewError(requestError.message)
    } finally {
      setReceiptLoadingId(null)
    }
  }

  const reviewPayment = async (paymentId, paymentStatus) => {
    setReviewingPaymentId(paymentId)
    setPaymentReviewError('')
    try {
      await adminApi.reviewPayment(paymentId, {
        status: paymentStatus,
        rejection_reason: paymentRejectionReasons[paymentId] || '',
      })
      await loadPendingPayments()
      await loadActivePaymentIntents()
      await refresh({ search, status })
    } catch (requestError) {
      setPaymentReviewError(requestError.message)
      throw requestError
    } finally {
      setReviewingPaymentId(null)
    }
  }

  const act = async (id, action) => {
    await adminApi.updateBookingStatus(id, action)
    await refresh({ search, status })
  }

  const calendarEvents = useMemo(() => (events || []).map((event) => ({
    id: event.id,
    title: `${event.reference_no} • ${event.service_name}`,
    start: toCalendarDate(event.check_in_date),
    end: toCalendarDate(event.check_out_date),
  })), [events])

  return (
    <main className="admin-main">
      <Banner title="Booking Management" breadcrumb="Admin / Bookings" />
      <section className="content-section">
        <div className="admin-panel active-payment-intents-panel">
          <div className="gcash-review-heading">
            <div>
              <p className="section-kicker">Live payment activity</p>
              <h2>Guests currently paying</h2>
              <p className="gcash-review-description">A guest has accepted the payment terms and opened the GCash payment step. This is not proof of payment.</p>
            </div>
            <div className="gcash-review-count" aria-live="polite" role="status">
              <strong>{activePaymentIntents.length}</strong>
              <span>{activePaymentIntents.length === 1 ? 'active session' : 'active sessions'}</span>
            </div>
          </div>
          {activeIntentError && <p className="error-text" role="alert">{activeIntentError}</p>}
          {activePaymentIntents.length ? (
            <div className="active-payment-intents">
              {activePaymentIntents.map((intent) => (
                <article className="active-payment-intent" key={intent.id}>
                  <div>
                    <strong>{intent.booking_reference}</strong>
                    <span>{intent.guest_name}</span>
                    <a href={`mailto:${intent.email}`}>{intent.email}</a>
                  </div>
                  <div>
                    <strong>Expected deposit ₱{Number(intent.amount).toFixed(2)}</strong>
                    <span>Started {intent.started_at}</span>
                    <span>Window ends {intent.expires_at}</span>
                  </div>
                  <span className="payment-status payment-status--in-progress">Payment in progress</span>
                </article>
              ))}
            </div>
          ) : !activeIntentError ? <p className="form-note">No guests are currently in the payment step.</p> : null}
        </div>
        <div className="admin-panel gcash-review-panel">
          <div className="gcash-review-heading">
            <div>
              <p className="section-kicker">Payment verification</p>
              <h2>Deposits awaiting review</h2>
              <p className="gcash-review-description">
                Match the submitted reference and exact amount in GCash before taking action.
              </p>
            </div>
            <div
              className="gcash-review-count"
              aria-label={`${pendingPayments.length} deposits awaiting review`}
              aria-live="polite"
              role="status"
            >
              <strong>{pendingPayments.length}</strong>
              <span>{pendingPayments.length === 1 ? 'deposit to review' : 'deposits to review'}</span>
            </div>
          </div>
          {paymentReviewError && <p className="error-text" role="alert">{paymentReviewError}</p>}
          {pendingPayments.length ? (
            <div className="table-wrap gcash-review-table-wrap">
              <table className="table gcash-review-table">
                <thead>
                  <tr><th>Booking</th><th>Guest</th><th>Deposit</th><th>GCash reference</th><th>Receipt</th><th>Submitted</th><th>Review</th></tr>
                </thead>
                <tbody>
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td><strong className="gcash-review-booking">{payment.booking_reference}</strong></td>
                      <td>{payment.guest_name}<small className="gcash-review-email">{payment.email}</small></td>
                      <td>
                        <strong className="gcash-review-amount">₱{Number(payment.amount).toFixed(2)}</strong>
                        <small className="gcash-review-email">Deposit submitted</small>
                      </td>
                      <td><code className="gcash-review-reference">{payment.reference_number}</code></td>
                      <td>
                        {payment.receipt_available
                          ? <button className="text-button" disabled={receiptLoadingId === payment.id} onClick={() => viewReceipt(payment.id)} type="button">{receiptLoadingId === payment.id ? 'Loading…' : 'View image'}</button>
                          : <span className="form-note">Not attached</span>}
                      </td>
                      <td>{payment.created_at}</td>
                      <td className="gcash-review-actions">
                        <ConfirmAction
                          className="gcash-verify-button"
                          title="Verify this GCash deposit?"
                          description={`Confirm that GCash reference ${payment.reference_number} is present in your GCash transaction history and the received amount is ₱${Number(payment.amount).toFixed(2)}.`}
                          confirmLabel="Verify deposit"
                          disabled={reviewingPaymentId === payment.id}
                          onConfirm={() => reviewPayment(payment.id, 'Verified')}
                        >Verify deposit</ConfirmAction>
                        <div className="gcash-reject-control">
                          <input
                            aria-label={`Rejection reason for ${payment.booking_reference}`}
                            maxLength={255}
                            onChange={(event) => setPaymentRejectionReasons((previous) => ({
                              ...previous,
                              [payment.id]: event.target.value,
                            }))}
                            placeholder="Reason required to reject"
                            value={paymentRejectionReasons[payment.id] || ''}
                          />
                          <ConfirmAction
                            className="gcash-reject-button"
                            title="Reject this GCash payment?"
                            description={`Reject reference ${payment.reference_number}. The reason will be shown to the guest.`}
                            confirmLabel="Reject payment"
                            disabled={reviewingPaymentId === payment.id || !paymentRejectionReasons[payment.id]?.trim()}
                            danger
                            onConfirm={() => reviewPayment(payment.id, 'Rejected')}
                          >Reject</ConfirmAction>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !paymentReviewError ? <p className="form-note">There are no GCash deposits waiting for review.</p> : null}
          {receiptPreview && (
            <div className="payment-receipt-preview">
              <div><strong>Submitted receipt</strong><button className="text-button" onClick={() => setReceiptPreview(null)} type="button">Close</button></div>
              <img alt={`Payment receipt for payment ${receiptPreview.paymentId}`} src={receiptPreview.imageUrl} />
            </div>
          )}
        </div>
        <div className="toolbar toolbar--two-column">
          <input placeholder="Search booking..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        {rows.length ? <div className="table-wrap"><table className="table">
          <thead>
            <tr><th>Reference</th><th>Guest</th><th>Service</th><th>Status</th><th>Payment</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.reference_no}</td>
                <td>{row.username}</td>
                <td>{row.service_name}</td>
                <td>{row.status}</td>
                <td><span className={`payment-status payment-status--${(row.payment_status || 'Unpaid').toLowerCase()}`}>{row.payment_status || 'Unpaid'}</span></td>
                <td className="btn-stack">
                  {row.status === 'Pending' && <>
                    <ConfirmAction title="Confirm this booking?" description={`Confirm ${row.reference_no} and notify the guest. Availability will be checked first.`} confirmLabel="Confirm booking" onConfirm={() => act(row.id, 'confirm')}>Confirm</ConfirmAction>
                    <ConfirmAction title="Reject this booking?" description={`This will cancel booking ${row.reference_no} and notify the guest.`} confirmLabel="Reject booking" danger onConfirm={() => act(row.id, 'reject')}>Reject</ConfirmAction>
                  </>}
                  {row.status === 'Confirmed' && (
                    <ConfirmAction title="Mark this stay complete?" description={`Mark ${row.reference_no} as completed after the guest's stay.`} confirmLabel="Complete stay" onConfirm={() => act(row.id, 'complete')}>Complete</ConfirmAction>
                  )}
                  {!['Pending', 'Confirmed'].includes(row.status) && <span className="form-note">No actions</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div> : !loading && !error ? <EmptyState title="No bookings found" description="New reservations will appear here for review." /> : null}
        <div className="admin-panel calendar-box">
          <div className="panel-heading"><p className="section-kicker">Schedule</p><h2>Booking calendar</h2></div>
          {!calendarEvents.length && !calendarLoading && !calendarError && <p className="form-note">Pending, confirmed, and completed stays will appear on the calendar.</p>}
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            date={calendarDate}
            view={calendarView}
            onNavigate={setCalendarDate}
            onView={setCalendarView}
            style={{ height: 500 }}
          />
        </div>
      </section>
    </main>
  )
}
