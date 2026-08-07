import { describe, it, expect } from 'vitest'
import { generateRotations } from './generate-rotations'

describe('generateRotations', () => {
  it('produces two periods with consecutive roster members', () => {
    const result = generateRotations({
      startDate: '2026-08-10',
      startTime: '08:00:00',
      timezone: 'America/Chicago',
      rotationLength: '1_week',
      hasBackup: false,
      roster: ['emp-1', 'emp-2', 'emp-3'],
    })

    expect(result).toHaveLength(2)
    expect(result[0].on_call_employee_id).toBe('emp-1')
    expect(result[1].on_call_employee_id).toBe('emp-2')
    expect(result[0].start_datetime).toBe('2026-08-10T13:00:00.000Z')
    expect(result[0].end_datetime).toBe('2026-08-17T13:00:00.000Z')
    expect(result[1].start_datetime).toBe('2026-08-17T13:00:00.000Z')
  })

  it('keeps wall-clock time across a DST boundary', () => {
    const result = generateRotations({
      startDate: '2026-10-25',
      startTime: '08:00:00',
      timezone: 'America/Chicago',
      rotationLength: '2_weeks',
      hasBackup: false,
      roster: ['emp-1', 'emp-2'],
    })

    expect(result[0].start_datetime).toBe('2026-10-25T13:00:00.000Z')
    expect(result[0].end_datetime).toBe('2026-11-08T14:00:00.000Z')
  })
})
