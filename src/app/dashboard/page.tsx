'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchDashboard, submitVolunteerOffer, approveVolunteerOffer, type DashboardData } from './actions'

function getDaysInWindow(startISO: string, endISO: string): Date[] {
  const days: Date[] = []
  const start = new Date(startISO)
  const end = new Date(endISO)
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (cur <= end) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

function dayLabel(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return `${weekday} ${month} ${date.getDate()}`
}

function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16)
}

function OnCallView({
  data,
  onRefresh,
}: {
  data: Extract<DashboardData, { type: 'on-call' }>
  onRefresh: () => void
}) {
  const { rotation, volunteers, approval_approver } = data
  const [approving, setApproving] = useState<string | null>(null)

  async function handleApprove(offerId: string, decision: 'accepted' | 'declined') {
    setApproving(offerId)
    const { error } = await approveVolunteerOffer({ offer_id: offerId, decision })
    setApproving(null)
    if (!error) onRefresh()
  }

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
              <li key={v.id} className="border rounded p-3 text-sm flex items-center justify-between">
                <span>
                  <span className="font-medium">{v.employee_name}</span>
                  {' — '}
                  <span>{v.volunteer_type}</span>
                  {' '}
                  <span className="text-gray-500">({v.status})</span>
                </span>
                {approval_approver === 'on_call' && v.status === 'pending' && (
                  <span className="flex gap-2 ml-3">
                    <button
                      onClick={() => handleApprove(v.id, 'accepted')}
                      disabled={approving === v.id}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleApprove(v.id, 'declined')}
                      disabled={approving === v.id}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </span>
                )}
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
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(key: string) {
    setSelectedDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (selectedType === 'individual_days') {
        const results = await Promise.all(
          selectedDays.map(key => {
            const [y, m, d] = key.split('-').map(Number)
            const start = new Date(y, m - 1, d, 0, 0, 0)
            const end = new Date(y, m - 1, d, 23, 59, 0)
            return submitVolunteerOffer({
              rotation_id: rotation.id,
              offer_type: selectedType,
              start_datetime: toLocalISOString(start),
              end_datetime: toLocalISOString(end),
            })
          })
        )
        const firstError = results.find(r => r.error)?.error ?? null
        if (firstError) { setError(firstError); return }
      } else if (selectedType === 'hour_blocks') {
        if (endDatetime <= startDatetime) {
          setError('End time must be after start time')
          return
        }
        const { error: submitError } = await submitVolunteerOffer({
          rotation_id: rotation.id,
          offer_type: selectedType,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
        })
        if (submitError) { setError(submitError); return }
      } else {
        const { error: submitError } = await submitVolunteerOffer({
          rotation_id: rotation.id,
          offer_type: selectedType,
        })
        if (submitError) { setError(submitError); return }
      }
      setSubmitted(true)
    } catch {
      setError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const daysInWindow = getDaysInWindow(rotation.start_datetime, rotation.end_datetime)

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
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {allowedVolunteerTypes.length > 1 && (
                <label className="flex flex-col gap-1 text-sm">
                  Coverage type
                  <select
                    value={selectedType}
                    onChange={e => { setSelectedType(e.target.value); setSelectedDays([]) }}
                    className="border p-2 rounded bg-white text-gray-900"
                  >
                    {allowedVolunteerTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              )}

              {selectedType === 'individual_days' && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium mb-1">Select days</legend>
                  {daysInWindow.map(day => {
                    const key = dayKey(day)
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(key)}
                          onChange={() => toggleDay(key)}
                        />
                        {dayLabel(day)}
                      </label>
                    )
                  })}
                </fieldset>
              )}

              {selectedType === 'hour_blocks' && (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Start
                    <input
                      type="datetime-local"
                      value={startDatetime}
                      min={toDatetimeLocal(rotation.start_datetime)}
                      onChange={e => setStartDatetime(e.target.value)}
                      className="border p-2 rounded bg-white text-gray-900"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    End
                    <input
                      type="datetime-local"
                      value={endDatetime}
                      max={toDatetimeLocal(rotation.end_datetime)}
                      onChange={e => setEndDatetime(e.target.value)}
                      className="border p-2 rounded bg-white text-gray-900"
                      required
                    />
                  </label>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || (selectedType === 'individual_days' && selectedDays.length === 0)}
                className="bg-black text-white p-2 rounded disabled:opacity-50"
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

function AdminView({
  data,
  onRefresh,
}: {
  data: Extract<DashboardData, { type: 'admin' }>
  onRefresh: () => void
}) {
  const { rotation, volunteers, approval_approver } = data
  const [approving, setApproving] = useState<string | null>(null)

  async function handleApprove(offerId: string, decision: 'accepted' | 'declined') {
    setApproving(offerId)
    const { error } = await approveVolunteerOffer({ offer_id: offerId, decision })
    setApproving(null)
    if (!error) onRefresh()
  }

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin view</h1>

      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Active rotation</h2>
        <p className="text-sm">From: {new Date(rotation.start_datetime).toLocaleString()}</p>
        <p className="text-sm">To: {new Date(rotation.end_datetime).toLocaleString()}</p>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Volunteer offers</h2>
        {volunteers.length === 0 ? (
          <p className="text-sm text-gray-500">No volunteer offers.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {volunteers.map(v => (
              <li key={v.id} className="border rounded p-3 text-sm flex items-center justify-between">
                <span>
                  <span className="font-medium">{v.employee_name}</span>
                  {' — '}
                  <span>{v.volunteer_type}</span>
                  {' '}
                  <span className="text-gray-500">({v.status})</span>
                </span>
                {approval_approver === 'manager' && v.status === 'pending' && (
                  <span className="flex gap-2 ml-3">
                    <button
                      onClick={() => handleApprove(v.id, 'accepted')}
                      disabled={approving === v.id}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleApprove(v.id, 'declined')}
                      disabled={approving === v.id}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    setLoading(true)
    fetchDashboard()
      .then(({ data, error }) => {
        if (error === 'Employee record not found') {
          router.replace('/dashboard/admin')
        } else if (error) {
          setError(error)
        } else {
          setData(data)
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <main className="max-w-lg mx-auto p-8">Loading…</main>
  if (error) return <main className="max-w-lg mx-auto p-8 text-red-600">{error}</main>
  if (!data) return null

  if (data.type === 'on-call') return <OnCallView data={data} onRefresh={reload} />
  if (data.type === 'admin') return <AdminView data={data} onRefresh={reload} />
  return <NotOnCallView data={data} />
}
