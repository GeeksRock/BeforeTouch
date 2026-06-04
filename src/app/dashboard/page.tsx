'use client'

import { useState, useEffect } from 'react'
import { fetchDashboard, submitVolunteerOffer, type DashboardData } from './actions'

function OnCallView({ data }: { data: Extract<DashboardData, { type: 'on-call' }> }) {
  const { rotation, volunteers } = data

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Your on-call rotation</h1>

      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Your shift</h2>
        <p className="text-sm">From: {new Date(rotation.start_datetime).toLocaleString()}</p>
        <p className="text-sm">To: {new Date(rotation.end_datetime).toLocaleString()}</p>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Volunteers offering to cover</h2>
        {volunteers.length === 0 ? (
          <p className="text-sm text-gray-500">No volunteers yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {volunteers.map(v => (
              <li key={v.id} className="border rounded p-3 text-sm">
                <span className="font-medium">{v.employee_name}</span>
                {' — '}
                <span>{v.volunteer_type}</span>
                {' '}
                <span className="text-gray-500">({v.status})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function NotOnCallView({ data }: { data: Extract<DashboardData, { type: 'not-on-call' }> }) {
  const { onCallEmployeeName, rotation, allowedVolunteerTypes } = data
  const [selectedType, setSelectedType] = useState(allowedVolunteerTypes[0] ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVolunteer(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { error: submitError } = await submitVolunteerOffer({ rotation_id: rotation.id, volunteer_type: selectedType })
      if (submitError) setError(submitError)
      else setSubmitted(true)
    } catch {
      setError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">On-call dashboard</h1>

      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Currently on call</h2>
        <p className="text-sm font-medium">{onCallEmployeeName}</p>
        <p className="text-sm">From: {new Date(rotation.start_datetime).toLocaleString()}</p>
        <p className="text-sm">To: {new Date(rotation.end_datetime).toLocaleString()}</p>
      </section>

      {allowedVolunteerTypes.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Volunteer to cover</h2>
          {submitted ? (
            <p className="text-sm text-green-700 border border-green-300 rounded p-3">
              Your offer has been submitted.
            </p>
          ) : (
            <form onSubmit={handleVolunteer} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Coverage type
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="border p-2 rounded"
                  required
                >
                  {allowedVolunteerTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="bg-black text-white p-2 rounded"
              >
                {submitting ? 'Submitting…' : 'Offer to cover'}
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
      .then(({ data, error }) => {
        if (error) setError(error)
        else setData(data)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <main className="max-w-lg mx-auto p-8">Loading…</main>
  if (error) return <main className="max-w-lg mx-auto p-8 text-red-600">{error}</main>
  if (!data) return null

  if (data.type === 'on-call') return <OnCallView data={data} />
  return <NotOnCallView data={data} />
}
