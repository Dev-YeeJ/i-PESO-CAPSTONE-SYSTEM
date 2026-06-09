import { useState } from 'react'
import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AlertBox, Button, Card, CardHeader } from '@/components/ui'
import * as employerService from '@/services/employerService'

const initialForm = {
  job_title: '',
  employment_type: 'Full-time',
  location: '',
  job_description: '',
  vacancies_count: 1,
  salary_min: '',
  salary_max: '',
  required_skills: '',
  status: 'active',
}

export default function PostJobPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await employerService.createVacancy({
        ...form,
        vacancies_count: Number(form.vacancies_count),
        salary_min: form.salary_min === '' ? null : Number(form.salary_min),
        salary_max: form.salary_max === '' ? null : Number(form.salary_max),
        required_skills: form.required_skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      })
      navigate('/employer/vacancies')
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to create the job vacancy.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="portal-page">
      <div>
        <p className="portal-eyebrow">Recruitment Management</p>
        <h1 className="portal-title mt-1">Create Job Post</h1>
        <p className="portal-subtitle">Publish a clear, complete opportunity for qualified i-PESO job seekers.</p>
      </div>

      {error && <AlertBox variant="danger" title="Job post could not be saved">{error}</AlertBox>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Vacancy Details" subtitle="Complete the employment details before publishing." />
          <form onSubmit={submit} className="space-y-5">
            <Input label="Job title" name="job_title" value={form.job_title} onChange={change} required />
            <div className="grid gap-5 md:grid-cols-2">
              <Select label="Employment type" name="employment_type" value={form.employment_type} onChange={change} options={['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']} />
              <Input label="Work location" name="location" value={form.location} onChange={change} required />
              <Input label="Number of vacancies" name="vacancies_count" type="number" min="1" value={form.vacancies_count} onChange={change} required />
              <Select label="Publishing status" name="status" value={form.status} onChange={change} options={['active', 'draft']} />
              <Input label="Minimum salary" name="salary_min" type="number" min="0" value={form.salary_min} onChange={change} />
              <Input label="Maximum salary" name="salary_max" type="number" min="0" value={form.salary_max} onChange={change} />
            </div>
            <Input label="Required skills" hint="Separate skills with commas" name="required_skills" value={form.required_skills} onChange={change} placeholder="PHP, Laravel, MySQL" />
            <label className="portal-label">
              Job description
              <textarea name="job_description" value={form.job_description} onChange={change} required rows={8} className="portal-input resize-y" placeholder="Describe the role, responsibilities, qualifications, and working arrangements." />
            </label>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => navigate('/employer/vacancies')}>Cancel</Button>
              <Button type="submit" disabled={saving} icon={CheckCircle2}>{saving ? 'Publishing...' : 'Create Vacancy'}</Button>
            </div>
          </form>
        </Card>

        <Card
          hero
          heroContent={<><BriefcaseBusiness className="relative z-10 h-7 w-7 text-brand-gold" /><h2 className="relative z-10 mt-4 text-xl font-extrabold">Strong job posts attract stronger matches.</h2></>}
        >
          <p className="text-sm leading-6 text-slate-600">Use a specific title, realistic requirements, complete location, and a clear description of daily responsibilities.</p>
          <div className="mt-5 space-y-3">
            {['Use recognized occupation titles', 'List only essential skills', 'Provide a transparent salary range', 'Save as draft when details are incomplete'].map((tip) => (
              <div key={tip} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{tip}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Input({ label, hint, ...props }) {
  return <label className="portal-label">{label}{hint && <span className="ml-1 text-xs font-normal text-slate-400">({hint})</span>}<input {...props} className="portal-input" /></label>
}

function Select({ label, options, ...props }) {
  return <label className="portal-label">{label}<select {...props} className="portal-input">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}
