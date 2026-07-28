'use server'

import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface RotationEntry {
  employee_id: string
  start_datetime: string
  end_datetime: string
}

interface RotationForm {
  company_id: string
  current: RotationEntry
  next: RotationEntry
  backup_current?: RotationEntry
  backup_next?: RotationEntry
}

export async function saveRotation(data: RotationForm) {
  const { data: group, error: groupError } = await supabaseAdmin
    .from('rotation_group')
    .select('id')
    .eq('company_id', data.company_id)
    .eq('name', 'Default')
    .single()
  if (groupError) throw new Error(groupError.message)
  if (!group) throw new Error('Default rotation group not found')

  const records = [
    {
      company_id: data.company_id,
      rotation_group_id: group.id,
      on_call_employee_id: data.current.employee_id,
      backup_employee_id: data.backup_current?.employee_id ?? null,
      start_datetime: data.current.start_datetime,
      end_datetime: data.current.end_datetime,
    },
    {
      company_id: data.company_id,
      rotation_group_id: group.id,
      on_call_employee_id: data.next.employee_id,
      backup_employee_id: data.backup_next?.employee_id ?? null,
      start_datetime: data.next.start_datetime,
      end_datetime: data.next.end_datetime,
    },
  ]

  const { error } = await supabaseAdmin.from('rotation').insert(records)
  if (error) throw new Error(error.message)
  redirect('/dashboard')
}

export async function getDefaultRotationGroupHasBackup(companyId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('rotation_group')
    .select('has_backup')
    .eq('company_id', companyId)
    .eq('name', 'Default')
    .single()
  if (error) throw new Error(error.message)
  return data.has_backup
}
