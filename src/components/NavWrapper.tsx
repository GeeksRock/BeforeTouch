'use client'

import { usePathname } from 'next/navigation'
import Nav from './Nav'

const HIDDEN_PATHS = ['/login', '/signup', '/setup']

export default function NavWrapper() {
  const pathname = usePathname()
  if (HIDDEN_PATHS.includes(pathname)) return null
  return <Nav />
}
