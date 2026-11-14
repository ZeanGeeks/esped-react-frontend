import { request } from '@/lib/api'

export const getCurrentUser = () => request('/auth/me')
export const login = (credentials) => request('/auth/login', { method: 'POST', body: credentials })
export const register = (details) => request('/auth/register', { method: 'POST', body: details })
export const verifyEmail = (details) => request('/auth/verify-email', { method: 'POST', body: details })
export const resendEmailVerification = (details) => request('/auth/resend-verification', { method: 'POST', body: details })
export const requestPasswordReset = (details) => request('/auth/forgot-password', { method: 'POST', body: details })
export const verifyPasswordResetCode = (details) => request('/auth/verify-password-reset-code', { method: 'POST', body: details })
export const resetPassword = (details) => request('/auth/reset-password', { method: 'POST', body: details })
export const googleLogin = (credential: string) => request('/auth/google', { method: 'POST', body: { credential } })
export const logout = () => request('/auth/logout', { method: 'POST', body: {} })
