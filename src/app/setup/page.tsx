'use client'

import { useState } from 'react'
import { saveCompany } from './actions'
import { validateStep } from './validation'
import type { SetupForm } from './_steps/types'
import Step1Company from './_steps/Step1Company'
import Step2Rotation from './_steps/Step2Rotation'
import Step3Volunteers from './_steps/Step3Volunteers'
import Step4Review from './_steps/Step4Review'

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SetupForm>({
    name: '',
    rotation_length: '',
    rotation_start_day: '',
    rotation_start_time: '',
    rotation_end_day: '',
    rotation_end_time: '',
    has_backup: false,
    allowed_volunteer_types: [],
    approval_approver: 'on_call',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm(prev => ({ ...prev, [name]: checked }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  function handleVolunteerType(type: string) {
    setForm(prev => {
      const already = prev.allowed_volunteer_types.includes(type)
      return {
        ...prev,
        allowed_volunteer_types: already
          ? prev.allowed_volunteer_types.filter(t => t !== type)
          : [...prev.allowed_volunteer_types, type],
      }
    })
  }

  function next() {
    const missing = validateStep(step, form)
    if (missing.length > 0) {
      setError('Please fill in: ' + missing.join(', '))
      return
    }
    setError(null)
    setStep(s => Math.min(s + 1, 4))
  }

  function back() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await saveCompany(form)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  const stepProps = {
    form,
    onChange: handleChange,
    onVolunteerType: handleVolunteerType,
    onBack: back,
  }

  return (
    <main className="max-w-2xl mx-auto p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Set up your company</h1>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map(n => (
          <span
            key={n}
            className={
              'w-7 h-7 rounded-full flex items-center justify-center text-sm ' +
              (n === step
                ? 'bg-black text-white'
                : 'bg-white border border-gray-300 text-gray-600')
            }
          >
            {n}
          </span>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}

      {step === 1 && <Step1Company {...stepProps} onNext={next} />}
      {step === 2 && <Step2Rotation {...stepProps} onNext={next} />}
      {step === 3 && <Step3Volunteers {...stepProps} onNext={next} />}
      {step === 4 && <Step4Review {...stepProps} onNext={handleSubmit} submitting={submitting} />}
    </main>
  )
}
