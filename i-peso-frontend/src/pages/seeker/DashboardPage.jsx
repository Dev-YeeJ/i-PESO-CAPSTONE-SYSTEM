import { createElement, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { getSeekerProfile } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

export default function SeekerDashboard() {
  const user = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSeekerProfile()
      .then(setProfile)
      .catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load your employment dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  const skills = useMemo(() => [
    ...(profile?.technical_skills ?? []),
    ...(profile?.dole_skills ?? []),
    ...(profile?.soft_skills ?? []),
  ], [profile])

  if (loading) {
    return <DashboardSkeleton />
  }

  const firstName = profile?.first_name ?? user?.name?.split(' ')[0] ?? 'Job Seeker'
  const strength = profile?.profile_strength ?? { percentage: 0, items: [] }
  const activeApplications = profile?.dashboard_stats?.active_applications ?? 0
  const profileComplete = Boolean(profile?.profile_completed)

  return (
    <div className="portal-page">
      <section className="portal-card-hero relative overflow-hidden rounded-xl border border-blue-900 bg-brand-navy px-6 py-8 text-white shadow-elevated sm:px-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-accent-400/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <Badge variant={profileComplete ? 'verified' : 'pending'} className="border-white/10">
              {profileComplete ? 'NSRP profile complete' : 'NSRP profile incomplete'}
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Keep your employment profile complete so i-PESO can connect your verified skills with suitable opportunities.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/seeker/profile" variant="accent" icon={UserRound}>Improve Profile</Button>
            <Button to="/seeker/profile" variant="outline" icon={FileText} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              Resume Center
            </Button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BriefcaseBusiness} label="Active Applications" value={activeApplications} detail="Currently in progress" tone="brand" />
        <MetricCard icon={Sparkles} label="Profile Skills" value={skills.length} detail="Available for matching" tone="accent" />
        <MetricCard icon={ShieldCheck} label="Profile Status" value={profileComplete ? 'Complete' : 'Incomplete'} detail="DOLE NSRP information" tone="emerald" />
        <MetricCard icon={FileText} label="Smart Resume" value={profile?.has_resume ? 'Ready' : 'Not ready'} detail={profile?.has_profile_image ? 'Generated from NSRP data' : '2x2 photo required'} tone="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Smart Matches"
              subtitle="Job recommendations will appear here when matching vacancies are available."
              action={<Button variant="secondary" size="sm" icon={Search}>Find Jobs</Button>}
            />
            <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-6 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900">Your matching profile is being prepared</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Add complete skills, work experience, training, and target occupations to improve the quality of future matches.
              </p>
              <Button to="/seeker/profile" variant="primary" size="sm" className="mt-5" icon={ArrowRight}>Review Employment Profile</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="My Skills" subtitle="Skills currently available to PESO matching and resume generation." />
            {skills.length ? (
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 18).map((skill) => <Badge key={skill} variant="matched" dot={false}>{skill}</Badge>)}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="No skills recorded" text="Add skills through your NSRP profile to improve job matching." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile Strength" subtitle="Your readiness for matching and applications." />
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black text-brand-950">{strength.percentage}%</span>
              <span className="text-xs font-bold text-slate-500">{strength.items.filter((item) => item.complete).length}/{strength.items.length} complete</span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-800 to-brand-500" style={{ width: `${strength.percentage}%` }} />
            </div>
            <div className="mt-5 space-y-3">
              {strength.items.slice(0, 6).map((item) => (
                <div key={item.key} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={`h-4 w-4 ${item.complete ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span className={item.complete ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Application Status" subtitle="A concise view of your active employment journey." />
            {activeApplications ? (
              <div className="rounded-2xl bg-brand-50 p-5">
                <p className="text-3xl font-black text-brand-950">{activeApplications}</p>
                <p className="mt-1 text-sm text-brand-800">application{activeApplications === 1 ? '' : 's'} currently active</p>
              </div>
            ) : (
              <EmptyState icon={BriefcaseBusiness} title="No active applications" text="Your submitted applications will be tracked here." />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, detail, tone }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    accent: 'bg-accent-50 text-accent-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>{createElement(icon, { className: 'h-5 w-5' })}</span>
      </div>
    </Card>
  )
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      {createElement(icon, { className: 'mx-auto h-7 w-7 text-slate-300' })}
      <p className="mt-3 font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return <div className="portal-page animate-pulse"><div className="h-48 rounded-xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-xl bg-slate-200" />)}</div></div>
}
