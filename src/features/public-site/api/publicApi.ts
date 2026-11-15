import { request } from '@/lib/api'

export const getHome = () => request('/home')
export const getResortInfo = () => request('/resort-info')
export const getServices = (query) => request('/services', { query })
export const getRecommendation = (details) => request('/recommendation', { method: 'POST', body: details })
export const createContactInquiry = (details) => request('/contact-inquiries', { method: 'POST', body: details })
