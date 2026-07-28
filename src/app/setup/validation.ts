import type { SetupForm } from './_steps/types'

type FieldCheck = {
  label: string
  filled: (form: SetupForm) => boolean
}

const stepFields: Record<number, FieldCheck[]> = {
  1: [
    { label: 'Company name', filled: f => f.name.trim() !== '' },
  ],
  2: [
    { label: 'Rotation length', filled: f => f.rotation_length !== '' },
    { label: 'Starts — day', filled: f => f.rotation_start_day !== '' },
    { label: 'Starts — time', filled: f => f.rotation_start_time !== '' },
    { label: 'Ends — day', filled: f => f.rotation_end_day !== '' },
    { label: 'Ends — time', filled: f => f.rotation_end_time !== '' },
  ],
  3: [
    { label: 'Allowed volunteer types', filled: f => f.allowed_volunteer_types.length > 0 },
  ],
  4: [],
}

export function validateStep(step: number, form: SetupForm): string[] {
  const fields = stepFields[step]
  if (!fields) throw new Error(`Unknown setup step: ${step}`)
  return fields.filter(field => !field.filled(form)).map(field => field.label)
}
