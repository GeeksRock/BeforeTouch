import { DateTime } from 'luxon'

export interface GenerateRotationsInput {
  startDate: string
  startTime: string
  timezone: string
  rotationLength: string
  hasBackup: boolean
  roster: string[]
  startIndex: number
}

export interface GeneratedRotation {
  on_call_employee_id: string
  backup_employee_id: string | null
  start_datetime: string
  end_datetime: string
}

const LENGTH_WEEKS: Record<string, number> = {
  '1_week': 1,
  '2_weeks': 2,
  '4_weeks': 4,
}

const PERIODS = 2

export function generateRotations(input: GenerateRotationsInput): GeneratedRotation[] {
  const weeks = LENGTH_WEEKS[input.rotationLength]
  if (!weeks) throw new Error(`Unknown rotation length: ${input.rotationLength}`)

  const start = DateTime.fromISO(`${input.startDate}T${input.startTime}`, { zone: input.timezone })
  if (!start.isValid) throw new Error(`Invalid rotation start: ${start.invalidReason}`)

  const rotations: GeneratedRotation[] = []
  let periodStart = start

  for (let i = 0; i < PERIODS; i++) {
    const periodEnd = periodStart.plus({ weeks })
    rotations.push({
      on_call_employee_id: input.roster[(input.startIndex + i) % input.roster.length],
      backup_employee_id: input.hasBackup ? input.roster[(input.startIndex + i + 1) % input.roster.length] : null,
      start_datetime: periodStart.toUTC().toISO()!,
      end_datetime: periodEnd.toUTC().toISO()!,
    })
    periodStart = periodEnd
  }

  return rotations
}
