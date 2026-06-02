'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { saveRotation } from './actions'

interface Employee {
  id: string
  name: string
}

interface RotationSlot {
  employee_id: string
  start_datetime: string
  end_datetime: string
}

const emptySlot = (): RotationSlot => ({
  employee_id: '',
  start_datetime: '',
  end_datetime: '',
})

function SlotFields({
  label,
  slot,
  onChange,
  employees,
}: {
  label: string
  slot: RotationSlot
  onChange: (s: RotationSlot) => void
  employees: Employee[]
}) {
  return (
    <fieldset className="flex flex-col gap-2 border rounded p-4">
      <legend className="font-medium px-1">{label}</legend>

      <label className="flex flex-col gap-1">
        Employee
        <select
          value={slot.employee_id}
          onChange={e => onChange({ ...slot, employee_id: e.target.value })}
          className="border p-2 rounded"
          required
        >
          <option value="">Select…</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Start
        <input
          type="datetime-local"
          value={slot.start_datetime}
          onChange={e => onChange({ ...slot, start_datetime: e.target.value })}
          className="border p-2 rounded"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        End
        <input
          type="datetime-local"
          value={slot.end_datetime}
          onChange={e => onChange({ ...slot, end_datetime: e.target.value })}
          className="border p-2 rounded"
          required
        />
      </label>
    </fieldset>
  )
}

function RotationForm() {
  const searchParams = useSearchParams()
  const companyId = searchParams.get('company_id') ?? ''

  const [employees, setEmployees] = useState<Employee[]>([])
  const [hasBackup, setHasBackup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [current, setCurrent] = useState<RotationSlot>(emptySlot())
  const [next, setNext] = useState<RotationSlot>(emptySlot())
  const [backupCurrent, setBackupCurrent] = useState<RotationSlot>(emptySlot())
  const [backupNext, setBackupNext] = useState<RotationSlot>(emptySlot())

  useEffect(() => {
    async function load() {
      const [empResult, compResult] = await Promise.all([
        supabase.from('employee').select('id, name').eq('company_id', companyId),
        supabase.from('company').select('has_backup').eq('id', companyId).single(),
      ])
      if (empResult.data) setEmployees(empResult.data)
      if (compResult.data) setHasBackup(compResult.data.has_backup)
      setLoading(false)
    }
    if (companyId) load()
  }, [companyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveRotation({
        company_id: companyId,
        current,
        next,
        ...(hasBackup ? { backup_current: backupCurrent, backup_next: backupNext } : {}),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="max-w-lg mx-auto p-8">Loading…</main>
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Set up rotation</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <SlotFields label="Current on-call" slot={current} onChange={setCurrent} employees={employees} />
        <SlotFields label="Next on-call" slot={next} onChange={setNext} employees={employees} />

        {hasBackup && (
          <>
            <SlotFields label="Backup on-call (current)" slot={backupCurrent} onChange={setBackupCurrent} employees={employees} />
            <SlotFields label="Backup on-call (next)" slot={backupNext} onChange={setBackupNext} employees={employees} />
          </>
        )}

        <button type="submit" disabled={saving} className="bg-black text-white p-2 rounded mt-2">
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </main>
  )
}

export default function RotationPage() {
  return (
    <Suspense>
      <RotationForm />
    </Suspense>
  )
}
