import { request } from '@/lib/api'

export const getCurrentUser = () => request('/auth/me')
export const login = (credentials) => request('/auth/login', { method: 'POST', body: credentials })
export const register = (details) => request('/auth/register', { method: 'POST', body: details })
export const logout = () => request('/auth/logout', { method: 'POST', body: {} })
