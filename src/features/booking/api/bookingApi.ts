import { apiFetch, request } from '@/lib/api'

export const getMyBookings = () => request('/bookings/my')
export const getPaymentStatus = (bookingId) => request(`/bookings/${bookingId}/payment`)
export const getServiceAvailability = (serviceId) => request(`/services/${serviceId}/availability`)
export const createBooking = (details) => request('/bookings', { method: 'POST', body: details })
export const startPaymentIntent = (bookingId, details) => request(`/bookings/${bookingId}/payment/intent`, { method: 'POST', body: details })
export const createPayment = (bookingId, details) => apiFetch(`/bookings/${bookingId}/payment`, { method: 'POST', body: details })
export const cancelBooking = (bookingId) => request(`/bookings/${bookingId}/cancel`, { method: 'DELETE', body: {} })
export const submitBookingFeedback = (bookingId, details) => request(`/bookings/${bookingId}/feedback`, { method: 'POST', body: details })
