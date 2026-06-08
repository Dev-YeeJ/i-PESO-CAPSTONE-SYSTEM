import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Post a Job</h1>
      <p className="mt-1 text-sm text-slate-500">Create a vacancy under your PESO-verified employer account.</p>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <Input label="Job title" name="job_title" value={form.job_title} onChange={change} required />
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Employment type" name="employment_type" value={form.employment_type} onChange={change} options={['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']} />
          <Input label="Location" name="location" value={form.location} onChange={change} required />
          <Input label="Number of vacancies" name="vacancies_count" type="number" min="1" value={form.vacancies_count} onChange={change} required />
          <Select label="Publishing status" name="status" value={form.status} onChange={change} options={['active', 'draft']} />
          <Input label="Minimum salary" name="salary_min" type="number" min="0" value={form.salary_min} onChange={change} />
          <Input label="Maximum salary" name="salary_max" type="number" min="0" value={form.salary_max} onChange={change} />
        </div>
        <Input label="Required skills" hint="Comma-separated, for example: PHP, Laravel, MySQL" name="required_skills" value={form.required_skills} onChange={change} />
        <label className="block text-sm font-medium text-slate-700">
          Job description
          <textarea name="job_description" value={form.job_description} onChange={change} required rows={7} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
        </label>
        <button disabled={saving} className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white disabled:opacity-50">
          {saving ? 'Publishing...' : 'Create Vacancy'}
        </button>
      </form>
    </div>
  )
}

function Input({ label, hint, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {hint && <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>}
      <input {...props} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
    </label>
  )
}

function Select({ label, options, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select {...props} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
