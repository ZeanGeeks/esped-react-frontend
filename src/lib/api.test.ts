import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './api'
import { createPayment, getPaymentStatus } from '@/features/booking/api/bookingApi'

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
