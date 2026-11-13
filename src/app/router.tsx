import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getRoleRedirect, loadAuthPage } from '@/features/auth'
import { loadBookingPages, loadMyBookingsPage } from '@/features/booking'
import { loadDiscoveryPages, loadHomePages } from '@/features/public-site'
import { loadAdminBookingsPage, loadAdminDataPages, loadAdminDashboardPage } from '@/features/admin'
import { ResourceNotice } from '@/components/ui/ResourceNotice'

const AuthPage = lazy(() => loadAuthPage().then((pages) => ({ default: pages.AuthPage })))
const BookingPage = lazy(() => loadBookingPages().then((pages) => ({ default: pages.BookingPage })))
const MyBookingsPage = lazy(() => loadMyBookingsPage().then((pages) => ({ default: pages.MyBookingsPage })))
const HomePage = lazy(() => loadHomePages().then((pages) => ({ default: pages.HomePage })))
const AboutOrContactPage = lazy(() => loadHomePages().then((pages) => ({ default: pages.AboutOrContactPage })))
const ServicesPage = lazy(() => loadDiscoveryPages().then((pages) => ({ default: pages.ServicesPage })))
const RecommendationPage = lazy(() => loadDiscoveryPages().then((pages) => ({ default: pages.RecommendationPage })))
const AdminBookings = lazy(() => loadAdminBookingsPage().then((pages) => ({ default: pages.AdminBookings })))
const AdminDashboard = lazy(() => loadAdminDashboardPage().then((pages) => ({ default: pages.AdminDashboard })))
const AdminDataPages = lazy(() => loadAdminDataPages().then((pages) => ({ default: pages.AdminDataPages })))

function RequireRole({
  role,
  user,
  loading,
  children,
}: {
  role: 'admin' | 'guest'
  user: { role: string } | null
  loading: boolean
  children: ReactNode
}) {
  const location = useLocation()

  if (loading) {
    return <p className="resource-notice" role="status">Checking your account…</p>
  }
  const redirect = getRoleRedirect(role, user?.role ?? null)
  if (!redirect) return children
  if (redirect === '/login') {
    return <Navigate to={redirect} replace state={{ from: location.pathname }} />
  }
  return <Navigate to={redirect} replace />
}

