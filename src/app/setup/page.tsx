'use client'

import { useState } from 'react'
import { saveCompany } from './actions'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await saveCompany({ name })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Set up your company</h1>

      {error && (
        <p role="alert" className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          Company name
          <input
            name="name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border p-3 rounded bg-white text-gray-900"
            required
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-6 py-3 rounded disabled:opacity-50"
          >
            Save and continue
          </button>
        </div>
      </form>
    </main>
  )
}
