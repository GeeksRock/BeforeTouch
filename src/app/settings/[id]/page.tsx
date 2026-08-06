'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchRotationGroup, updateRotationGroup, fetchRotationGroupRoster, fetchAvailableEmployees, addRotationGroupMember } from '../actions'
import type { RosterMember, RotationGroupForm, AvailableEmployee } from '../actions'
import RotationGroupFormFields, { defaultRotationGroupForm } from '@/components/RotationGroupFormFields'
export default function EditRotationGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [form, setForm] = useState<RotationGroupForm>(defaultRotationGroupForm)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [available, setAvailable] = useState<AvailableEmployee[]>([])
  const [selected, setSelected] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const router = useRouter()
  useEffect(() => {
    fetchRotationGroup(id).then(({ data, error }) => {
      if (data) setForm(data)
      if (error) setLoadError(error)
    })
  }, [id])
  async function loadMembership() {
    const rosterResult = await fetchRotationGroupRoster(id)
    if (rosterResult.data) setRoster(rosterResult.data)
    if (rosterResult.error) setRosterError(rosterResult.error)
    const availableResult = await fetchAvailableEmployees(id)
    if (availableResult.data) setAvailable(availableResult.data)
  }
  useEffect(() => {
    loadMembership()
  }, [id])
  async function handleAdd() {
    setAdding(true)
    setAddError(null)
    const { error } = await addRotationGroupMember(id, selected)
    if (error) setAddError(error)
    else {
      setSelected('')
      await loadMembership()
    }
    setAdding(false)
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    const { error } = await updateRotationGroup(id, form)
    if (error) setSaveError(error)
    else router.push('/settings')
  }
  if (loadError) {
    return (
      <main className="max-w-lg mx-auto p-8">
        <p className="text-red-600 mb-4">{loadError}</p>
        <Link href="/settings" className="underline">&larr; Back to rotation groups</Link>
      </main>
    )
  }
  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Edit rotation group</h1>
      <RotationGroupFormFields
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        saveError={saveError}
        submitLabel="Save changes"
      />
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">Roster</h2>
        {rosterError && <p className="text-red-600 mb-4">{rosterError}</p>}
        {roster.length === 0 && !rosterError && (
          <p className="text-gray-600 mb-4">No one is in this group yet.</p>
        )}
        {roster.length > 0 && (
          <ol className="space-y-2 mb-6">
            {roster.map((member, index) => (
              <li key={member.employee_id} className="flex gap-3">
                <span className="text-gray-500 w-6">{index + 1}</span>
                <span>{member.name}</span>
              </li>
            ))}
          </ol>
        )}
        {available.length > 0 && (
          <div className="flex gap-2 items-start">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="border rounded px-3 py-2 flex-1"
            >
              <option value="">Choose an employee&hellip;</option>
              {available.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected || adding}
              className="border rounded px-4 py-2 disabled:opacity-50"
            >
              {adding ? 'Adding\u2026' : 'Add'}
            </button>
          </div>
        )}
        {addError && <p className="text-red-600 mt-3">{addError}</p>}
      </section>
    </main>
  )
}
