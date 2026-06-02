'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup } from './actions'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
    // on success, `signup` calls redirect() server-side which navigates automatically
  }

  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create account</h1>

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

        <label className="flex flex-col gap-1">
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm mt-4 text-center">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="underline"
        >
          Sign in
        </button>
      </p>
    </main>
  )
}
