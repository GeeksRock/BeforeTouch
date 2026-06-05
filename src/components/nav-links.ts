export interface NavLink {
  href: string
  label: string
}

const adminLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/setup/employees', label: 'Employees' },
  { href: '/setup/rotation', label: 'Rotation' },
  { href: '/settings', label: 'Settings' },
  { href: '/profile', label: 'Profile' },
]

const userLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
]

export function getNavLinks(isAdmin: boolean): NavLink[] {
  return isAdmin ? adminLinks : userLinks
}
