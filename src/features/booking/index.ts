export {
  cancelBooking,
  createBooking,
  getMyBookings,
  getServiceAvailability,
  submitBookingFeedback,
} from './api/bookingApi'
export const loadBookingPages = () => import('./pages/BookingPages')
export const loadMyBookingsPage = () => import('./pages/MyBookingsPage')
