'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { saveEmployee, inviteEmployee } from './actions'

interface EmployeeForm {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

type InviteStatus = 'pending' | 'invited' | { error: string }

interface AddedEmployee {
  id: string
  name: string
  contact: string
  inviteStatus: InviteStatus
}

const emptyForm = (): EmployeeForm => ({
  name: '',
  contact: '',
  can_volunteer: true,
  can_receive_volunteers: true,
  is_active: true,
})

function EmployeesForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const companyId = searchParams.get('company_id') ?? ''
  const companyIsActive = searchParams.get('is_active') === 'true'

  const [form, setForm] = useState<EmployeeForm>(emptyForm())
  const [employees, setEmployees] = useState<AddedEmployee[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const snapshot = { ...form }
    let newId: string

    try {
      const result = await saveEmployee({ ...snapshot, company_id: companyId })
      newId = result.id
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save employee')
      setSaving(false)
      return
    }

    // Employee persisted — update UI immediately and reset the form
    setEmployees(prev => [
      ...prev,
      { id: newId, name: snapshot.name, contact: snapshot.contact, inviteStatus: 'pending' },
    ])
    setForm(emptyForm())
    setSaving(false)

    // Send the invite in the background; update the list item when it settles
    try {
      await inviteEmployee(newId, snapshot.contact)
      setEmployees(prev =>
        prev.map(emp => emp.id === newId ? { ...emp, inviteStatus: 'invited' } : emp),
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invite failed'
      setEmployees(prev =>
        prev.map(emp => emp.id === newId ? { ...emp, inviteStatus: { error: msg } } : emp),
      )
    }
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/setup" className="text-sm underline">← Back</Link>
        <h1 className="text-2xl font-bold">Add employees</h1>
      </div>

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

        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active"
            checked={companyIsActive ? form.is_active : false}
            onChange={handleChange}
            disabled={!companyIsActive} />
          Active
        </label>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <button type="submit" disabled={saving}
          className="bg-black text-white p-2 rounded mt-2">
          {saving ? 'Adding…' : 'Add employee'}
        </button>
      </form>

      {employees.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold mb-2">Added so far</h2>
          <ul className="flex flex-col gap-1">
            {employees.map(emp => (
              <li key={emp.id} className="border rounded p-2 text-sm flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{emp.name}</span> — {emp.contact}
                </span>
                <span className="shrink-0">
                  {emp.inviteStatus === 'pending' && (
                    <span className="text-gray-400">Inviting…</span>
                  )}
                  {emp.inviteStatus === 'invited' && (
                    <span className="text-green-700">Invited</span>
                  )}
                  {typeof emp.inviteStatus === 'object' && (
                    <span className="text-red-600">{emp.inviteStatus.error}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={() => {
          if (form.name || form.contact) {
            setShowConfirm(true)
          } else {
            router.push(`/setup/rotation?company_id=${companyId}&is_active=${companyIsActive}`)
          }
        }}
        className="border border-black p-2 rounded w-full"
      >
        Continue
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <p className="font-medium">You have unsaved employee details. Continue anyway?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="border border-black px-4 py-2 rounded"
              >
                Go back
              </button>
              <button
                onClick={() => router.push(`/setup/rotation?company_id=${companyId}&is_active=${companyIsActive}`)}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesForm />
    </Suspense>
  )
}
