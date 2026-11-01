import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { ApiRequestError } from '@/lib/api'
import * as authApi from '@/features/auth'
import * as bookingApi from '@/features/booking'
import * as publicApi from '@/features/public-site'
import * as adminApi from '@/features/admin'

type User = {
  username: string
  role: 'admin' | 'guest'
}

function initialResourceStates() {
  return {
    home: { loading: true, error: '' },
    resortInfo: { loading: true, error: '' },
    services: { loading: true, error: '' },
    auth: { loading: true, error: '' },
    guestBookings: { loading: false, error: '' },
    adminDashboard: { loading: false, error: '' },
    adminBookings: { loading: false, error: '' },
    adminCalendar: { loading: false, error: '' },
    adminFeedback: { loading: false, error: '' },
    adminGuests: { loading: false, error: '' },
    adminLogs: { loading: false, error: '' },
    adminSettings: { loading: false, error: '' },
    adminServices: { loading: false, error: '' },
  }
}

export function useAppData() {
  const [resourceStates, setResourceStates] = useState(initialResourceStates)
  const [user, setUser] = useState<User | null>(null)
  const [homeData, setHomeData] = useState({ featured_services: [] })
  const [resortInfo, setResortInfo] = useState(null)
  const [services, setServices] = useState([])
  const [adminServices, setAdminServices] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [dashboard, setDashboard] = useState({})
  const [adminBookings, setAdminBookings] = useState([])
  const [adminCalendar, setAdminCalendar] = useState([])
  const [adminFeedback, setAdminFeedback] = useState([])
  const [adminGuests, setAdminGuests] = useState([])
  const [adminLogs, setAdminLogs] = useState([])
  const [adminSettings, setAdminSettings] = useState({})

  const loadResource = useCallback(async (key, requestResource, onSuccess) => {
    setResourceStates((states) => ({ ...states, [key]: { loading: true, error: '' } }))
    try {
      const result = await requestResource()
      if (onSuccess) onSuccess(result)
      setResourceStates((states) => ({ ...states, [key]: { loading: false, error: '' } }))
      return result
    } catch (error) {
      setResourceStates((states) => ({
        ...states,
        [key]: { loading: false, error: getApiErrorMessage(error) },
      }))
      return null
    }
  }, [])

  const loadHome = useCallback(() => (
    loadResource('home', publicApi.getHome, setHomeData)
  ), [loadResource])

  const loadResortInfo = useCallback(() => (
    loadResource('resortInfo', publicApi.getResortInfo, (result) => setResortInfo(result.resort_info))
  ), [loadResource])

  const loadServices = useCallback((query = {}) => (
    loadResource('services', () => publicApi.getServices(query), (result) => setServices(result.services || []))
  ), [loadResource])

  const loadPublic = useCallback(async () => {
    await Promise.all([loadHome(), loadResortInfo(), loadServices()])
  }, [loadHome, loadResortInfo, loadServices])

  const loadMe = useCallback(async () => {
    try {
      const me = await authApi.getCurrentUser()
      setUser(me.user || null)
      setResourceStates((states) => ({ ...states, auth: { loading: false, error: '' } }))
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setUser(null)
        setResourceStates((states) => ({ ...states, auth: { loading: false, error: '' } }))
        return
      }
      setResourceStates((states) => ({
        ...states,
        auth: { loading: false, error: getApiErrorMessage(error) },
      }))
    }
  }, [])

  const loadMyBookings = useCallback(async () => {
    if (!user || user.role !== 'guest') return
    return loadResource('guestBookings', bookingApi.getMyBookings, (result) => setMyBookings(result.bookings || []))
  }, [loadResource, user])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const refreshAdminBookings = useCallback(async (query = {}) => {
    await Promise.all([
      loadResource('adminBookings', () => adminApi.getBookings(query), (result) => setAdminBookings(result.bookings || [])),
      loadResource('adminCalendar', adminApi.getBookingCalendar, (result) => setAdminCalendar(result.events || [])),
    ])
  }, [loadResource])

  const loadAdminDashboard = useCallback(() => (
    loadResource('adminDashboard', adminApi.getDashboard, setDashboard)
  ), [loadResource])

  const loadAdminFeedback = useCallback(() => (
    loadResource('adminFeedback', adminApi.getFeedback, (result) => setAdminFeedback(result.feedback || []))
  ), [loadResource])

  const loadAdminLogs = useCallback(() => (
    loadResource('adminLogs', adminApi.getActivityLogs, (result) => setAdminLogs(result.activity_logs || []))
  ), [loadResource])

  const loadAdminSettings = useCallback(() => (
    loadResource('adminSettings', adminApi.getSettings, setAdminSettings)
  ), [loadResource])

  const refreshAdminServices = useCallback(() => (
    loadResource('adminServices', adminApi.getServices, (result) => setAdminServices(result.services || []))
  ), [loadResource])

  const refreshAdminGuests = useCallback(() => (
    loadResource('adminGuests', adminApi.getGuests, (result) => setAdminGuests(result.guests || []))
  ), [loadResource])

  const loadAdmin = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    await Promise.all([
      loadAdminDashboard(),
      refreshAdminBookings(),
      loadAdminFeedback(),
      refreshAdminGuests(),
      loadAdminLogs(),
      loadAdminSettings(),
      refreshAdminServices(),
    ])
  }, [loadAdminDashboard, loadAdminFeedback, loadAdminLogs, loadAdminSettings, refreshAdminBookings, refreshAdminGuests, refreshAdminServices, user])

  const searchServices = useCallback((query) => loadServices(query), [loadServices])

  useEffect(() => {
    loadPublic()
    loadMe()
  }, [loadMe, loadPublic])

  useEffect(() => {
    if (user?.role === 'guest') loadMyBookings()
    if (user?.role === 'admin') loadAdmin()
  }, [loadAdmin, loadMyBookings, user])

  return {
    resourceStates,
    user,
    setUser,
    homeData,
    resortInfo,
    services,
    adminServices,
    myBookings,
    dashboard,
    adminBookings,
    adminCalendar,
    adminFeedback,
    adminGuests,
    adminLogs,
    adminSettings,
    setAdminSettings,
    loadHome,
    loadResortInfo,
    loadServices,
    loadMe,
    loadMyBookings,
    loadAdmin,
    loadAdminDashboard,
    loadAdminFeedback,
    loadAdminLogs,
    loadAdminSettings,
    refreshAdminBookings,
    refreshAdminServices,
    refreshAdminGuests,
    searchServices,
    logout,
  }
}
