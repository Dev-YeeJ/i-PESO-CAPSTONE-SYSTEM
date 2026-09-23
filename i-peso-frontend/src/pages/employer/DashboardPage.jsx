import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BriefcaseBusiness, Building2, CheckCircle2, Clock3, UsersRound, Calendar, Award, Plus, Users, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PendingVerificationBanner from './components/PendingVerificationBanner'
import { AlertBox, Badge, Button, Card, CardHeader, LoadingSkeleton, StatCard } from '@/components/ui'
import LazyImage from '@/components/common/LazyImage'
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
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-slate-100 shadow-xl backdrop-blur-sm">
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
  
  const requiredDocuments = useMemo(() => {
    const base = profile?.required_documents ?? []
    if (base.length === 0) return base
    return [...base, 'government_id']
  }, [profile])

  if (loading) {
    return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-24 sm:px-6 lg:px-8"><LoadingSkeleton variant="card" rows={1} /><div className="grid grid-cols-4 gap-4"><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /></div></div>
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-8 px-4 py-8 pb-24 sm:px-6 lg:px-8"
    >
      {/* Dynamic Welcome Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-navy via-brand-navy/90 to-blue-900 p-8 text-white shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-brand-yellow/20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2 shadow-inner ring-1 ring-white/20 backdrop-blur-md">
            {profile?.employer?.company_logo_url ? (
              <LazyImage src={profile.employer.company_logo_url} alt="Company Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-10 w-10 text-white/80" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {getGreeting()}, {profile?.employer?.company_name ?? 'Employer'}
            </h1>
            <p className="mt-2 text-lg text-blue-100 font-medium">
              Here is what's happening in your workspace today.
            </p>
          </div>
        </div>
      </motion.div>

      {error && <motion.div variants={itemVariants}><AlertBox variant="danger" title="Employer workspace unavailable">{error}</AlertBox></motion.div>}
      {reuploadError && <motion.div variants={itemVariants}><AlertBox variant="danger" title="Document re-upload failed">{reuploadError}</AlertBox></motion.div>}
      {reuploadNotice && <motion.div variants={itemVariants}><AlertBox variant="success" title="Document re-uploaded">{reuploadNotice}</AlertBox></motion.div>}
      
      <motion.div variants={itemVariants}>
        <PendingVerificationBanner 
          status={effectiveStatus} 
          rejectionReason={profile?.employer?.rejection_reason} 
          documents={documents} 
          requiredDocuments={requiredDocuments} 
          onReupload={handleReupload} 
          reuploadingType={reuploadingType} 
        />
      </motion.div>

      {effectiveStatus === 'verified' && stats ? (
        <>
          {/* Top Row: KPIs - What is happening? */}
          <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BriefcaseBusiness} color="blue" label="Active Vacancies" value={stats.kpis.active_vacancies} subtitle="Currently published" hint="Number of jobs currently visible to job seekers." />
            <StatCard icon={UsersRound} color="amber" label="Pending Applicants" value={stats.kpis.pending_applications} subtitle="Requires your review" hint="Number of applications that have not been processed." />
            <StatCard icon={Calendar} color="violet" label="Upcoming Interviews" value={stats.kpis.upcoming_interviews} subtitle="Scheduled meetings" hint="Interviews scheduled for the future." />
            <StatCard icon={Award} color="emerald" label="Total Hired" value={stats.kpis.total_hired} subtitle="Through i-PESO" hint="Total candidates successfully hired through the platform." />
          </motion.div>

          {/* Middle Row: Trends & Alerts */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Trends - What changed? */}
            <motion.div variants={itemVariants} className="xl:col-span-2">
              <Card className="h-full border-slate-200/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Application Trends" subtitle="Volume of applications received over the last 14 days." />
                <div className="mt-6 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* Alerts/Tasks - What needs attention? */}
            <motion.div variants={itemVariants} className="flex h-full flex-col">
              <Card className="flex h-full flex-col border-slate-200/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Attention Required" subtitle="Tasks prioritizing your immediate action." />
                <div className="mt-4 flex-1 space-y-4">
                  {stats.kpis.pending_applications > 0 ? (
                    <div className="group relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 transition-all hover:border-amber-300 hover:shadow-md">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 transition-transform group-hover:scale-150"></div>
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="rounded-xl bg-white p-2.5 text-amber-600 shadow-sm ring-1 ring-amber-100"><UsersRound className="h-6 w-6" /></div>
                        <div>
                          <p className="text-base font-bold text-amber-950">{stats.kpis.pending_applications} New Applications</p>
                          <p className="mt-0.5 text-sm font-medium text-amber-700/80">Review pending candidates in your ATS.</p>
                        </div>
                      </div>
                      <Button to="/employer/ats" variant="secondary" className="relative z-10 mt-4 w-full bg-white text-amber-700 shadow-sm ring-1 ring-amber-200 hover:bg-amber-50 hover:text-amber-800">Go to ATS</Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5">
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
                    <div className="group relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 p-5 transition-all hover:border-violet-300 hover:shadow-md">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-500/10 transition-transform group-hover:scale-150"></div>
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="rounded-xl bg-white p-2.5 text-violet-600 shadow-sm ring-1 ring-violet-100"><Calendar className="h-6 w-6" /></div>
                        <div>
                          <p className="text-base font-bold text-violet-950">{stats.kpis.upcoming_interviews} Upcoming Interviews</p>
                          <p className="mt-0.5 text-sm font-medium text-violet-700/80">Prepare for your scheduled interviews.</p>
                        </div>
                      </div>
                      <Button to="/employer/calendar" variant="secondary" className="relative z-10 mt-4 w-full bg-white text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 hover:text-violet-800">View Calendar</Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Bottom Row: Activity & Quick Actions */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Activity - What happened recently? */}
            <motion.div variants={itemVariants} className="xl:col-span-2">
              <Card className="h-full border-slate-200/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader title="Recent Activity" subtitle="Latest applicant submissions across your active vacancies." />
                <div className="mt-4">
                  {stats.recent_activity?.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {stats.recent_activity.map((activity) => (
                         <div key={activity.apply_id} className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-slate-50">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-blue-100 text-brand-blue ring-1 ring-blue-200/50 transition-transform group-hover:scale-110">
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
            </motion.div>

            {/* Quick Actions - What can I do now? */}
            <motion.div variants={itemVariants}>
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
                    <div className="rounded-xl bg-violet-50 p-3 text-violet-600 transition-colors group-hover:bg-violet-100"><BriefcaseBusiness className="h-6 w-6" /></div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-violet-700">Company Profile</p>
                      <p className="hidden text-xs text-slate-500 sm:block">Edit your public profile</p>
                    </div>
                  </Link>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      ) : !documents.length && (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span className="rounded-xl bg-amber-50 p-4 text-amber-700"><Clock3 className="h-7 w-7" /></span>
              <div className="flex-1"><h2 className="text-lg font-bold text-slate-950">Hiring tools are temporarily locked</h2><p className="mt-1 text-sm leading-6 text-slate-600">PESO must approve the employer accreditation and required documents before vacancies can be published.</p></div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
