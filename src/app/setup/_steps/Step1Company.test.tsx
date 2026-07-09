// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
expect.extend(matchers)
import Step1Company from './Step1Company'
import type { SetupForm } from './types'

const emptyForm: SetupForm = {
  name: '',
  rotation_length: '',
  rotation_start_day: '',
  rotation_start_time: '',
  rotation_end_day: '',
  rotation_end_time: '',
  has_backup: false,
  is_active: false,
  allowed_volunteer_types: [],
  approval_approver: 'on_call',
}

const noop = () => {}

describe('Step1Company', () => {
  it('renders the company heading', () => {
    render(
      <Step1Company
        form={emptyForm}
        onChange={noop}
        onVolunteerType={noop}
        onNext={noop}
        onBack={noop}
      />
    )
    expect(screen.getByRole('heading', { name: 'Company' })).toBeInTheDocument()
  })
})
