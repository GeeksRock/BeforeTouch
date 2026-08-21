'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchNavRole } from './nav-actions'
import { getNavLinks, type NavRole } from './nav-links'
import { supabase } from '@/lib/supabase'

export default function Nav() {
  const [role, setRole] = useState<NavRole | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchNavRole().then(setRole)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!role) return null

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex flex-wrap items-center gap-6">
      {getNavLinks(role).map(({ href, label }) => (
        <Link key={href} href={href} className="text-sm font-medium hover:text-gray-300 transition-colors">
          {label}
        </Link>
      ))}
      <button
        onClick={handleLogout}
        className="ml-auto text-sm font-medium hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-none text-white"
      >
        Log out
      </button>
    </nav>
  )
}
