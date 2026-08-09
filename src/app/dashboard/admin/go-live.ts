'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateRotations } from '@/lib/generate-rotations'

interface GroupRow {
  id: string
  name: string
  rotation_length: string
  rotation_start_time: string
  has_backup: boolean
  employee_rotation_group: { employee_id: string; position: number }[]
}

export async function goLive(startDate: string): Promise<{ error: string | null }> {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: employee, error: empError } = await supabaseAdmin
    .from('employee')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (empError) throw new Error(empError.message)
  if (!employee) throw new Error('Employee record not found')

  const { data: company, error: compError } = await supabaseAdmin
    .from('company')
    .select('id, state, timezone')
    .eq('id', employee.company_id)
    .maybeSingle()
  if (compError) throw new Error(compError.message)
  if (!company) throw new Error('Company not found')
  if (company.state !== 'setup') return { error: 'This company is already live' }

  const { data: groups, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id, name, rotation_length, rotation_start_time, has_backup, employee_rotation_group(employee_id, position)')
    .eq('company_id', company.id)
  if (groupError) throw new Error(groupError.message)

  const rows = (groups ?? []) as unknown as GroupRow[]
  if (rows.length === 0) return { error: 'Create a rotation group before going live' }

  for (const group of rows) {
    const required = group.has_backup ? 3 : 2
    if (group.employee_rotation_group.length < required) {
      return { error: `${group.name} needs at least ${required} members before you can go live` }
    }
  }

  const rotations = rows.flatMap((group) => {
    const roster = [...group.employee_rotation_group]
      .sort((a, b) => a.position - b.position)
      .map((m) => m.employee_id)
    return generateRotations({
      startDate,
      startTime: group.rotation_start_time,
      timezone: company.timezone,
      rotationLength: group.rotation_length,
      hasBackup: group.has_backup,
      roster,
      startIndex: 0,
    }).map((r) => ({ ...r, company_id: company.id, rotation_group_id: group.id }))
  })

  const { error: stateError } = await supabaseAdmin
    .from('company')
    .update({ state: 'live' })
    .eq('id', company.id)
  if (stateError) throw new Error(stateError.message)

  const { error: insertError } = await supabaseAdmin.from('rotation').insert(rotations)
  if (insertError) throw new Error(insertError.message)

  return { error: null }
}
