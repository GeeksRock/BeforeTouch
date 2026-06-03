'use server'

import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface CompanyForm {
  name: string
  rotation_length: string
  rotation_start_day: string
  rotation_start_time: string
  rotation_end_day: string
  rotation_end_time: string
  has_backup: boolean
  allowed_volunteer_types: string[]
}

export async function saveCompany(data: CompanyForm) {
  const { data: company, error } = await supabase.from('company').insert([data]).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/setup/employees?company_id=${company.id}`)
}
