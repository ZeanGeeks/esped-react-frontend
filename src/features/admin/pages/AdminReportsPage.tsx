import { useCallback, useEffect, useRef, useState } from 'react'
import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAdminApi } from '../hooks/useAdminApi'

type ReportRow = {
  report_date: string
  booking_count: number | string
  revenue: number | string
}

function dateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AdminReportsPage() {
  const adminApi = useAdminApi()
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    return {
      from: dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: dateInputValue(now),
    }
  })
  const [queryRange, setQueryRange] = useState(dateRange)
  const [report, setReport] = useState<{ rows: ReportRow[]; from: string; to: string }>({
    rows: [],
    from: '',
    to: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  const loadReport = useCallback(async (startDate, endDate) => {
    const currentRequestId = ++requestId.current
    setError('')
    setLoading(true)
    try {
      const result = await adminApi.getReports({ from: startDate, to: endDate })
      if (currentRequestId === requestId.current) {
        setReport({
          rows: result.reports || [],
          from: result.from,
          to: result.to,
        })
      }
    } catch (err) {
      if (currentRequestId === requestId.current) setError(err.message)
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [adminApi])

  useEffect(() => {
    const timer = window.setTimeout(() => loadReport(queryRange.from, queryRange.to), 0)
    return () => window.clearTimeout(timer)
  }, [loadReport, queryRange])

  const applyFilters = (event) => {
    event.preventDefault()
    if (!dateRange.from || !dateRange.to || dateRange.from > dateRange.to) {
      setError('Choose a valid date range.')
      return
    }
    setQueryRange({ ...dateRange })
  }

  const totals = report.rows.reduce((result, row) => ({
    bookings: result.bookings + Number(row.booking_count || 0),
    value: result.value + Number(row.revenue || 0),
  }), { bookings: 0, value: 0 })

  return (
    <main className="admin-main print-report">
      <Banner title="Reports" breadcrumb="Admin / Reports" />
      <section className="content-section">
        <form className="report-controls" onSubmit={applyFilters}>
          <label>
            From
            <input
              type="date"
              value={dateRange.from}
              max={dateRange.to || undefined}
              onChange={(event) => setDateRange((range) => ({ ...range, from: event.target.value }))}
              required
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={dateRange.to}
              min={dateRange.from || undefined}
              onChange={(event) => setDateRange((range) => ({ ...range, to: event.target.value }))}
              required
            />
          </label>
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Apply dates'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => window.print()} disabled={loading || !report.from}>
            Print / Save as PDF
          </button>
        </form>

        {error && <p className="error-text" role="alert">{error}</p>}

        <div className="report-heading">
          <p className="section-kicker">Booking summary</p>
          <h2>{report.from && report.to ? `${report.from} to ${report.to}` : 'Select a date range'}</h2>
          <p className="form-note">Rows are grouped by booking submission date. Booking value is based on booking totals; it is not verified paid revenue.</p>
        </div>

        <div className="report-summary">
          <article className="stat-card">
            <span>Bookings</span>
            <strong>{totals.bookings}</strong>
          </article>
          <article className="stat-card">
            <span>Total booking value</span>
            <strong>₱{totals.value.toFixed(2)}</strong>
          </article>
        </div>

        {report.rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Bookings</th><th>Total booking value</th></tr></thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.report_date}>
                    <td>{row.report_date}</td>
                    <td>{row.booking_count}</td>
                    <td>₱{Number(row.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th>Total</th><th>{totals.bookings}</th><th>₱{totals.value.toFixed(2)}</th></tr>
              </tfoot>
            </table>
          </div>
        ) : !loading && !error ? (
          <EmptyState title="No bookings in this period" description="Try a different date range." />
        ) : null}
      </section>
    </main>
  )
}
