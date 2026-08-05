'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRotationGroup } from '../actions'
import type { RotationGroupForm } from '../actions'
import RotationGroupFormFields, { defaultRotationGroupForm } from '@/components/RotationGroupFormFields'
export default function NewRotationGroupPage() {
  const [form, setForm] = useState<RotationGroupForm>(defaultRotationGroupForm)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
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
      <RotationGroupFormFields
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        saveError={saveError}
        submitLabel="Create group"
      />
    </main>
  )
}
