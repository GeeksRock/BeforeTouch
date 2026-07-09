'use client'

import type { StepProps } from './types'

const rotationLengthLabels: Record<string, string> = {
  '1_week': '1 week',
  '2_weeks': '2 weeks',
  'monthly': 'Monthly',
  'custom': 'Custom',
}

const volunteerTypeLabels: Record<string, string> = {
  full_rotation: 'Full rotation',
  individual_days: 'Individual days',
  hour_blocks: 'Blocks of hours',
}

function Row({ label, value }: { label: string; value: string }) {
  const empty = value === ''
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-gray-200">
      <span className="text-gray-600">{label}</span>
      <span className={empty ? 'text-gray-400 italic' : 'text-gray-900 font-medium'}>
        {empty ? 'Not set' : value}
      </span>
    </div>
  )
}

export default function Step4Review({ form, onNext, onBack, submitting }: StepProps) {
  const volunteerTypes = form.allowed_volunteer_types
    .map(t => volunteerTypeLabels[t] ?? t)
    .join(', ')

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Review and save</h2>

      <div className="flex flex-col">
        <Row label="Company name" value={form.name} />
        <Row label="Company is active" value={form.is_active ? 'Yes' : 'No'} />
        <Row label="Rotation length" value={rotationLengthLabels[form.rotation_length] ?? form.rotation_length} />
        <Row label="Starts" value={form.rotation_start_day && form.rotation_start_time ? `${form.rotation_start_day} at ${form.rotation_start_time}` : ''} />
        <Row label="Ends" value={form.rotation_end_day && form.rotation_end_time ? `${form.rotation_end_day} at ${form.rotation_end_time}` : ''} />
        <Row label="Backup on-call person" value={form.has_backup ? 'Yes' : 'No'} />
        <Row label="Allowed volunteer types" value={volunteerTypes} />
        <Row label="Approves volunteer offers" value={form.approval_approver === 'on_call' ? 'On-call employee' : 'Manager'} />
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="border border-gray-400 px-6 py-3 rounded disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={submitting}
          className="bg-black text-white px-6 py-3 rounded disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </div>
  )
}
