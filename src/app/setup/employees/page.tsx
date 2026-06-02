'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { saveEmployee } from './actions'

interface Employee {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
}

const emptyForm = (): Employee => ({
  name: '',
  contact: '',
  can_volunteer: true,
  can_receive_volunteers: true,
})

export default function EmployeesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const companyId = searchParams.get('company_id') ?? ''

  const [form, setForm] = useState<Employee>(emptyForm())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [saving, setSaving] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveEmployee({ ...form, company_id: companyId })
      setEmployees(prev => [...prev, form])
      setForm(emptyForm())
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Add employees</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
        <label className="flex flex-col gap-1">
          Name
          <input name="name" value={form.name} onChange={handleChange}
            className="border p-2 rounded" required />
        </label>

        <label className="flex flex-col gap-1">
          Contact (phone or email)
          <input name="contact" value={form.contact} onChange={handleChange}
            className="border p-2 rounded" required />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="can_volunteer" checked={form.can_volunteer}
            onChange={handleChange} />
          Can volunteer for shifts
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="can_receive_volunteers" checked={form.can_receive_volunteers}
            onChange={handleChange} />
          Can receive volunteers
        </label>

        <button type="submit" disabled={saving}
          className="bg-black text-white p-2 rounded mt-2">
          {saving ? 'Adding…' : 'Add employee'}
        </button>
      </form>

      {employees.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold mb-2">Added so far</h2>
          <ul className="flex flex-col gap-1">
            {employees.map((emp, i) => (
              <li key={i} className="border rounded p-2 text-sm">
                <span className="font-medium">{emp.name}</span> — {emp.contact}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={() => router.push('/setup/rotation')}
        className="border border-black p-2 rounded w-full"
      >
        Continue
      </button>
    </main>
  )
}
