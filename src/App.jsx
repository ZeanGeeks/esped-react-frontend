import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApi, getBootErrorMessage } from './hooks/useApi'
import { HomePage, AboutOrContactPage, ServicesPage, RecommendationPage, BookingPage, MyBookingsPage, AuthPage } from './pages/public'
import { AdminDashboard, AdminBookings, GenericAdminList, AdminServices, AdminGuests, AdminSettingsPage } from './pages/admin'
import './App.css'

function App() {
  const { api } = useApi()
  const [bootError, setBootError] = useState('')
  const [user, setUser] = useState(null)
  const [homeData, setHomeData] = useState({ featured_services: [] })
  const [resortInfo, setResortInfo] = useState(null)
  const [services, setServices] = useState([])
  const [adminServices, setAdminServices] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [dashboard, setDashboard] = useState({})
  const [adminBookings, setAdminBookings] = useState([])
  const [adminCalendar, setAdminCalendar] = useState([])
  const [adminFeedback, setAdminFeedback] = useState([])
  const [adminGuests, setAdminGuests] = useState([])
  const [adminReports, setAdminReports] = useState([])
  const [adminLogs, setAdminLogs] = useState([])
  const [adminSettings, setAdminSettings] = useState({})

  const loadPublic = useCallback(async () => {
    const [homeRes, infoRes, servicesRes] = await Promise.all([
      api('/home'),
      api('/resort-info'),
      api('/services'),
    ])
    setHomeData(homeRes)
    setResortInfo(infoRes.resort_info)
    setServices(servicesRes.services || [])
  }, [api])

  const loadMe = useCallback(async () => {
    const me = await api('/auth/me')
    setUser(me.user || null)
  }, [api])

  const loadMyBookings = useCallback(async () => {
    if (!user || user.role !== 'guest') return
    const res = await api('/bookings/my')
    setMyBookings(res.bookings || [])
  }, [api, user])

  const loadAdmin = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    const [d, b, c, f, g, r, l, s, serviceList] = await Promise.all([
      api('/admin/dashboard'),
      api('/admin/bookings'),
      api('/admin/bookings/calendar'),
      api('/admin/feedback'),
      api('/admin/guests'),
      api('/admin/reports'),
      api('/admin/activity-logs'),
      api('/admin/settings'),
      api('/admin/services'),
    ])
    setDashboard(d)
    setAdminBookings(b.bookings || [])
    setAdminCalendar(c.events || [])
    setAdminFeedback(f.feedback || [])
    setAdminGuests(g.guests || [])
    setAdminReports(r.reports || [])
    setAdminLogs(l.activity_logs || [])
    setAdminSettings(s)
    setAdminServices(serviceList.services || [])
  }, [api, user])

  useEffect(() => {
    Promise.all([loadPublic(), loadMe()])
      .catch((err) => setBootError(getBootErrorMessage(err)))
  }, [loadMe, loadPublic])

  useEffect(() => {
    if (user?.role === 'guest') loadMyBookings().catch(() => {})
    if (user?.role === 'admin') loadAdmin().catch(() => {})
  }, [loadAdmin, loadMyBookings, user])

  const logout = async () => {
    await api('/auth/logout', { method: 'POST', body: {} })
    setUser(null)
  }

  const retryStartup = useCallback(async () => {
    setBootError('')
    try {
      await Promise.all([loadPublic(), loadMe()])
    } catch (err) {
      setBootError(getBootErrorMessage(err))
    }
  }, [loadMe, loadPublic])

  const refreshAdminBookings = useCallback(async (query = {}) => {
    const [rowsRes, calRes] = await Promise.all([
      api('/admin/bookings', { query }),
      api('/admin/bookings/calendar'),
    ])
    setAdminBookings(rowsRes.bookings || [])
    setAdminCalendar(calRes.events || [])
    const d = await api('/admin/dashboard')
    setDashboard(d)
  }, [api])

  const refreshAdminServices = useCallback(async () => {
    const result = await api('/admin/services')
    setAdminServices(result.services || [])
  }, [api])

  const refreshAdminGuests = useCallback(async () => {
    const result = await api('/admin/guests')
    setAdminGuests(result.guests || [])
  }, [api])

  const searchServices = useCallback(async (query) => {
    const result = await api('/services', { query })
    setServices(result.services || [])
  }, [api])

  if (bootError) {
    return (
      <main className="content-section">
        <h2>Resort server unavailable</h2>
        <p>{bootError}</p>
        <button type="button" onClick={retryStartup}>Try again</button>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={logout}>
        <Routes>
          <Route path="/" element={<HomePage homeData={homeData} />} />
          <Route path="/about" element={<AboutOrContactPage title="About" breadcrumb="Home / About" info={resortInfo} />} />
          <Route path="/contact" element={<AboutOrContactPage title="Contact" breadcrumb="Home / Contact" info={resortInfo} />} />
          <Route path="/services" element={<ServicesPage services={services} onSearch={searchServices} />} />
          <Route path="/recommendation" element={<RecommendationPage api={api} user={user} />} />
          <Route path="/booking" element={<BookingPage api={api} user={user} services={services} onBookingCreated={loadMyBookings} />} />
          <Route path="/my-bookings" element={user?.role === 'guest' ? <MyBookingsPage api={api} rows={myBookings} refresh={loadMyBookings} /> : <Navigate to="/login" />} />
          <Route path="/login" element={<AuthPage mode="login" api={api} onAuth={setUser} />} />
          <Route path="/register" element={<AuthPage mode="register" api={api} onAuth={setUser} />} />

          <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard dashboard={dashboard} /> : <Navigate to="/login" />} />
          <Route path="/admin/bookings" element={user?.role === 'admin' ? <AdminBookings api={api} rows={adminBookings} refresh={refreshAdminBookings} events={adminCalendar} /> : <Navigate to="/login" />} />
          <Route path="/admin/services" element={user?.role === 'admin' ? <AdminServices api={api} rows={adminServices} refresh={refreshAdminServices} /> : <Navigate to="/login" />} />
          <Route path="/admin/guests" element={user?.role === 'admin' ? <AdminGuests api={api} rows={adminGuests} refresh={refreshAdminGuests} /> : <Navigate to="/login" />} />
          <Route path="/admin/feedback" element={user?.role === 'admin' ? <GenericAdminList title="Feedback" breadcrumb="Admin / Feedback" rows={adminFeedback} columns={['id', 'username', 'service_name', 'rating', 'comment', 'created_at']} /> : <Navigate to="/login" />} />
          <Route path="/admin/reports" element={user?.role === 'admin' ? <GenericAdminList title="Reports" breadcrumb="Admin / Reports" rows={adminReports} columns={['report_date', 'booking_count', 'revenue']} /> : <Navigate to="/login" />} />
          <Route path="/admin/activity" element={user?.role === 'admin' ? <GenericAdminList title="Activity Logs" breadcrumb="Admin / Activity Logs" rows={adminLogs} columns={['id', 'admin_username', 'action', 'entity_type', 'entity_id', 'created_at']} /> : <Navigate to="/login" />} />
          <Route path="/admin/settings" element={user?.role === 'admin' ? <AdminSettingsPage api={api} settings={adminSettings} onSettingsChange={setAdminSettings} /> : <Navigate to="/login" />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App;
