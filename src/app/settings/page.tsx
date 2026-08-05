'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { fetchRotationGroups } from './actions'
import type { RotationGroupSummary } from './actions'

export default function SettingsPage() {
  const [groups, setGroups] = useState<RotationGroupSummary[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetchRotationGroups().then(({ data, error }) => {
      if (data) setGroups(data)
      if (error) setLoadError(error)
    })
  }, [])

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Rotation groups</h1>
      <Link href="/settings/new" className="underline mb-4 inline-block">Add group</Link>
      {loadError && <p className="text-red-600 mb-4">{loadError}</p>}
      {!loadError && groups.length === 0 && (
        <p className="text-gray-400 mb-4">No rotation groups yet.</p>
      )}
      <ul className="flex flex-col gap-2">
        {groups.map(group => (
          <li key={group.id} className="border p-3 rounded flex items-center justify-between">
            {group.name}
            <Link href={`/settings/${group.id}`} className="underline">Edit</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
