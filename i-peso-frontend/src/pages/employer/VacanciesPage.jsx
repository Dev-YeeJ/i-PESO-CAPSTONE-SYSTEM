import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, MapPin, Plus, Trash2, UsersRound } from 'lucide-react'
import { AlertBox, Badge, Button, Card, CardHeader } from '@/components/ui'
import * as employerService from '@/services/employerService'

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await employerService.getVacancies()
      setVacancies(result.data ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load vacancies.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id) => {
    if (!window.confirm('Delete this vacancy?')) return
    try {
      await employerService.deleteVacancy(id)
      setVacancies((current) => current.filter((vacancy) => vacancy.post_id !== id))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to delete this vacancy.')
    }
  }

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="portal-eyebrow">Recruitment Management</p>
          <h1 className="portal-title mt-1">My Vacancies</h1>
          <p className="portal-subtitle">Manage opportunities published under your PESO-accredited employer account.</p>
        </div>
        <Button to="/employer/post-job" icon={Plus}>Create Job Post</Button>
      </div>

      {error && <AlertBox variant="danger" title="Vacancy action failed">{error}</AlertBox>}

      <Card padding="none">
        <div className="p-5 sm:p-6">
          <CardHeader title="Published Opportunities" subtitle={`${vacancies.length} vacancy record${vacancies.length === 1 ? '' : 's'} in your account`} />
        </div>
        {loading ? (
          <div className="border-t border-slate-200 p-10 text-center text-sm text-slate-500">Loading vacancies...</div>
        ) : vacancies.length === 0 ? (
          <div className="border-t border-slate-200 px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><BriefcaseBusiness className="h-6 w-6" /></span>
            <p className="mt-4 font-extrabold text-slate-900">No vacancies posted yet</p>
            <p className="mt-1 text-sm text-slate-500">Create your first job opportunity for PESO job seekers.</p>
            <Button to="/employer/post-job" size="sm" icon={Plus} className="mt-5">Post a Job</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {vacancies.map((vacancy) => (
              <div key={vacancy.post_id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BriefcaseBusiness className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-slate-950">{vacancy.job_title}</h2>
                      <Badge variant={vacancy.status}>{vacancy.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{vacancy.location}</span>
                      <span className="flex items-center gap-1"><UsersRound className="h-3.5 w-3.5" />{vacancy.vacancies_count} opening(s)</span>
                      <span className="capitalize">{vacancy.employment_type?.replaceAll('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => remove(vacancy.post_id)} variant="ghost" size="sm" icon={Trash2} className="self-start text-red-600 hover:bg-red-50 hover:text-red-700 lg:self-auto">Delete</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
