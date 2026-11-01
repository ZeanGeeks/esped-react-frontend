import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './api'

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
})
