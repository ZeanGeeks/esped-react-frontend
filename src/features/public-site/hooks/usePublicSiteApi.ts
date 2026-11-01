import { useCallback } from 'react'
import { getRecommendation } from '../api/publicApi'

export function usePublicSiteApi() {
  const recommend = useCallback((details) => getRecommendation(details), [])
  return { recommend }
}
