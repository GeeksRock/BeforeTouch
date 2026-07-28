import { describe, it, expect } from 'vitest'
import { validateStep } from './validation'
import type { SetupForm } from './_steps/types'

const empty: SetupForm = {
  name: '',
  rotation_length: '',
  rotation_start_day: '',
  rotation_start_time: '',
  rotation_end_day: '',
  rotation_end_time: '',
  has_backup: false,
  allowed_volunteer_types: [],
  approval_approver: 'on_call',
}

const filled: SetupForm = {
  name: 'Acme HVAC',
  rotation_length: '1_week',
  rotation_start_day: 'Monday',
  rotation_start_time: '08:00',
  rotation_end_day: 'Monday',
  rotation_end_time: '08:00',
  has_backup: true,
  allowed_volunteer_types: ['full_rotation'],
  approval_approver: 'manager',
}

describe('validateStep', () => {
  it('reports the company name when step 1 is empty', () => {
    expect(validateStep(1, empty)).toEqual(['Company name'])
  })

  it('reports nothing when step 1 has a name', () => {
    expect(validateStep(1, filled)).toEqual([])
  })

  it('treats a whitespace-only company name as missing', () => {
    expect(validateStep(1, { ...filled, name: '   ' })).toEqual(['Company name'])
  })

  it('reports all five schedule fields when step 2 is empty', () => {
    expect(validateStep(2, empty)).toEqual([
      'Rotation length',
      'Starts — day',
      'Starts — time',
      'Ends — day',
      'Ends — time',
    ])
  })

  it('reports only the fields still missing on step 2', () => {
    expect(validateStep(2, { ...filled, rotation_end_time: '' })).toEqual(['Ends — time'])
  })

  it('reports nothing when step 2 is complete', () => {
    expect(validateStep(2, filled)).toEqual([])
  })

  it('reports volunteer types when none are checked', () => {
    expect(validateStep(3, empty)).toEqual(['Allowed volunteer types'])
  })

  it('reports nothing when at least one volunteer type is checked', () => {
    expect(validateStep(3, filled)).toEqual([])
  })

  it('reports nothing on the review step', () => {
    expect(validateStep(4, empty)).toEqual([])
  })

  it('throws on an unknown step', () => {
    expect(() => validateStep(9, filled)).toThrow()
  })
})
