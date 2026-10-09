// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

const pathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
}))
vi.mock('./Nav', () => ({
  default: () => <nav>nav</nav>,
}))

import NavWrapper from './NavWrapper'

afterEach(() => {
  cleanup()
})

describe('NavWrapper', () => {
  it('shows the nav on app pages', () => {
    pathname.mockReturnValue('/dashboard')
    render(<NavWrapper />)
    expect(screen.queryByRole('navigation')).not.toBeNull()
  })

  it('hides the nav on /set-password so it mounts fresh after sign-in', () => {
    pathname.mockReturnValue('/set-password')
    render(<NavWrapper />)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
