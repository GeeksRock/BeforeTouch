'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchRotationGroup, updateRotationGroup } from '../actions'
import type { RotationGroupForm } from '../actions'
import RotationGroupFormFields, { defaultRotationGroupForm } from '@/components/RotationGroupFormFields'
export default function EditRotationGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [form, setForm] = useState<RotationGroupForm>(defaultRotationGroupForm)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
  useEffect(() => {
    fetchRotationGroup(id).then(({ data, error }) => {
      if (data) setForm(data)
      if (error) setLoadError(error)
    })
  }, [id])
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
    </main>
  )
}
