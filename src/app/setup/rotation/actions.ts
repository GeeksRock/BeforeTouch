'use server'

import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const records = [
    {
      company_id: data.company_id,
      on_call_employee_id: data.current.employee_id,
      backup_employee_id: data.backup_current?.employee_id ?? null,
      start_datetime: data.current.start_datetime,
      end_datetime: data.current.end_datetime,
    },
    {
      company_id: data.company_id,
      on_call_employee_id: data.next.employee_id,
      backup_employee_id: data.backup_next?.employee_id ?? null,
      start_datetime: data.next.start_datetime,
      end_datetime: data.next.end_datetime,
    },
  ]

  const { error } = await supabase.from('rotation').insert(records)
  if (error) throw new Error(error.message)
  redirect('/dashboard')
}
