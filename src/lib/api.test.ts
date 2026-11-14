import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './api'
import { createBooking, createPayment, getPaymentStatus } from '@/features/booking/api/bookingApi'
import {
  login,
  register,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
  verifyPasswordResetCode,
} from '@/features/auth/api/authApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('uses the Vite API v1 route and serializes query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ services: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      request('/services', { query: { search: 'family cottage', inactive: null } }),
    ).resolves.toEqual({ services: [] })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/services?search=family+cottage',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('surfaces the server message from a successful non-JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html><body>Activity log table is unavailable.</body></html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    await expect(request('/bookings', { method: 'POST', body: {} }))
      .rejects.toThrow('Activity log table is unavailable.')
  })

  it('sends the Turnstile token with a booking submission', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const booking = {
      service_id: '4',
      check_in_date: '2026-12-01',
      check_out_date: '2026-12-02',
      guests: '2',
      special_requests: '',
      turnstile_token: 'turnstile-response-token',
    }

    await createBooking(booking)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/bookings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(booking),
      }),
    )
  })

  it('sends action-specific Turnstile tokens with password login and registration', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: 'guest' } }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await login({ email: 'guest@example.com', password: 'password123', turnstile_token: 'login-token' })
    await register({ username: 'Guest', email: 'guest@example.com', password: 'password123', turnstile_token: 'signup-token' })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'guest@example.com', password: 'password123', turnstile_token: 'login-token' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'Guest', email: 'guest@example.com', password: 'password123', turnstile_token: 'signup-token' }),
      }),
    )
  })

  it('preserves the server marker for a password-correct but unverified login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: false,
          error: 'Please verify your email before signing in.',
          requires_email_verification: true,
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(login({
      email: 'guest@example.com',
      password: 'password123',
      turnstile_token: 'login-token',
    })).rejects.toMatchObject({
      status: 403,
      requiresEmailVerification: true,
    })
  })

  it('submits email verification and resends a code through auth endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const verification = { email: 'guest@example.com', code: '123456' }
    const resend = { email: 'guest@example.com', turnstile_token: 'signup-token' }
    await verifyEmail(verification)
    await resendEmailVerification(resend)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/verify-email',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(verification) }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/resend-verification',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(resend) }),
    )
  })

  it('requests a password reset code, confirms it, and submits the new password', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const requestDetails = { email: 'guest@example.com', turnstile_token: 'reset-token' }
    const codeDetails = { email: 'guest@example.com', code: '123456' }
    const resetDetails = { email: 'guest@example.com', code: '123456', new_password: 'password456' }
    await requestPasswordReset(requestDetails)
    await verifyPasswordResetCode(codeDetails)
    await resetPassword(resetDetails)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/forgot-password',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(requestDetails) }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/verify-password-reset-code',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(codeDetails) }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/auth/reset-password',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(resetDetails) }),
    )
  })

  it('creates and checks a payment for the selected booking', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, payment: { status: 'Pending' } }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ payment: { status: 'Pending' } }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await createPayment(42, { reference_number: 'GCASH1234' })
    await getPaymentStatus(42)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/bookings/42/payment',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reference_number: 'GCASH1234' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/bookings/42/payment',
      expect.objectContaining({ method: undefined }),
    )
  })
})
