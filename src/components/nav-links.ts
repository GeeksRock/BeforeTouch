export type NavRole = 'admin' | 'employee'

export interface NavLink {
  href: string
  label: string
}

const linksByRole: Record<NavRole, NavLink[]> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/admin/employees', label: 'Employees' },
    { href: '/settings', label: 'Settings' },
    { href: '/profile', label: 'Profile' },
  ],
  employee: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
  ],
}

export function getNavLinks(role: NavRole): NavLink[] {
  return linksByRole[role]
}
