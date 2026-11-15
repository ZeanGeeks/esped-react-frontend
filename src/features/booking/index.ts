export {
  cancelBooking,
  createBooking,
  createPayment,
  getMyBookings,
  getPaymentStatus,
  getServiceAvailability,
  startPaymentIntent,
  submitBookingFeedback,
} from './api/bookingApi'
export const loadBookingPages = () => import('./pages/BookingPages')
export const loadMyBookingsPage = () => import('./pages/MyBookingsPage')
