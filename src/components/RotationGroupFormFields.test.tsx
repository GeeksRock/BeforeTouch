// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RotationGroupFormFields, { defaultRotationGroupForm } from './RotationGroupFormFields'
import type { RotationGroupForm } from '@/app/settings/actions'
function Harness() {
  const [form, setForm] = useState<RotationGroupForm>(defaultRotationGroupForm)
  return (
    <RotationGroupFormFields
      form={form}
      setForm={setForm}
      onSubmit={(e) => e.preventDefault()}
      saveError={null}
      submitLabel="Save"
    />
  )
}
describe('RotationGroupFormFields volunteer type requirement', () => {
  beforeEach(() => {
    cleanup()
  })
  it('disables submit when no volunteer type is chosen', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })
  it('enables submit once a volunteer type is chosen', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Full rotation'))
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false)
  })
  it('disables submit again when the last volunteer type is unchecked', async () => {
    render(<Harness />)
    const box = screen.getByLabelText('Full rotation')
    await userEvent.click(box)
    await userEvent.click(box)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true)
  })
  it('tells the manager at least one is required', () => {
    render(<Harness />)
    expect(screen.getByText(/pick at least one/i)).toBeTruthy()
  })
})
