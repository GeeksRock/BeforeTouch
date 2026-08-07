import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateRotations } from '@/lib/generate-rotations'

interface GroupRow {
  id: string
  rotation_length: string
  rotation_start_time: string
  has_backup: boolean
  company: { timezone: string }
  employee_rotation_group: { employee_id: string; position: number }[]
}

interface RotationRow {
  id: string
  on_call_employee_id: string
  start_datetime: string
  end_datetime: string
  rotation_group_id: string
}

export async function regenerateRotations(now: Date): Promise<{ regenerated: number }> {
  const { data: groupData, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id, rotation_length, rotation_start_time, has_backup, company(timezone), employee_rotation_group(employee_id, position)')
  if (groupError) throw new Error(groupError.message)

  const { data: rotData, error: rotError } = await supabaseAdmin
    .from('rotation')
    .select('id, on_call_employee_id, start_datetime, end_datetime, rotation_group_id')
  if (rotError) throw new Error(rotError.message)

  const groups = (groupData ?? []) as unknown as GroupRow[]
  const allRotations = (rotData ?? []) as unknown as RotationRow[]
  let regenerated = 0

  for (const group of groups) {
    const rows = allRotations
      .filter((r) => r.rotation_group_id === group.id)
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
    if (rows.length === 0) continue

    const current = rows[0]
    if (new Date(current.end_datetime) > now) continue

    const next = rows[1]
    if (!next) throw new Error(`Group ${group.id} has no next rotation to continue from`)

    const roster = [...group.employee_rotation_group]
      .sort((a, b) => a.position - b.position)
      .map((m) => m.employee_id)

    const startIndex = roster.indexOf(next.on_call_employee_id)
    if (startIndex === -1) throw new Error(`Employee ${next.on_call_employee_id} is no longer on the roster for group ${group.id}`)

    const generated = generateRotations({
      startDate: next.start_datetime.slice(0, 10),
      startTime: group.rotation_start_time,
      timezone: group.company.timezone,
      rotationLength: group.rotation_length,
      hasBackup: group.has_backup,
      roster,
      startIndex,
    })

    await supabaseAdmin.from('rotation').delete().eq('rotation_group_id', group.id)
    const { error: insertError } = await supabaseAdmin
      .from('rotation')
      .insert(generated.map((r) => ({ ...r, rotation_group_id: group.id })))
    if (insertError) throw new Error(insertError.message)
    regenerated++
  }

  return { regenerated }
}
