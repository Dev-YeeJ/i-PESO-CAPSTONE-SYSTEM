import { useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Card, CardHeader } from '@/components/ui'
import JobFairResultEntryEditor from '@/components/reports/JobFairResultEntryEditor'
import ConfirmationVacancyEditor, { blankConfirmationVacancy, stripBlankConfirmationVacancies } from '@/components/reports/ConfirmationVacancyEditor'
import { adminService } from '@/services/adminService'
import { useForm, FormProvider, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { blankResultEntry } from '@/components/reports/jobFairResultVocab'

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20'

function StepLabel({ step, children }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">{step}</span>
      {children}
    </span>
  )
}

function FormField({ label, value, onChange, type = 'text', textarea = false, className = '' }) {
  return (
    <label className={`text-[11px] font-extrabold uppercase tracking-wider text-slate-500 ${className}`}>
      {label}
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={`resize-none normal-case ${inputClass}`} />
      ) : (
        <input type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} className={`normal-case ${inputClass}`} />
      )}
    </label>
  )
}

const proxyReportSchema = z.object({
  company_name: z.string().min(1, 'Required'),
  employer_type: z.string(),
  contact_person: z.string().optional(),
  contact_number: z.string().optional(),
  clearance_no: z.string().optional(),
  total_male: z.number().min(0),
  total_female: z.number().min(0),
  total_applicants: z.number().min(0),
  total_qualified: z.number().min(0),
  total_hots: z.number().min(0),
  total_near_hired: z.number().min(0),
  total_rejected: z.number().min(0),
  total_vacancies_solicited: z.number().min(0),
  total_vacancies_offered: z.number().min(0),
  remarks: z.string().optional(),
  entries: z.array(z.any()),
})

const proxyConfirmationSchema = z.object({
  company_name: z.string().min(1, 'Required'),
  representative_1_name: z.string().optional(),
  representative_1_contact: z.string().optional(),
  representative_position: z.string().optional(),
  vacancies: z.array(z.any()),
})

