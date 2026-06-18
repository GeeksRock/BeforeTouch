'use client'

import { useState } from 'react'
import { saveCompany } from './actions'

export default function SetupPage() {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    rotation_length: '',
    rotation_start_day: '',
    rotation_start_time: '',
    rotation_end_day: '',
    rotation_end_time: '',
    has_backup: false,
    is_active: false,
    allowed_volunteer_types: [] as string[],
    approval_approver: 'on_call' as 'on_call' | 'manager',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm(prev => ({ ...prev, [name]: checked }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  function handleVolunteerType(type: string) {
    setForm(prev => {
      const already = prev.allowed_volunteer_types.includes(type)
      return {
        ...prev,
        allowed_volunteer_types: already
          ? prev.allowed_volunteer_types.filter(t => t !== type)
          : [...prev.allowed_volunteer_types, type],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await saveCompany(form)
    setSubmitting(false)
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Set up your company</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_1.2fr] gap-x-12 gap-y-4">

        <div>
          <label className="flex flex-col gap-1">
            Company name
            <input name="name" value={form.name} onChange={handleChange}
              className="border p-2 rounded bg-white text-gray-900" required />
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="has_backup" checked={form.has_backup}
              onChange={handleChange} />
            This rotation includes a backup on-call person
          </label>
        </div>

        <div>
          <label className="flex flex-col gap-1">
            Rotation length
            <select name="rotation_length" value={form.rotation_length} onChange={handleChange}
              className="border p-2 rounded bg-white text-gray-900" required>
              <option value="">Select...</option>
              <option value="1_week">1 week</option>
              <option value="2_weeks">2 weeks</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" checked={form.is_active}
              onChange={handleChange} />
            Company is active
          </label>
        </div>

        <div>
          <label className="flex flex-col gap-1">
            Rotation starts — day
            <select name="rotation_start_day" value={form.rotation_start_day} onChange={handleChange}
              className="border p-2 rounded bg-white text-gray-900" required>
              <option value="">Select...</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <div>
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">Who approves volunteer offers?</legend>
            {(['on_call', 'manager'] as const).map(value => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="approval_approver"
                  value={value}
                  checked={form.approval_approver === value}
                  onChange={handleChange}
                />
                {value === 'on_call' ? 'On-call employee' : 'Manager'}
              </label>
            ))}
          </fieldset>
        </div>

        <div>
          <label className="flex flex-col gap-1">
            Rotation starts — time
            <input type="time" name="rotation_start_time" value={form.rotation_start_time}
              onChange={handleChange} className="border p-2 rounded bg-white text-gray-900" required />
          </label>
        </div>

        <div>
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">Allowed volunteer types</legend>
            {['full_rotation', 'individual_days', 'hour_blocks'].map(type => (
              <label key={type} className="flex items-center gap-2">
                <input type="checkbox" checked={form.allowed_volunteer_types.includes(type)}
                  onChange={() => handleVolunteerType(type)} />
                {type === 'full_rotation' ? 'Full rotation' :
                 type === 'individual_days' ? 'Individual days' : 'Blocks of hours'}
              </label>
            ))}
          </fieldset>
        </div>

        <div>
          <label className="flex flex-col gap-1">
            Rotation ends — day
            <select name="rotation_end_day" value={form.rotation_end_day} onChange={handleChange}
              className="border p-2 rounded bg-white text-gray-900" required>
              <option value="">Select...</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <div className="col-start-1">
          <label className="flex flex-col gap-1">
            Rotation ends — time
            <input type="time" name="rotation_end_time" value={form.rotation_end_time}
              onChange={handleChange} className="border p-2 rounded bg-white text-gray-900" required />
          </label>
        </div>

        <div className="col-span-2">
          <button type="submit" disabled={submitting}
            className="bg-black text-white p-2 rounded mt-4 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save and continue'}
          </button>
        </div>

      </form>
    </main>
  )
}