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
    { company_id: data.company_id, role: 'current', ...data.current },
    { company_id: data.company_id, role: 'next', ...data.next },
  ]

  if (data.backup_current) {
    records.push({ company_id: data.company_id, role: 'backup_current', ...data.backup_current })
  }
  if (data.backup_next) {
    records.push({ company_id: data.company_id, role: 'backup_next', ...data.backup_next })
  }

  const { error } = await supabase.from('rotation').insert(records)
  if (error) throw new Error(error.message)
  redirect('/dashboard')
}
