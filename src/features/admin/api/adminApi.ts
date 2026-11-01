import { request } from '@/lib/api'

export const getDashboard = () => request('/admin/dashboard')
export const getBookings = (query) => request('/admin/bookings', { query })
export const getBookingCalendar = () => request('/admin/bookings/calendar')
export const updateBookingStatus = (bookingId, action) => request(`/admin/bookings/${bookingId}/${action}`, { method: 'PUT', body: {} })
export const getFeedback = () => request('/admin/feedback')
export const getGuests = () => request('/admin/guests')
export const updateGuestStatus = (guestId, isActive) => request(`/admin/guests/${guestId}/status`, { method: 'PUT', body: { is_active: isActive } })
export const getActivityLogs = () => request('/admin/activity-logs')
export const getSettings = () => request('/admin/settings')
export const saveSettings = (settings) => request('/admin/settings', { method: 'PUT', body: settings })
export const exportBackup = () => request('/admin/backup/export')
export const getServices = () => request('/admin/services')
export const saveService = (serviceId, details) => request(serviceId ? `/admin/services/${serviceId}` : '/admin/services', {
  method: serviceId ? 'PUT' : 'POST',
  body: details,
})
export const updateServiceStatus = (serviceId, isActive) => request(`/admin/services/${serviceId}`, {
  method: 'PUT',
  body: { is_active: isActive },
})
export const getServiceAvailability = (serviceId) => request(`/admin/services/${serviceId}/availability`)
export const saveServiceAvailability = (serviceId, availability) => request(`/admin/services/${serviceId}/availability`, {
  method: 'PUT',
  body: availability,
})
export const getReports = (query) => request('/admin/reports', { query })
