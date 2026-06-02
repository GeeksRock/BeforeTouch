'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
    // on success, `login` calls redirect() server-side which navigates automatically
  }

  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Sign in</h1>

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
            autoComplete="current-password"
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
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm mt-4 text-center">
        No account?{' '}
        <button
          type="button"
          onClick={() => router.push('/signup')}
          className="underline"
        >
          Sign up
        </button>
      </p>
    </main>
  )
}
