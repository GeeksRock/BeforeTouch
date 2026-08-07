'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { fetchAdminDashboard, type AdminDashboardData } from './actions'
import { goLive } from './go-live'

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [goingLive, setGoingLive] = useState(false)
  const [goLiveError, setGoLiveError] = useState<string | null>(null)

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ data, error }) => {
        if (error) setError(error)
        else setData(data)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  async function handleGoLive() {
    setGoingLive(true)
    setGoLiveError(null)
    const { error } = await goLive(startDate)
    if (error) {
      setGoLiveError(error)
      setGoingLive(false)
      return
    }
    const refreshed = await fetchAdminDashboard()
    if (refreshed.data) setData(refreshed.data)
    setGoingLive(false)
  }

  if (loading) return <main className="max-w-lg mx-auto p-8">Loading…</main>
  if (error) return <main className="max-w-lg mx-auto p-8 text-red-600">{error}</main>
  if (!data) return null

  const { company, rotation, employees } = data

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-1">{company.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Admin view</p>

      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Active rotation</h2>
        {company.state === 'setup' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Choose the date your first rotation begins, then go live.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border p-2 rounded bg-white text-gray-900"
              />
            </label>
            {goLiveError && <p className="text-sm text-red-600">{goLiveError}</p>}
            <button
              onClick={handleGoLive}
              disabled={!startDate || goingLive}
              className="bg-blue-600 text-white rounded px-4 h-11 disabled:opacity-50"
            >
              {goingLive ? 'Going live…' : 'Go live'}
            </button>
          </div>
        ) : rotation ? (
          <>
            <p className="text-sm font-medium">On call: {rotation.on_call_employee_name}</p>
            <p className="text-sm">From: {new Date(rotation.start_datetime).toLocaleString()}</p>
            <p className="text-sm">To: {new Date(rotation.end_datetime).toLocaleString()}</p>
          </>
        ) : (
          <p className="text-sm text-gray-500">No active rotation.</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Employees</h2>
          <Link href="/dashboard/admin/employees" className="text-sm underline">
            Manage
          </Link>
        </div>
        {employees.length === 0 ? (
          <p className="text-sm text-gray-500">No employees yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {employees.map(emp => (
              <li key={emp.id} className="border rounded p-3 text-sm flex items-center justify-between">
                <span className="font-medium">{emp.name}</span>
                <span className={emp.is_active ? 'text-green-700' : 'text-gray-400'}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
