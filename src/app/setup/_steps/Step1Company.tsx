'use client'

import type { StepProps } from './types'

export default function Step1Company({ form, onChange, onNext }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Company</h2>

      <label className="flex flex-col gap-1">
        Company name
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          className="border p-3 rounded bg-white text-gray-900"
          required
        />
      </label>

      <div className="flex justify-end">
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
