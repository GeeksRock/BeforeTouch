'use client'

import { useState, useEffect } from 'react'
import { listEmployees, updateEmployee, addEmployee, type EmployeeRow } from './actions'
import { inviteEmployee } from '@/app/setup/employees/actions'

interface EmployeeFormFields {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

const emptyForm = (): EmployeeFormFields => ({
  name: '',
  contact: '',
  can_volunteer: true,
  can_receive_volunteers: true,
  is_active: true,
})

export default function ManageEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EmployeeFormFields>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<EmployeeFormFields>(emptyForm())
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    listEmployees()
      .then(({ data, error }) => {
        if (error) setError(error)
        else setEmployees(data)
      })
      .catch(() => setError('Failed to load employees'))
      .finally(() => setLoading(false))
  }, [])

  function openEdit(emp: EmployeeRow) {
    setEditingId(emp.id)
    setEditForm({
      name: emp.name,
      contact: emp.contact,
      can_volunteer: emp.can_volunteer,
      can_receive_volunteers: emp.can_receive_volunteers,
      is_active: emp.is_active,
    })
    setSaveError(null)
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setEditForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setSaving(true)
    setSaveError(null)

    const { error } = await updateEmployee(editingId, editForm)
    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }

    setEmployees(prev =>
      prev ? prev.map(emp => (emp.id === editingId ? { ...emp, ...editForm } : emp)) : prev,
    )
    setSaving(false)
    setEditingId(null)
  }

  function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setAddForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError(null)

    const snapshot = { ...addForm }
    const { data, error } = await addEmployee(snapshot)
    if (error || !data) {
      setAddError(error ?? 'Failed to add employee')
      setAdding(false)
      return
    }

    setEmployees(prev => [...(prev ?? []), { id: data.id, ...snapshot }])
    setAddForm(emptyForm())
    setAdding(false)
    setShowAdd(false)

    inviteEmployee(data.id, snapshot.contact).catch(() => {})
  }

  if (loading) return <main className="max-w-lg mx-auto p-8">Loading…</main>
  if (error) return <main className="max-w-lg mx-auto p-8 text-red-600">{error}</main>

  return (
    <main className="max-w-lg mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage employees</h1>
        <button onClick={() => setShowAdd(true)} className="bg-black text-white px-3 py-2 rounded text-sm">
          + Add employee
        </button>
      </div>

      {(!employees || employees.length === 0) ? (
        <p className="text-sm text-gray-500">No employees yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {employees.map(emp => (
            <li key={emp.id}>
              <button
                onClick={() => openEdit(emp)}
                className="w-full text-left border rounded p-3 text-sm flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium">{emp.name}</span>
                <span className={emp.is_active ? 'text-green-700' : 'text-gray-400'}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h2 className="font-semibold">Edit employee</h2>

            <label className="flex flex-col gap-1">
              Name
              <input name="name" value={editForm.name} onChange={handleEditChange} className="border p-2 rounded" required />
            </label>

            <label className="flex flex-col gap-1">
              Contact (phone or email)
              <input name="contact" value={editForm.contact} onChange={handleEditChange} className="border p-2 rounded" required />
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="can_volunteer" checked={editForm.can_volunteer} onChange={handleEditChange} />
              Can volunteer for shifts
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="can_receive_volunteers" checked={editForm.can_receive_volunteers} onChange={handleEditChange} />
              Can receive volunteers
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_active" checked={editForm.is_active} onChange={handleEditChange} />
              Active
            </label>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditingId(null)} className="border border-black px-4 py-2 rounded">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="bg-black text-white px-4 py-2 rounded">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h2 className="font-semibold">Add employee</h2>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                Name
                <input name="name" value={addForm.name} onChange={handleAddChange} className="border p-2 rounded" required />
              </label>

              <label className="flex flex-col gap-1">
                Contact (phone or email)
                <input name="contact" value={addForm.contact} onChange={handleAddChange} className="border p-2 rounded" required />
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="can_volunteer" checked={addForm.can_volunteer} onChange={handleAddChange} />
                Can volunteer for shifts
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="can_receive_volunteers" checked={addForm.can_receive_volunteers} onChange={handleAddChange} />
                Can receive volunteers
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_active" checked={addForm.is_active} onChange={handleAddChange} />
                Active
              </label>

              {addError && <p className="text-sm text-red-600">{addError}</p>}

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="border border-black px-4 py-2 rounded">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="bg-black text-white px-4 py-2 rounded">
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
