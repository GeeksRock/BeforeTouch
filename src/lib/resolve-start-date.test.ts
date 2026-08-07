import { describe, it, expect } from 'vitest'
import { resolveStartDate } from './resolve-start-date'

describe('resolveStartDate', () => {
  it('returns today when today is the start day and the time has not passed', () => {
    expect(resolveStartDate('Monday', '2026-08-10T08:00:00', '09:00', 'America/Chicago'))
      .toBe('2026-08-10')
  })

  it('returns next week when today is the start day but the time has passed', () => {
    expect(resolveStartDate('Monday', '2026-08-10T10:00:00', '09:00', 'America/Chicago'))
      .toBe('2026-08-17')
  })

  it('returns the next occurrence when today is before the start day', () => {
    expect(resolveStartDate('Friday', '2026-08-10T08:00:00', '09:00', 'America/Chicago'))
      .toBe('2026-08-14')
  })

  it('wraps to next week when the start day is earlier in the week', () => {
    expect(resolveStartDate('Sunday', '2026-08-10T08:00:00', '09:00', 'America/Chicago'))
      .toBe('2026-08-16')
  })

  it('throws on an unknown day name', () => {
    expect(() => resolveStartDate('Funday', '2026-08-10T08:00:00', '09:00', 'America/Chicago'))
      .toThrow('Unknown rotation start day: Funday')
  })
})