export function AppRouter({ data }) {
  const {
    user,
    setUser,
    homeData,
    resortInfo,
    services,
    myBookings,
    dashboard,
    adminBookings,
    adminCalendar,
    adminFeedback,
    adminGuests,
    adminLogs,
    adminSettings,
    adminServices,
    resourceStates,
    loadHome,
    loadResortInfo,
    loadServices,
    loadMyBookings,
    loadAdminDashboard,
    loadAdminFeedback,
    loadAdminLogs,
    loadAdminSettings,
    refreshAdminBookings,
    refreshAdminServices,
    refreshAdminGuests,
    searchServices,
  } = data

  return (
    <Suspense fallback={<p className="resource-notice" role="status">Loading page…</p>}>
      <>
        {resourceStates.auth.error && (
          <div className="auth-resource-notice">
            <ResourceNotice state={resourceStates.auth} onRetry={data.loadMe} />
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage homeData={homeData} resourceState={resourceStates.home} onRetry={loadHome} />} />
          <Route path="/about" element={<>
            <ResourceNotice state={resourceStates.resortInfo} onRetry={loadResortInfo} />
            <AboutOrContactPage title="About" breadcrumb="About" info={resortInfo} />
          </>} />
          <Route path="/contact" element={<>
            <ResourceNotice state={resourceStates.resortInfo} onRetry={loadResortInfo} />
            <AboutOrContactPage title="Contact" breadcrumb="Contact" info={resortInfo} />
          </>} />
          <Route path="/services" element={<ServicesPage services={services} onSearch={searchServices} resourceState={resourceStates.services} />} />
          <Route path="/recommendation" element={<RecommendationPage />} />
          <Route path="/booking" element={<BookingPage
            user={user}
            services={services}
            onBookingCreated={loadMyBookings}
            serviceState={resourceStates.services}
            onRetryServices={loadServices}
          />} />
          <Route path="/my-bookings" element={<RequireRole role="guest" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.guestBookings} onRetry={loadMyBookings} />
            <MyBookingsPage
              rows={myBookings}
              refresh={loadMyBookings}
              loading={resourceStates.guestBookings.loading}
              error={resourceStates.guestBookings.error}
            />
          </RequireRole>} />
          <Route path="/login" element={<AuthPage mode="login" onAuth={setUser} />} />
          <Route path="/register" element={<AuthPage mode="register" onAuth={setUser} />} />
          <Route path="/admin" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminDashboard} onRetry={loadAdminDashboard} />
            <AdminDashboard dashboard={dashboard} />
          </RequireRole>} />
          <Route path="/admin/bookings" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminBookings} onRetry={refreshAdminBookings} />
            <ResourceNotice state={resourceStates.adminCalendar} onRetry={refreshAdminBookings} />
            <AdminBookings
              rows={adminBookings}
              refresh={refreshAdminBookings}
              events={adminCalendar}
              loading={resourceStates.adminBookings.loading}
              error={resourceStates.adminBookings.error}
              calendarLoading={resourceStates.adminCalendar.loading}
              calendarError={resourceStates.adminCalendar.error}
            />
          </RequireRole>} />
          <Route path="/admin/services" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminServices} onRetry={refreshAdminServices} />
            <AdminDataPages
              page="services"
              rows={adminServices}
              refresh={refreshAdminServices}
              loading={resourceStates.adminServices.loading}
              error={resourceStates.adminServices.error}
            />
          </RequireRole>} />
          <Route path="/admin/services/:serviceId/availability" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminServices} onRetry={refreshAdminServices} />
            <AdminDataPages
              page="service-availability"
              services={adminServices}
              loading={resourceStates.adminServices.loading}
              error={resourceStates.adminServices.error}
            />
          </RequireRole>} />
          <Route path="/admin/guests" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminGuests} onRetry={refreshAdminGuests} />
            <AdminDataPages
              page="guests"
              rows={adminGuests}
              refresh={refreshAdminGuests}
              loading={resourceStates.adminGuests.loading}
              error={resourceStates.adminGuests.error}
            />
          </RequireRole>} />
          <Route path="/admin/feedback" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminFeedback} onRetry={loadAdminFeedback} />
            <AdminDataPages
              page="list"
              title="Feedback"
              breadcrumb="Admin / Feedback"
              rows={adminFeedback}
              columns={['id', 'username', 'service_name', 'rating', 'comment', 'created_at']}
              loading={resourceStates.adminFeedback.loading}
              error={resourceStates.adminFeedback.error}
            />
          </RequireRole>} />
          <Route path="/admin/reports" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}><AdminDataPages page="reports" /></RequireRole>} />
          <Route path="/admin/activity" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminLogs} onRetry={loadAdminLogs} />
            <AdminDataPages
              page="list"
              title="Activity Logs"
              breadcrumb="Admin / Activity Logs"
              rows={adminLogs}
              columns={['id', 'admin_username', 'action', 'entity_type', 'entity_id', 'created_at']}
              loading={resourceStates.adminLogs.loading}
              error={resourceStates.adminLogs.error}
            />
          </RequireRole>} />
          <Route path="/admin/settings" element={<RequireRole role="admin" user={user} loading={resourceStates.auth.loading}>
            <ResourceNotice state={resourceStates.adminSettings} onRetry={loadAdminSettings} />
            <AdminDataPages
              page="settings"
              settings={adminSettings}
              onSettingsChange={data.setAdminSettings}
              loading={resourceStates.adminSettings.loading}
              dataError={resourceStates.adminSettings.error}
            />
          </RequireRole>} />
        </Routes>
      </>
    </Suspense>
  )
}
