'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createRotationGroup } from '../actions'
import type { RotationGroupForm } from '../actions'
const defaultForm: RotationGroupForm = {
  name: '',
  rotation_length: '',
  rotation_start_day: '',
  rotation_start_time: '',
  has_backup: false,
  allowed_volunteer_types: [],
  approval_approver: 'on_call',
}
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export default function NewRotationGroupPage() {
  const [form, setForm] = useState<RotationGroupForm>(defaultForm)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
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
    setSaveError(null)
    const { error } = await createRotationGroup(form)
    if (error) setSaveError(error)
    else router.push('/settings')
  }
  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">New rotation group</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Group name
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
          Rotation starts &mdash; day
          <select name="rotation_start_day" value={form.rotation_start_day} onChange={handleChange}
            className="border p-2 rounded bg-white text-gray-900" required>
            <option value="">Select...</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Rotation starts &mdash; time
          <input type="time" name="rotation_start_time" value={form.rotation_start_time}
            onChange={handleChange} className="border p-2 rounded bg-white text-gray-900" required />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="has_backup" checked={form.has_backup} onChange={handleChange} />
          This rotation includes a backup on-call person
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Who approves volunteer offers?</legend>
          {(['on_call', 'manager'] as const).map(value => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="approval_approver" value={value}
                checked={form.approval_approver === value} onChange={handleChange} />
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
        {saveError && <p className="text-red-600">{saveError}</p>}
        <button type="submit" className="bg-black text-white p-2 rounded mt-4">
          Create group
        </button>
        <Link href="/settings" className="underline text-center">Cancel</Link>
      </form>
    </main>
  )
}
