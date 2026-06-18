'use client'

import { useState, useEffect } from 'react'
import { fetchCompany, updateCompany } from './actions'
import type { CompanyForm } from './actions'

const defaultForm: CompanyForm = {
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

export default function SettingsPage() {
  const [form, setForm] = useState<CompanyForm>(defaultForm)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchCompany().then(({ data, error }) => {
      if (data) setForm(data)
      if (error) setLoadError(error)
    })
  }, [])

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
    setSuccess(false)
    setSaveError(null)
    const { error } = await updateCompany(form)
    if (error) setSaveError(error)
    else setSuccess(true)
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Company settings</h1>
      {loadError && <p className="text-red-600 mb-4">{loadError}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <label className="flex flex-col gap-1">
          Company name
          <input name="name" value={form.name} onChange={handleChange}
            className="border p-2 rounded bg-white text-gray-900" required />
        </label>

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

        <label className="flex flex-col gap-1">
          Rotation starts — day
          <select name="rotation_start_day" value={form.rotation_start_day} onChange={handleChange}
            className="border p-2 rounded bg-white text-gray-900" required>
            <option value="">Select...</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Rotation starts — time
          <input type="time" name="rotation_start_time" value={form.rotation_start_time}
            onChange={handleChange} className="border p-2 rounded bg-white text-gray-900" required />
        </label>

        <label className="flex flex-col gap-1">
          Rotation ends — day
          <select name="rotation_end_day" value={form.rotation_end_day} onChange={handleChange}
            className="border p-2 rounded bg-white text-gray-900" required>
            <option value="">Select...</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Rotation ends — time
          <input type="time" name="rotation_end_time" value={form.rotation_end_time}
            onChange={handleChange} className="border p-2 rounded bg-white text-gray-900" required />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="has_backup" checked={form.has_backup}
            onChange={handleChange} />
          This rotation includes a backup on-call person
        </label>

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

        {success && <p className="text-green-600">Settings saved.</p>}
        {saveError && <p className="text-red-600">{saveError}</p>}

        <button type="submit" className="bg-black text-white p-2 rounded mt-4">
          Save settings
        </button>

      </form>
    </main>
  )
}
