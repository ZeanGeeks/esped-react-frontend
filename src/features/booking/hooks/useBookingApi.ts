import { useMemo } from 'react'
import * as bookingApi from '../api/bookingApi'

export function useBookingApi() {
  return useMemo(() => bookingApi, [])
}
