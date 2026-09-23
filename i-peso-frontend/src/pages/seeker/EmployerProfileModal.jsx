import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, MapPin, Building2, CalendarDays, ExternalLink, ShieldCheck, X, BriefcaseBusiness, Info } from 'lucide-react'
import { Badge, Button, LoadingSkeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getPublicEmployerProfile, reportEmployer } from '@/services/seekerService'
import toast from 'react-hot-toast'

export default function EmployerProfileModal({ open, employerId, onClose, onApplyJob }) {
  const [reporting, setReporting] = useState(false)
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['publicEmployer', employerId],
    queryFn: () => getPublicEmployerProfile(employerId),
    enabled: !!employerId && open,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const employer = data?.employer
  const vacancies = data?.vacancies || []

  const handleReport = async () => {
    const reason = window.prompt('Why are you reporting this employer? (E.g., Fraudulent, abusive, misrepresentation)')
    if (!reason) return

    setReporting(true)
    try {
      await reportEmployer(employerId, { reason })
      toast.success('Employer reported successfully. Our team will review this.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report employer.')
    } finally {
      setReporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="fixed inset-y-0 right-0 z-50 h-full w-full max-w-none sm:w-[500px] lg:w-[650px] overflow-hidden p-0 gap-0 border-l bg-slate-50 shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right rounded-none">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm flex items-center justify-between">
          <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            Company Profile
          </DialogTitle>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-24">
          {isLoading ? (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <LoadingSkeleton variant="circular" width={64} height={64} />
                <LoadingSkeleton variant="text" rows={2} className="w-48" />
              </div>
              <LoadingSkeleton variant="card" rows={3} />
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900">Failed to load employer</h3>
              <p className="text-sm text-slate-500">{error?.response?.data?.message || 'Could not fetch company details.'}</p>
            </div>
          ) : employer ? (
            <>
              {/* Header Banner */}
              <div className="bg-gradient-to-br from-blue-700 to-indigo-900 px-6 py-8 text-white relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Building2 className="h-32 w-32" />
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
                    {employer.company_logo_url ? (
                      <img
                        src={employer.company_logo_url.startsWith('http') ? employer.company_logo_url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${employer.company_logo_url}`}
                        alt={employer.company_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 font-bold text-2xl">
                        {employer.company_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">{employer.company_name}</h2>
                    {employer.trade_name && employer.trade_name !== employer.company_name && (
                      <p className="text-blue-200 font-medium text-sm mt-0.5">Doing business as {employer.trade_name}</p>
                    )}
                    {employer.verification_status === 'verified' && (
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-600/30 px-3 py-1 text-xs font-bold text-white border border-blue-400/30">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified Employer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* Meta Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-start gap-3">
                    <BriefcaseBusiness className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Industry</p>
                      <p className="mt-1 font-semibold text-slate-900">{employer.industry || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{employer.full_address || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-3">
                    <Info className="h-5 w-5 text-slate-400" /> About the Company
                  </h3>
                  <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {employer.company_description || <span className="italic text-slate-400">No company description provided.</span>}
                  </div>
                </div>

                {/* Active Vacancies */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
                    <span>Active Vacancies</span>
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-black">{vacancies.length}</span>
                  </h3>
                  
                  {vacancies.length > 0 ? (
                    <div className="grid gap-3">
                      {vacancies.map(job => (
                        <div key={job.post_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
                          <h4 className="font-bold text-blue-700 text-lg leading-tight">{job.job_title}</h4>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{job.location}</span>
                            <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />{job.employment_type?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                      No other active vacancies right now.
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-slate-200 text-center">
                  <button 
                    onClick={handleReport}
                    disabled={reporting}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-600 transition"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Report this Employer
                  </button>
                </div>

              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