function ProxyReportForm({ fairId, onSuccess }) {
  const methods = useForm({
    resolver: zodResolver(proxyReportSchema),
    defaultValues: {
      company_name: '',
      employer_type: 'paper_only_employer',
      contact_person: '',
      contact_number: '',
      clearance_no: '',
      total_male: 0,
      total_female: 0,
      total_applicants: 0,
      total_qualified: 0,
      total_hots: 0,
      total_near_hired: 0,
      total_rejected: 0,
      total_vacancies_solicited: 0,
      total_vacancies_offered: 0,
      remarks: '',
      entries: [],
    },
  })

  const { control, handleSubmit, reset } = methods
  const entries = useWatch({ control, name: 'entries' }) || []

  const onSubmit = async (data) => {
    try {
      await adminService.submitJobFairProxyResults(fairId, {
        ...data,
        entries: data.entries.filter((e) => e.applicant_name && e.position_applied_for)
          .map((e) => ({ ...e, mismatch_code: e.mismatch_code || null })),
      })
      toast.success('Admin Proxy Encoded report saved.')
      reset()
      onSuccess()
    } catch (e) {
      toast.error(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
    }
  }

  return (
    <Card>
      <CardHeader title={<StepLabel step={1}>Encode walk-in employer paper form</StepLabel>} subtitle="Admin Proxy Encoding does not create an employer account." />
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-wide text-slate-600">Employer Details</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller name="company_name" control={control} render={({ field }) => <FormField label="Company name" {...field} />} />
              <Controller name="employer_type" control={control} render={({ field }) => (
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Employer type
                  <select {...field} className={inputClass}>
                    <option value="paper_only_employer">Paper-only</option>
                    <option value="walk_in_employer">Walk-in</option>
                    <option value="out_of_town_employer">Out-of-town</option>
                    <option value="registered_employer">Registered</option>
                  </select>
                </label>
              )} />
              <Controller name="contact_person" control={control} render={({ field }) => <FormField label="Contact person" {...field} />} />
              <Controller name="contact_number" control={control} render={({ field }) => <FormField label="Contact number" {...field} />} />
              <Controller name="clearance_no" control={control} render={({ field }) => <FormField label="Job Fair Clearance No." {...field} />} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-wide text-slate-600">Aggregate Totals</p>
            <div className="grid gap-5 sm:grid-cols-3">
              <Controller name="total_male" control={control} render={({ field }) => <FormField label="Male applicants" type="number" {...field} />} />
              <Controller name="total_female" control={control} render={({ field }) => <FormField label="Female applicants" type="number" {...field} />} />
              <Controller name="total_applicants" control={control} render={({ field }) => <FormField label="Total applicants" type="number" {...field} />} />
              <Controller name="total_qualified" control={control} render={({ field }) => <FormField label="Qualified" type="number" {...field} />} />
              <Controller name="total_hots" control={control} render={({ field }) => <FormField label="Hired on the spot" type="number" {...field} />} />
              <Controller name="total_near_hired" control={control} render={({ field }) => <FormField label="Near-hired" type="number" {...field} />} />
              <Controller name="total_rejected" control={control} render={({ field }) => <FormField label="Mismatched (rejected)" type="number" {...field} />} />
              <Controller name="total_vacancies_solicited" control={control} render={({ field }) => <FormField label="Vacancies solicited" type="number" {...field} />} />
              <Controller name="total_vacancies_offered" control={control} render={({ field }) => <FormField label="Vacancies offered" type="number" {...field} />} />
            </div>
            <Controller name="remarks" control={control} render={({ field }) => <FormField label="Remarks" textarea className="mt-5 block" {...field} />} />
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-wide text-slate-600">
              Per-applicant register <span className="font-medium normal-case text-slate-400">(optional — leave empty to save aggregate totals only)</span>
            </p>
            <JobFairResultEntryEditor control={control} name="entries" searchApplicants={adminService.searchApplicantSuggestions} />
          </div>

          <div className="pt-2">
            <Button type="submit" icon={Save}>Save Proxy Report</Button>
          </div>
        </form>
      </FormProvider>
    </Card>
  )
}

function ProxyConfirmationForm({ fairId, onSuccess }) {
  const methods = useForm({
    resolver: zodResolver(proxyConfirmationSchema),
    defaultValues: {
      company_name: '',
      representative_1_name: '',
      representative_1_contact: '',
      representative_position: '',
      vacancies: [blankConfirmationVacancy()],
    },
  })

  const { control, handleSubmit, reset } = methods

  const onSubmit = async (data) => {
    try {
      await adminService.submitJobFairProxyConfirmation(fairId, {
        ...data,
        vacancies: stripBlankConfirmationVacancies(data.vacancies),
      })
      toast.success('Manual confirmation slip saved.')
      reset()
      onSuccess()
    } catch (e) {
      toast.error(Object.values(e.response?.data?.errors ?? {}).flat().join(' ') || e.response?.data?.message || 'Action failed.')
    }
  }

  return (
    <Card>
      <CardHeader title={<StepLabel step={2}>Encode manual confirmation slip</StepLabel>} subtitle="For confirmations received by phone, email, or paper." />
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-wide text-slate-600">Company & Representative</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller name="company_name" control={control} render={({ field }) => <FormField label="Company name" {...field} />} />
              <Controller name="representative_1_name" control={control} render={({ field }) => <FormField label="Representative name" {...field} />} />
              <Controller name="representative_position" control={control} render={({ field }) => <FormField label="Position/s" {...field} />} />
              <Controller name="representative_1_contact" control={control} render={({ field }) => <FormField label="Representative contact" {...field} />} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-wide text-slate-600">List of Vacancies / Orders</p>
            <Controller name="vacancies" control={control} render={({ field }) => (
              <ConfirmationVacancyEditor vacancies={field.value} onChange={field.onChange} />
            )} />
          </div>

          <div className="pt-2">
            <Button type="submit" icon={Save}>Save Confirmation</Button>
          </div>
        </form>
      </FormProvider>
    </Card>
  )
}

export function JobFairProxyForms({ fairId, onSuccess }) {
  return (
    <>
      <ProxyReportForm fairId={fairId} onSuccess={onSuccess} />
      <ProxyConfirmationForm fairId={fairId} onSuccess={onSuccess} />
    </>
  )
}
