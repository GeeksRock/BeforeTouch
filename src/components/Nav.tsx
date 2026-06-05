'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchIsAdmin } from './nav-actions'
import { getNavLinks } from './nav-links'

export default function Nav() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchIsAdmin().then(setIsAdmin)
  }, [])

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-6">
      {getNavLinks(isAdmin).map(({ href, label }) => (
        <Link key={href} href={href} className="text-sm font-medium hover:text-gray-300 transition-colors">
          {label}
        </Link>
      ))}
    </nav>
  )
}
