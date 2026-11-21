import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { BriefcaseBusiness, Building2, CheckCircle2, Clock3, UsersRound, Calendar, Award, Plus, Users, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import DashboardAnnouncements from '@/components/announcements/DashboardAnnouncements'
import { AlertBox, Badge, Button, Card, CardHeader, LoadingSkeleton, StatCard } from '@/components/ui'
import LazyImage from '@/components/common/LazyImage'
import * as employerService from '@/services/employerService'
import * as employerDashboardService from '@/services/employerDashboardService'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'
import PortalPageHeader from '@/components/shell/PortalPageHeader'
import PlacementDeadlineStrip from './components/PlacementDeadlineStrip'

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100 shadow-elevated">
        <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm font-bold text-white">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400"></span>
          {payload[0].value} Applications
        </p>
      </div>
    )
  }
  return null
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
      employerDashboardService.getDashboardStats().catch(() => null)
    ])
      .then(([profileResult, statsResult]) => {
        setProfile(profileResult)
        if (statsResult) {
          setStats(statsResult)
        }
        
        const currentUser = useAuthStore.getState().user
        updateUser({
          verification_status: profileResult.employer.verification_status,
          company_name: profileResult.employer.company_name,
          name: profileResult.employer.company_name,
          employer: {
            ...currentUser?.employer,
            logo_url: profileResult.employer.company_logo_url,
          }
        })
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message ?? 'Unable to load the employer workspace.')
      })
      .finally(() => setLoading(false))
  }, [updateUser])

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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const status = profile?.employer?.verification_status ?? user?.verification_status ?? 'pending'
  const documents = profile?.documents ?? []
  const hasRejectedDocuments = documents.some((doc) => doc.verification_status === 'rejected')
  const effectiveStatus = status === 'pending' && hasRejectedDocuments ? 'rejected' : status
  
  // The profile API's required_documents already includes the representative's
  // Government ID (required for every employer) — no client-side append needed.
  const requiredDocuments = useMemo(() => profile?.required_documents ?? [], [profile])

  if (loading) {
    return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-24 sm:px-6 lg:px-8"><LoadingSkeleton variant="card" rows={1} /><div className="grid grid-cols-4 gap-4"><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /></div></div>
  }

  return (
    <Motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-[1440px] space-y-6 pb-16"
    >
      <Motion.div variants={itemVariants}>
        <PortalPageHeader
          title={`${getGreeting()}, ${profile?.employer?.company_name ?? 'Employer'}`}
          subtitle="Here's what needs your attention in your hiring workspace today."
        >
          {effectiveStatus === 'verified' && <Button to="/employer/post-job" icon={Plus}>Post a job</Button>}
        </PortalPageHeader>
      </Motion.div>

      {effectiveStatus === 'verified' && <PlacementDeadlineStrip />}

      <DashboardAnnouncements />

      {error && <Motion.div variants={itemVariants}><AlertBox variant="danger" title="Employer workspace unavailable">{error}</AlertBox></Motion.div>}
      {reuploadError && <Motion.div variants={itemVariants}><AlertBox variant="danger" title="Document re-upload failed">{reuploadError}</AlertBox></Motion.div>}
      {reuploadNotice && <Motion.div variants={itemVariants}><AlertBox variant="success" title="Document re-uploaded">{reuploadNotice}</AlertBox></Motion.div>}
      
      <Motion.div variants={itemVariants}>
        <PendingVerificationBanner 
          status={effectiveStatus} 
          rejectionReason={profile?.employer?.rejection_reason} 
          documents={documents} 
          requiredDocuments={requiredDocuments} 
          onReupload={handleReupload} 
          reuploadingType={reuploadingType} 
        />
      </Motion.div>

      {effectiveStatus === 'verified' && stats ? (
        <>
          {/* Top Row: KPIs - What is happening? */}
          <Motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BriefcaseBusiness} color="blue" label="Active vacancies" value={stats.kpis.active_vacancies} subtitle="Currently published" hint="Number of jobs currently visible to job seekers." />
            <StatCard icon={UsersRound} color="amber" label="New applicants" value={stats.kpis.pending_applications} subtitle="Requires your review" hint="Number of applications that have not been processed." />
            <StatCard icon={Calendar} color="blue" label="Upcoming interviews" value={stats.kpis.upcoming_interviews} subtitle="Scheduled meetings" hint="Interviews scheduled for the future." />
            <StatCard icon={Award} color="green" label="Hired through i-PESO" value={stats.kpis.total_hired} subtitle="All time" hint="Total candidates successfully hired through the platform." />
          </Motion.div>

          {/* Middle Row: Trends & Alerts */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Trends - What changed? */}
            <Motion.div variants={itemVariants} className="xl:col-span-2">
              <Card className="h-full border-slate-200/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Applications" subtitle="Applications received over the last 14 days." />
                <div className="mt-6 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Motion.div>

            {/* Alerts/Tasks - What needs attention? */}
            <Motion.div variants={itemVariants} className="flex h-full flex-col">
              <Card className="flex h-full flex-col border-slate-200/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Needs your attention" subtitle="What to do next." />
                <div className="mt-4 flex-1 space-y-4">
                  {stats.kpis.pending_applications > 0 ? (
                    <div className="relative rounded-2xl border border-amber-200 bg-[#fffbeb] p-5">
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="rounded-xl bg-white p-2.5 text-amber-600 shadow-sm ring-1 ring-amber-100"><UsersRound className="h-6 w-6" /></div>
                        <div>
                          <p className="text-base font-bold text-amber-950">{stats.kpis.pending_applications} new applications</p>
                          <p className="mt-0.5 text-sm font-medium text-amber-700/80">Review pending candidates in your ATS.</p>
                        </div>
                      </div>
                      <Button to="/employer/ats" variant="secondary" className="relative z-10 mt-4 w-full">Review applicants</Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm ring-1 ring-emerald-100"><CheckCircle2 className="h-6 w-6" /></div>
                        <div>
                          <p className="text-base font-bold text-emerald-950">Inbox Zero</p>
                          <p className="mt-0.5 text-sm font-medium text-emerald-700/80">All applications have been reviewed.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {stats.kpis.upcoming_interviews > 0 && (
                    <div className="relative rounded-2xl border border-[#c4d9f7] bg-[#e8f0fc] p-5">
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="rounded-xl bg-white p-2.5 text-brand-navy shadow-sm ring-1 ring-[#c4d9f7]"><Calendar className="h-6 w-6" /></div>
                        <div>
                          <p className="text-base font-bold text-brand-navy">{stats.kpis.upcoming_interviews} upcoming interviews</p>
                          <p className="mt-0.5 text-sm font-medium text-brand-navy/80">Prepare for your scheduled interviews.</p>
                        </div>
                      </div>
                      <Button to="/employer/calendar" variant="secondary" className="relative z-10 mt-4 w-full">View Calendar</Button>
                    </div>
                  )}
                </div>
              </Card>
            </Motion.div>
          </div>

          {/* Bottom Row: Activity & Quick Actions */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Activity - What happened recently? */}
            <Motion.div variants={itemVariants} className="xl:col-span-2">
              <Card className="h-full border-slate-200/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Recent applicants" subtitle="The latest applications across your open vacancies." />
                <div className="mt-4">
                  {stats.recent_activity?.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {stats.recent_activity.map((activity) => (
                         <div key={activity.apply_id} className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-slate-50">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f0fc] text-brand-navy">
                              <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{activity.seeker_name}</p>
                              <p className="mt-0.5 text-sm text-slate-500">Applied for <span className="font-medium text-slate-700">{activity.job_title}</span></p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <span className="text-xs font-medium text-slate-400">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                            <Badge variant={activity.status}>{activity.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/50">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="mt-4 text-base font-bold text-slate-800">No recent activity</p>
                      <p className="mt-1 text-sm text-slate-500">When candidates apply, they will show up here.</p>
                    </div>
                  )}
                </div>
              </Card>
            </Motion.div>

            {/* Quick Actions - What can I do now? */}
            <Motion.div variants={itemVariants}>
              <Card className="h-full border-slate-200/60 bg-slate-50/50 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Quick Actions" subtitle="Common tasks to manage your hiring." />
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-1">
                  <Link to="/employer/post-job" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-md">
                    <div className="rounded-xl bg-sky-50 p-3 text-sky-600 transition-colors group-hover:bg-sky-100"><Plus className="h-6 w-6" /></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-sky-700">Post a Job</p>
                      <p className="hidden text-xs text-slate-500 sm:block">Create a new vacancy</p>
                    </div>
                  </Link>
                  <Link to="/employer/ats" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 transition-colors group-hover:bg-emerald-100"><UsersRound className="h-6 w-6" /></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">Applicant Tracking</p>
                      <p className="hidden text-xs text-slate-500 sm:block">Manage candidates</p>
                    </div>
                  </Link>
                  <Link to="/employer/job-fairs" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-md">
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600 transition-colors group-hover:bg-amber-100"><Building2 className="h-6 w-6" /></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700">Job Fairs</p>
                      <p className="hidden text-xs text-slate-500 sm:block">Join upcoming events</p>
                    </div>
                  </Link>
                  <Link to="/employer/profile" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-violet-300 hover:shadow-md">
                    <div className="rounded-xl bg-violet-50 p-3 text-brand-navy transition-colors group-hover:bg-violet-100"><BriefcaseBusiness className="h-6 w-6" /></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-violet-700">Company Profile</p>
                      <p className="hidden text-xs text-slate-500 sm:block">Edit your public profile</p>
                    </div>
                  </Link>
                </div>
              </Card>
            </Motion.div>
          </div>
        </>
      ) : !documents.length && (
        <Motion.div variants={itemVariants}>
          <Card>
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span className="rounded-xl bg-amber-50 p-4 text-amber-700"><Clock3 className="h-7 w-7" /></span>
              <div className="flex-1"><h2 className="text-lg font-bold text-slate-950">Hiring tools are temporarily locked</h2><p className="mt-1 text-sm leading-6 text-slate-600">PESO must approve the employer accreditation and required documents before vacancies can be published.</p></div>
            </div>
          </Card>
        </Motion.div>
      )}
    </Motion.div>
  )
}
