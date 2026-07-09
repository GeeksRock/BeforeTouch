'use client'

import type { StepProps } from './types'

const volunteerTypes: { value: string; label: string }[] = [
  { value: 'full_rotation', label: 'Full rotation' },
  { value: 'individual_days', label: 'Individual days' },
  { value: 'hour_blocks', label: 'Blocks of hours' },
]

export default function Step3Volunteers({ form, onChange, onVolunteerType, onNext, onBack }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Volunteer marketplace</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium mb-1">Allowed volunteer types</legend>
        {volunteerTypes.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.allowed_volunteer_types.includes(value)}
              onChange={() => onVolunteerType(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium mb-1">Who approves volunteer offers?</legend>
        {(['on_call', 'manager'] as const).map(value => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="approval_approver"
              value={value}
              checked={form.approval_approver === value}
              onChange={onChange}
            />
            {value === 'on_call' ? 'On-call employee' : 'Manager'}
          </label>
        ))}
      </fieldset>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="border border-gray-400 px-6 py-3 rounded"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-black text-white px-6 py-3 rounded"
        >
          Next
        </button>
      </div>
    </div>
  )
}
