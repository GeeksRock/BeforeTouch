'use client'

import type { StepProps } from './types'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Step2Rotation({ form, onChange, onNext, onBack }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Rotation schedule</h2>

      <label className="flex flex-col gap-1">
        Rotation length
        <select
          name="rotation_length"
          value={form.rotation_length}
          onChange={onChange}
          className="border p-3 rounded bg-white text-gray-900"
          required
        >
          <option value="">Select...</option>
          <option value="1_week">1 week</option>
          <option value="2_weeks">2 weeks</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          Starts — day
          <select
            name="rotation_start_day"
            value={form.rotation_start_day}
            onChange={onChange}
            className="border p-3 rounded bg-white text-gray-900"
            required
          >
            <option value="">Select...</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Starts — time
          <input
            type="time"
            name="rotation_start_time"
            value={form.rotation_start_time}
            onChange={onChange}
            className="border p-3 rounded bg-white text-gray-900"
            required
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          Ends — day
          <select
            name="rotation_end_day"
            value={form.rotation_end_day}
            onChange={onChange}
            className="border p-3 rounded bg-white text-gray-900"
            required
          >
            <option value="">Select...</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Ends — time
          <input
            type="time"
            name="rotation_end_time"
            value={form.rotation_end_time}
            onChange={onChange}
            className="border p-3 rounded bg-white text-gray-900"
            required
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="has_backup"
          checked={form.has_backup}
          onChange={onChange}
        />
        This rotation includes a backup on-call person
      </label>

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
