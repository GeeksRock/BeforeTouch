import type React from 'react'

export type SetupForm = {
  name: string
  rotation_length: string
  rotation_start_day: string
  rotation_start_time: string
  rotation_end_day: string
  rotation_end_time: string
  has_backup: boolean
  is_active: boolean
  allowed_volunteer_types: string[]
  approval_approver: 'on_call' | 'manager'
}

export type StepProps = {
  form: SetupForm
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onVolunteerType: (type: string) => void
  onNext: () => void
  onBack: () => void
  submitting?: boolean
}
