import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as employerService from '@/services/employerService'

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
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
    await employerService.deleteVacancy(id)
    setVacancies((current) => current.filter((vacancy) => vacancy.post_id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Vacancies</h1>
          <p className="mt-1 text-sm text-slate-500">Jobs posted by your verified company.</p>
        </div>
        <Link to="/employer/post-job" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Post a Job</Link>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading vacancies...</div>
        ) : vacancies.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No vacancies posted yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vacancies.map((vacancy) => (
              <div key={vacancy.post_id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">{vacancy.job_title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{vacancy.employment_type} | {vacancy.location} | {vacancy.vacancies_count} opening(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vacancy.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {vacancy.status}
                  </span>
                  <button onClick={() => remove(vacancy.post_id)} className="text-sm font-semibold text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
