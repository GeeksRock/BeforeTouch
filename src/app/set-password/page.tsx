'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function SetPasswordPage() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { detectSessionInUrl: false } },
    ),
  )
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token_hash = params.get('token_hash')
    if (!token_hash) {
      setStatus('invalid')
      return
    }
    supabase.auth
      .verifyOtp({ token_hash, type: 'invite' })
      .then(({ data, error: verifyError }) => {
        if (verifyError) {
          setStatus('invalid')
          return
        }
        setEmail(data.session?.user.email ?? null)
        setStatus('ready')
      })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setPending(false)
      return
    }
    router.replace('/dashboard')
  }

  if (status === 'checking') {
    return <main className="max-w-sm mx-auto p-8"><p>Checking your invite link…</p></main>
  }

  if (status === 'invalid') {
    return (
      <main className="max-w-sm mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Set your password</h1>
        <p className="text-sm text-red-600">
          This link is invalid or has expired. Ask your administrator to send a new invite.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Set your password</h1>
      {email && <p className="text-sm mb-6">Setting a password for {email}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-black text-white p-2 rounded mt-2"
        >
          {pending ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </main>
  )
}
