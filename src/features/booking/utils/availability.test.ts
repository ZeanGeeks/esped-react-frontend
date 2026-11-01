import { describe, expect, it } from 'vitest'
import { addDays, dateKey, isStayAvailable } from './availability'

describe('booking availability dates', () => {
  it('formats local dates as calendar keys', () => {
    expect(dateKey(new Date(2026, 9, 30))).toBe('2026-10-30')
  })

  it('adds days across month boundaries', () => {
    expect(dateKey(addDays(new Date(2026, 9, 31), 1))).toBe('2026-11-01')
  })

  it('requires every night from check-in through the night before check-out', () => {
    const dates = new Set(['2026-10-30', '2026-10-31', '2026-11-01'])
    expect(isStayAvailable('2026-10-30', '2026-11-02', dates)).toBe(true)
    expect(isStayAvailable('2026-10-30', '2026-11-03', dates)).toBe(false)
    expect(isStayAvailable('2026-10-30', '2026-10-30', dates)).toBe(true)
  })
})
