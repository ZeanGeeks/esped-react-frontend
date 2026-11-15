import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banner } from '@/components/layout/AppShell'
import { Link } from 'react-router-dom'
import { useAdminApi } from '../hooks/useAdminApi'

export function AdminDashboard({ dashboard, refresh }) {
  const adminApi = useAdminApi()
  const [updatingInquiryId, setUpdatingInquiryId] = useState<number | null>(null)
  const [inquiryError, setInquiryError] = useState('')

  const updateInquiryStatus = async (inquiryId: number, status: string) => {
    setUpdatingInquiryId(inquiryId)
    setInquiryError('')
    try {
      await adminApi.updateContactInquiryStatus(inquiryId, status)
      await refresh()
    } catch (requestError) {
      setInquiryError(requestError.message)
    } finally {
      setUpdatingInquiryId(null)
    }
  }

  return (
    <main className="admin-main">
      <Banner title="Admin Dashboard" breadcrumb="Admin / Dashboard" />
      <section className="content-section">
        <div className="dashboard-stats">
          <article className="stat-card"><span>Pending bookings</span><strong>{dashboard.cards?.pending ?? 0}</strong></article>
          <article className="stat-card"><span>Confirmed bookings</span><strong>{dashboard.cards?.confirmed ?? 0}</strong></article>
          <article className="stat-card"><span>Guest accounts</span><strong>{dashboard.cards?.guests ?? 0}</strong></article>
          <article className="stat-card"><span>Completed revenue</span><strong>₱{Number(dashboard.cards?.revenue ?? 0).toFixed(2)}</strong></article>
          <article className="stat-card"><span>Open inquiries</span><strong>{dashboard.cards?.open_inquiries ?? 0}</strong></article>
        </div>
        <div className="admin-panel chart-panel">
          <div className="panel-heading"><p className="section-kicker">Performance</p><h2>Booking activity</h2></div>
          {dashboard.chart?.length ? (
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboard.chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="report_date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#C7A34B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="form-note">Booking activity will appear here once reservations have been made.</p>}
        </div>
        <div className="admin-panel active-payment-intents-panel">
          <div className="panel-heading">
            <p className="section-kicker">Live payment activity</p>
            <h2>Guests currently paying</h2>
            <p>These guests accepted the payment terms and opened the GCash payment step. This is not proof of payment.</p>
          </div>
          {dashboard.active_payment_intents?.length ? (
            <>
              <div className="active-payment-intents">
                {dashboard.active_payment_intents.slice(0, 5).map((intent) => (
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
              <Link className="text-link" to="/admin/bookings">Open booking payment review</Link>
            </>
          ) : <p className="form-note">No guests are currently in the payment step.</p>}
        </div>
        <div className="admin-panel inquiry-panel">
          <div className="panel-heading">
            <p className="section-kicker">Guest messages</p>
            <h2>Recent contact inquiries</h2>
            <p>New messages submitted from the public Contact page appear here.</p>
          </div>
          {inquiryError && <p className="error-text" role="alert">{inquiryError}</p>}
          {dashboard.latest_inquiries?.length ? (
            <div className="inquiry-list">
              {dashboard.latest_inquiries.map((inquiry) => (
                <article className="inquiry-card" key={inquiry.id}>
                  <div className="inquiry-card__heading">
                    <div>
                      <p className="section-kicker">{inquiry.subject}</p>
                      <h3>{inquiry.name}</h3>
                    </div>
                    <select
                      aria-label={`Status for inquiry from ${inquiry.name}`}
                      disabled={updatingInquiryId === inquiry.id}
                      onChange={(event) => updateInquiryStatus(inquiry.id, event.target.value)}
                      value={inquiry.status}
                    >
                      <option>New</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </select>
                  </div>
                  <p className="inquiry-card__message">{inquiry.message}</p>
                  <div className="inquiry-card__contact">
                    <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                    {inquiry.phone && <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>}
                    <time dateTime={inquiry.created_at}>{inquiry.created_at}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="form-note">No contact inquiries have been submitted yet.</p>}
        </div>
      </section>
    </main>
  )
}
