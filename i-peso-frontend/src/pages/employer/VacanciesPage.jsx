import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, MapPin, Plus, Trash2, UsersRound, Calendar, Banknote, GraduationCap, Clock } from 'lucide-react'
import { AlertBox, Badge, Button, Card, CardHeader, EmptyState, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import * as employerService from '@/services/employerService'

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

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

  const confirmDelete = async () => {
    const id = pendingDelete?.post_id
    if (!id) return
    try {
      await employerService.deleteVacancy(id)
      setVacancies((current) => current.filter((vacancy) => vacancy.post_id !== id))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to delete this vacancy.')
    } finally {
      setPendingDelete(null)
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
          <div className="border-t border-slate-200 p-5 sm:p-6"><LoadingSkeleton variant="card" rows={3} /></div>
        ) : vacancies.length === 0 ? (
          <div className="border-t border-slate-200">
            <EmptyState
              icon={BriefcaseBusiness}
              title="No vacancies posted yet"
              description="Create your first job opportunity for PESO job seekers."
              action={{ label: 'Post a job', icon: Plus, to: '/employer/post-job' }}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {vacancies.map((vacancy) => (
              <div key={vacancy.post_id} className="flex flex-col gap-4 px-5 py-6 transition hover:bg-slate-50 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4 w-full">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-sm border border-blue-100"><BriefcaseBusiness className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900 truncate">{vacancy.job_title}</h2>
                      <Badge variant={vacancy.status} className="uppercase text-[10px] tracking-wider">{vacancy.status}</Badge>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /><span className="truncate">{vacancy.location}</span></span>
                      <span className="flex items-center gap-1.5"><UsersRound className="h-4 w-4 text-slate-400" />{vacancy.vacancies_count} opening(s)</span>
                      <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4 text-slate-400" /><span className="capitalize truncate">{vacancy.employment_type?.replaceAll('_', ' ')}</span></span>
                      
                      {!vacancy.hide_salary && vacancy.salary_min && (
                         <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                           <Banknote className="h-4 w-4 text-emerald-500" />
                           ₱{Number(vacancy.salary_min).toLocaleString()} {vacancy.salary_max && vacancy.salary_max > vacancy.salary_min ? `- ₱${Number(vacancy.salary_max).toLocaleString()}` : ''} <span className="text-xs text-slate-400 font-normal">/ {vacancy.salary_type?.toLowerCase() || 'mo'}</span>
                         </span>
                      )}
                      
                      {vacancy.experience_level && (
                         <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /><span className="truncate">{vacancy.experience_level}</span></span>
                      )}

                      {vacancy.application_deadline && (
                         <span className="flex items-center gap-1.5 text-amber-700"><Calendar className="h-4 w-4 text-amber-500" />Deadline: {new Date(vacancy.application_deadline).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 ml-4 hidden lg:flex">
                    <Button to={`/employer/ats?vacancy_id=${vacancy.post_id}`} variant="outline" size="sm" icon={UsersRound}>View Applicants</Button>
                    <Button onClick={() => setPendingDelete(vacancy)} variant="ghost" size="sm" icon={Trash2} className="text-red-600 hover:bg-red-50 hover:text-red-700">Delete</Button>
                  </div>
                </div>
                {/* Mobile action buttons */}
                <div className="flex flex-row gap-2 w-full lg:hidden mt-2 pt-4 border-t border-slate-100">
                  <Button to={`/employer/ats?vacancy_id=${vacancy.post_id}`} variant="outline" size="sm" icon={UsersRound} className="flex-1 justify-center">Applicants</Button>
                  <Button onClick={() => setPendingDelete(vacancy)} variant="ghost" size="sm" icon={Trash2} className="flex-1 justify-center text-red-600 hover:bg-red-50 hover:text-red-700">Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this vacancy?</DialogTitle>
            <DialogDescription>
              &ldquo;{pendingDelete?.job_title}&rdquo; will be permanently removed and will no longer be visible to job seekers. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} onClick={confirmDelete}>Delete vacancy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
