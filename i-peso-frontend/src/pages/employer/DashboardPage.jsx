import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, Clock3, UsersRound, Calendar, Award, FileX2, Plus, Users, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import { AlertBox, Badge, Button, Card, CardHeader, LoadingSkeleton, StatCard } from '@/components/ui'
import * as employerService from '@/services/employerService'
import * as employerDashboardService from '@/services/employerDashboardService'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'

const DOCUMENT_LABELS = {
  mayors_permit: "Mayor's Permit",
  bir_certificate: 'BIR Certificate',
  dti_certificate: 'DTI Certificate',
  sec_certificate: 'SEC Certificate',
  prpa_license: 'PRPA License',
  dme_poea_license: 'DMW/POEA License',
  philJobnet_proof: 'PhilJobNet Proof',
  affidavit_of_undertaking: 'Affidavit of Undertaking',
  no_pending_case_certificate: 'Certificate of No Pending Case (DOLE)',
  government_id: 'Government ID',
  authorization_letter: 'Authorization Letter',
}

export default function EmployerDashboard() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  
  const [error, setError] = useState('')
  const [reuploadError, setReuploadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reuploadingType, setReuploadingType] = useState(null)
  const [reuploadNotice, setReuploadNotice] = useState('')

  const loadDashboard = useCallback(() => {
    setLoading(true)
    Promise.all([
      employerService.getProfile(),
      // Only fetch stats if they are already verified, otherwise it will fail or be empty. We can just fetch and catch.
      employerDashboardService.getDashboardStats().catch(() => null)
    ])
      .then(([profileResult, statsResult]) => {
        setProfile(profileResult)
        if (statsResult) {
          setStats(statsResult)
        }
        
        updateUser({
          verification_status: profileResult.employer.verification_status,
          company_name: profileResult.employer.company_name,
          name: profileResult.employer.company_name,
          employer: {
            ...user?.employer,
            logo_url: profileResult.employer.company_logo_url,
          }
        })
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message ?? 'Unable to load the employer workspace.')
      })
      .finally(() => setLoading(false))
  }, [updateUser, user?.employer])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleReupload = useCallback(async (documentType, file, expirationDate = null) => {
    setReuploadingType(documentType)
    setReuploadError('')
    setReuploadNotice('')
    try {
      await employerService.reuploadDocument(documentType, file, expirationDate)
      setReuploadNotice(`${DOCUMENT_LABELS[documentType] ?? documentType} has been re-uploaded and is now under review.`)
      await loadDashboard()
    } catch (requestError) {
      const msg = requestError.response?.data?.message
        ?? requestError.response?.data?.errors?.document_file?.[0]
        ?? requestError.response?.data?.errors?.expiration_date?.[0]
        ?? 'Unable to re-upload the document.'
      setReuploadError(msg)
    } finally {
      setReuploadingType(null)
    }
  }, [loadDashboard])

  const status = profile?.employer?.verification_status ?? user?.verification_status ?? 'pending'
  const documents = profile?.documents ?? []
  const hasRejectedDocuments = documents.some((doc) => doc.verification_status === 'rejected')
  const effectiveStatus = status === 'pending' && hasRejectedDocuments ? 'rejected' : status
  
  const requiredDocuments = useMemo(() => {
    const base = profile?.required_documents ?? []
    if (base.length === 0) return base
    return [...base, 'government_id']
  }, [profile])

  if (loading) {
    return <div className="space-y-6"><LoadingSkeleton variant="card" rows={1} /><div className="grid grid-cols-4 gap-4"><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /></div></div>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Employer Control Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {profile?.employer?.company_name ?? 'Employer'}. Here is what's happening today.
          </p>
        </div>
      </div>

      {error && <AlertBox variant="danger" title="Employer workspace unavailable">{error}</AlertBox>}
      {reuploadError && <AlertBox variant="danger" title="Document re-upload failed">{reuploadError}</AlertBox>}
      {reuploadNotice && <AlertBox variant="success" title="Document re-uploaded">{reuploadNotice}</AlertBox>}
      
      <PendingVerificationBanner 
        status={effectiveStatus} 
        rejectionReason={profile?.employer?.rejection_reason} 
        documents={documents} 
        requiredDocuments={requiredDocuments} 
        onReupload={handleReupload} 
        reuploadingType={reuploadingType} 
      />

      {effectiveStatus === 'verified' && stats ? (
        <>
          {/* Top Row: KPIs - What is happening? */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BriefcaseBusiness} color="blue" label="Active Vacancies" value={stats.kpis.active_vacancies} subtitle="Currently published" hint="Number of jobs currently visible to job seekers." />
            <StatCard icon={UsersRound} color="amber" label="Pending Applicants" value={stats.kpis.pending_applications} subtitle="Requires your review" hint="Number of applications that have not been processed." />
            <StatCard icon={Calendar} color="violet" label="Upcoming Interviews" value={stats.kpis.upcoming_interviews} subtitle="Scheduled meetings" hint="Interviews scheduled for the future." />
            <StatCard icon={Award} color="emerald" label="Total Hired" value={stats.kpis.total_hired} subtitle="Through i-PESO" hint="Total candidates successfully hired through the platform." />
          </div>

          {/* Middle Row: Trends & Alerts */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Trends - What changed? */}
            <Card className="xl:col-span-2">
              <CardHeader title="Application Trends" subtitle="Volume of applications received over the last 14 days." />
              <div className="mt-6 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line type="monotone" dataKey="count" name="Applications" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Alerts/Tasks - What needs attention? */}
            <Card className="flex flex-col">
              <CardHeader title="Attention Required" subtitle="Tasks prioritizing your immediate action." />
              <div className="mt-4 flex-1 space-y-3">
                {stats.kpis.pending_applications > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-amber-100 p-2 text-amber-600"><UsersRound className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">{stats.kpis.pending_applications} New Applications</p>
                        <p className="text-xs text-amber-700">Review pending candidates in your ATS.</p>
                      </div>
                    </div>
                    <Button to="/employer/ats" variant="secondary" size="sm" className="mt-3 w-full bg-amber-100 text-amber-800 hover:bg-amber-200">Go to ATS</Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-emerald-100 p-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Inbox Zero</p>
                        <p className="text-xs text-emerald-700">All applications have been reviewed.</p>
                      </div>
                    </div>
                  </div>
                )}

                {stats.kpis.upcoming_interviews > 0 && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-violet-100 p-2 text-violet-600"><Calendar className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-violet-900">{stats.kpis.upcoming_interviews} Upcoming Interviews</p>
                        <p className="text-xs text-violet-700">Prepare for your scheduled interviews.</p>
                      </div>
                    </div>
                    <Button to="/employer/calendar" variant="secondary" size="sm" className="mt-3 w-full bg-violet-100 text-violet-800 hover:bg-violet-200">View Calendar</Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Bottom Row: Activity & Quick Actions */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Activity - What happened recently? */}
            <Card className="xl:col-span-2">
              <CardHeader title="Recent Activity" subtitle="Latest applicant submissions across your active vacancies." />
              <div className="mt-4">
                {stats.recent_activity?.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {stats.recent_activity.map((activity) => (
                      <div key={activity.apply_id} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <UserPlus className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{activity.seeker_name}</p>
                            <p className="text-xs text-slate-500">Applied for <span className="font-medium text-slate-700">{activity.job_title}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                          <Badge variant={activity.status}>{activity.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-800">No recent activity</p>
                    <p className="mt-1 text-sm text-slate-500">When candidates apply, they will show up here.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions - What can I do now? */}
            <Card>
              <CardHeader title="Quick Actions" subtitle="Common tasks to manage your hiring." />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-1">
                <Link to="/employer/post-job" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600"><Plus className="h-5 w-5" /></div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Post a Job</p>
                    <p className="hidden text-xs text-slate-500 sm:block">Create a new vacancy</p>
                  </div>
                </Link>
                <Link to="/employer/ats" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600"><UsersRound className="h-5 w-5" /></div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Applicant Tracking</p>
                    <p className="hidden text-xs text-slate-500 sm:block">Manage candidates</p>
                  </div>
                </Link>
                <Link to="/employer/job-fairs" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600"><Building2 className="h-5 w-5" /></div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Job Fairs</p>
                    <p className="hidden text-xs text-slate-500 sm:block">Join upcoming events</p>
                  </div>
                </Link>
                <Link to="/employer/profile" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
                  <div className="rounded-lg bg-violet-100 p-2 text-violet-600"><BriefcaseBusiness className="h-5 w-5" /></div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Company Profile</p>
                    <p className="hidden text-xs text-slate-500 sm:block">Edit your public profile</p>
                  </div>
                </Link>
              </div>
            </Card>
          </div>
        </>
      ) : !documents.length && (
        <Card>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="rounded-xl bg-amber-50 p-4 text-amber-700"><Clock3 className="h-7 w-7" /></span>
            <div className="flex-1"><h2 className="text-lg font-bold text-slate-950">Hiring tools are temporarily locked</h2><p className="mt-1 text-sm leading-6 text-slate-600">PESO must approve the employer accreditation and required documents before vacancies can be published.</p></div>
          </div>
        </Card>
      )}
    </div>
  )
}
