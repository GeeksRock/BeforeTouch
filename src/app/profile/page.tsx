'use client'

import { useState, useEffect } from 'react'
import { fetchProfile, updateProfile } from './actions'
import type { ProfileForm } from './actions'

const defaultForm: ProfileForm = { name: '', contact: '' }

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(defaultForm)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchProfile().then(({ data, error }) => {
      if (data) setForm(data)
      if (error) setLoadError(error)
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setSaveError(null)
    const { error } = await updateProfile(form)
    if (error) setSaveError(error)
    else setSuccess(true)
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Your profile</h1>
      {loadError && <p className="text-red-600 mb-4">{loadError}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <label className="flex flex-col gap-1">
          Name
          <input name="name" value={form.name} onChange={handleChange}
            className="border p-2 rounded" required />
        </label>

        <label className="flex flex-col gap-1">
          Contact (email or phone)
          <input name="contact" value={form.contact} onChange={handleChange}
            className="border p-2 rounded" required />
        </label>

        {success && <p className="text-green-600">Profile saved.</p>}
        {saveError && <p className="text-red-600">{saveError}</p>}

        <button type="submit" className="bg-black text-white p-2 rounded mt-4">
          Save profile
        </button>

      </form>
    </main>
  )
}
