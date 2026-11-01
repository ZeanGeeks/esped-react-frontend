import { useMemo } from 'react'
import * as adminApi from '../api/adminApi'

export function useAdminApi() {
  return useMemo(() => adminApi, [])
}
