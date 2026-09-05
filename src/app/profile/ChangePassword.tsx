'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
export default function ChangePassword() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { detectSessionInUrl: false } },
    ),
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setPending(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setPending(false)
      return
    }
    setPassword('')
    setConfirm('')
    setSuccess(true)
    setPending(false)
  }
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">Change password</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          New password
          <input
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded"
          />
        </label>
        <label className="flex flex-col gap-1">
          Confirm new password
          <input
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border p-2 rounded"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Password changed.</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white p-2 rounded mt-2"
        >
          {pending ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
