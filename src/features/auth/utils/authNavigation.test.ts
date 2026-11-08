import { describe, expect, it } from 'vitest'
import { getPostLoginDestination, getRoleRedirect } from './authNavigation'

describe('getRoleRedirect', () => {
  it('allows the required role', () => {
    expect(getRoleRedirect('admin', 'admin')).toBeNull()
    expect(getRoleRedirect('guest', 'guest')).toBeNull()
  })

  it('sends an authenticated guest away from admin routes', () => {
    expect(getRoleRedirect('admin', 'guest')).toBe('/')
  })

  it('sends an authenticated admin to the admin area from guest-only routes', () => {
    expect(getRoleRedirect('guest', 'admin')).toBe('/admin')
  })

  it('asks signed-out users to log in', () => {
    expect(getRoleRedirect('admin', null)).toBe('/login')
  })
})

describe('getPostLoginDestination', () => {
  it('sends admins to the dashboard by default', () => {
    expect(getPostLoginDestination('admin', undefined)).toBe('/admin')
  })

  it('preserves an admin return path inside the admin area', () => {
    expect(getPostLoginDestination('admin', '/admin/services')).toBe('/admin/services')
  })

  it('does not send an admin to a guest area after signing in', () => {
    expect(getPostLoginDestination('admin', '/my-bookings')).toBe('/admin')
  })

  it('does not allow a guest to return to the admin area', () => {
    expect(getPostLoginDestination('guest', '/admin')).toBe('/')
    expect(getPostLoginDestination('guest', '/admin?tab=users')).toBe('/')
  })

  it('preserves a guest return path outside the admin area', () => {
    expect(getPostLoginDestination('guest', '/my-bookings')).toBe('/my-bookings')
  })

  it.each(['//example.com', '/\\example.com'])('rejects unsafe return path %s', (path) => {
    expect(getPostLoginDestination('guest', path)).toBe('/')
  })
})
