import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    const id = setTimeout(() => refresh({ search, status }), 250)
    return () => clearTimeout(id)
  }, [search, status, refresh])

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
            <tr><th>Reference</th><th>Guest</th><th>Service</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.reference_no}</td>
                <td>{row.username}</td>
                <td>{row.service_name}</td>
                <td>{row.status}</td>
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
