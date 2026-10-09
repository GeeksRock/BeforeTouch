'use client'

import { useState } from 'react'
import { requestPasswordReset } from './actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await requestPasswordReset(formData)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <main className="max-w-sm mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Check your email</h1>
        <p className="text-sm">If that email has an account, a link to reset your password is on its way.</p>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Reset your password</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="border p-2 rounded"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white p-2 rounded mt-2"
        >
          {pending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </main>
  )
}
