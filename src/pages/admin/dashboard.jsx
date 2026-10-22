import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banner } from '../../components/layout/AppShell'

export function AdminDashboard({ dashboard }) {
  return (
    <main className="admin-main">
      <Banner title="Admin Dashboard" breadcrumb="Admin / Dashboard" />
      <section className="content-section">
        <div className="dashboard-stats">
          <article className="stat-card"><span>Pending bookings</span><strong>{dashboard.cards?.pending ?? 0}</strong></article>
          <article className="stat-card"><span>Confirmed bookings</span><strong>{dashboard.cards?.confirmed ?? 0}</strong></article>
          <article className="stat-card"><span>Guest accounts</span><strong>{dashboard.cards?.guests ?? 0}</strong></article>
          <article className="stat-card"><span>Completed revenue</span><strong>₱{Number(dashboard.cards?.revenue ?? 0).toFixed(2)}</strong></article>
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
      </section>
    </main>
  )
}
