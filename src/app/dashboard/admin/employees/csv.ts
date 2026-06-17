export interface ParsedEmployeeRow {
  name: string
  contact: string
  can_volunteer: boolean
  can_receive_volunteers: boolean
  is_active: boolean
}

export interface ParseResult {
  rows: ParsedEmployeeRow[]
  errors: string[]
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') return defaultValue
  const v = value.trim().toLowerCase()
  return v === 'true' || v === 'yes' || v === 'y' || v === '1'
}

export function parseEmployeeCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
  if (lines.length === 0) return { rows: [], errors: ['No data found.'] }

  const header = lines[0].split(',').map(col => col.trim().toLowerCase())
  const nameIdx = header.indexOf('name')
  const contactIdx = header.indexOf('contact')

  if (nameIdx === -1 || contactIdx === -1) {
    return { rows: [], errors: ["The first row must be a header with at least 'name' and 'contact' columns."] }
  }

  const canVolunteerIdx = header.indexOf('can_volunteer')
  const canReceiveIdx = header.indexOf('can_receive_volunteers')
  const isActiveIdx = header.indexOf('is_active')

  const rows: ParsedEmployeeRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(col => col.trim())
    const name = cols[nameIdx] ?? ''
    const contact = cols[contactIdx] ?? ''

    if (!name || !contact) {
      errors.push(`Row ${i + 1}: missing name or contact, skipped.`)
      continue
    }

    rows.push({
      name,
      contact,
      can_volunteer: parseBoolean(canVolunteerIdx >= 0 ? cols[canVolunteerIdx] : undefined, true),
      can_receive_volunteers: parseBoolean(canReceiveIdx >= 0 ? cols[canReceiveIdx] : undefined, true),
      is_active: parseBoolean(isActiveIdx >= 0 ? cols[isActiveIdx] : undefined, true),
    })
  }

  return { rows, errors }
}
