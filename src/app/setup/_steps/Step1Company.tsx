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

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={onChange}
          />
          Company is active
        </label>
        {!form.is_active && (
          <p className="text-sm text-gray-600 mt-1">
            While unchecked, employees you add won&apos;t receive invite emails. You can activate the company later.
          </p>
        )}
      </div>

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
