'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchIsAdmin } from './nav-actions'
import { getNavLinks } from './nav-links'
import { supabase } from '@/lib/supabase'

export default function Nav() {
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchIsAdmin().then(setIsAdmin)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-6">
      {getNavLinks(isAdmin).map(({ href, label }) => (
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
