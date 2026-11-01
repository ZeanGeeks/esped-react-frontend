export {
  getActivityLogs,
  getBookingCalendar,
  getBookings,
  getDashboard,
  getFeedback,
  getGuests,
  getReports,
  getServiceAvailability,
  getServices,
  getSettings,
  saveService,
  saveServiceAvailability,
  saveSettings,
  updateBookingStatus,
  updateGuestStatus,
  updateServiceStatus,
} from './api/adminApi'
export const loadAdminBookingsPage = () => import('./pages/AdminBookingsPage')
export const loadAdminDataPages = () => import('./pages/AdminDataPages')
export const loadAdminDashboardPage = () => import('./pages/AdminDashboard')
