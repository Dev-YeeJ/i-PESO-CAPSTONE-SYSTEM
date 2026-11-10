import { createElement, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MotionConfig, motion as Motion } from 'framer-motion'
import {
  BadgeCheck, Building2, Camera, Clock3, Factory, FileCheck2, Hash, Mail, MapPin, Pencil,
  Phone, ShieldAlert, Smartphone, UserRound, UsersRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as employerService from '@/services/employerService'
import * as employerProfileService from '@/services/employerProfileService'
import { useAuthStore } from '@/stores/authStore'
import { Button, ErrorState, LoadingSkeleton } from '@/components/ui'
import CompanyLogo from '@/components/employers/CompanyLogo'
import { industriesOf, profileStrength, sizeLabel } from '@/utils/employerProfileStrength'
import EditProfileSheet from './profile/EditProfileSheet'
import LogoUploadDialog from './profile/LogoUploadDialog'
import ProfileStrengthCard from './profile/ProfileStrengthCard'
import ReputationSnapshotCard from './profile/ReputationSnapshotCard'

const PROFILE_KEY = ['employer', 'profile']

const humanize = (value) => (value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : null)

const card = 'rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.18)]'

const rise = {
  hidden: { opacity: 0, y: 14 },
  show: (index = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * index, duration: 0.45, ease: [0.16, 1, 0.3, 1] } }),
}

const VERIFICATION = {
  verified: { label: 'Verified by PESO', icon: BadgeCheck, className: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30' },
  pending: { label: 'Verification in progress', icon: Clock3, className: 'bg-amber-400/15 text-amber-100 ring-amber-300/30' },
  rejected: { label: 'Needs attention', icon: ShieldAlert, className: 'bg-red-400/15 text-red-100 ring-red-300/30' },
}

function SectionCard({ index, title, icon, action, children, className = '' }) {
  return (
    <Motion.section variants={rise} initial="hidden" animate="show" custom={index} aria-label={title} className={`${card} p-6 sm:p-7 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-black text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy">{createElement(icon, { className: 'h-[18px] w-[18px]', 'aria-hidden': true })}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Motion.section>
  )
}

function Fact({ icon, label, children, muted }) {
  return (
    <div className="flex gap-3">
      {createElement(icon, { className: 'mt-0.5 h-4 w-4 shrink-0 text-slate-400', 'aria-hidden': true })}
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-slate-500">{label}</dt>
        <dd className={`mt-0.5 break-words text-sm font-semibold ${muted ? 'font-normal italic text-slate-400' : 'text-slate-900'}`}>{children}</dd>
      </div>
    </div>
  )
}

/** The employer's own company profile: what job seekers see, how complete it is, and where to edit it. */
export default function EmployerProfile() {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state) => state.updateUser)
  const [editing, setEditing] = useState(null) // null | { focus?: string }
  const [logoOpen, setLogoOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: PROFILE_KEY, queryFn: employerService.getProfile })
  const profile = data?.employer

  const patchProfile = (changes) => queryClient.setQueryData(PROFILE_KEY, (current) => current && { ...current, employer: { ...current.employer, ...changes } })

  const saveProfile = async (values) => {
    const result = await employerProfileService.updateProfile(values)
    patchProfile({ ...values, ...(result?.employer ?? {}), company_logo_url: result?.employer?.company_logo_url ?? profile?.company_logo_url })
    toast.success('Profile saved.')
  }

  const uploadLogo = async (file, onProgress) => {
    const result = await employerProfileService.uploadCompanyLogo(file, onProgress)
    patchProfile({ company_logo_url: result.company_logo_url })
    const user = useAuthStore.getState().user
    updateUser({ employer: { ...(user?.employer ?? {}), logo_url: result.company_logo_url } })
    toast.success('Logo updated.')
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-56 animate-pulse rounded-[28px] bg-slate-200" />
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    )
  }

  if (error || !profile) {
    return <div className="mx-auto max-w-3xl"><ErrorState description="Your company profile could not be loaded." onRetry={refetch} error={error} /></div>
  }

  const strength = profileStrength(profile)
  const industries = industriesOf(profile)
  const status = VERIFICATION[profile.verification_status] ?? VERIFICATION.pending
  const description = profile.company_description?.trim() ?? ''
  const longDescription = description.length > 420
  const documents = data?.documents ?? []
  const required = data?.required_documents ?? []
  const approvedRequired = required.filter((type) => documents.some((doc) => doc.document_type === type && doc.verification_status === 'approved')).length
  const address = [profile.house_unit_street, profile.barangay, profile.city_municipality, profile.province].filter(Boolean)

  const fix = (item) => (item.action === 'logo' ? setLogoOpen(true) : setEditing({ focus: item.field }))

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl pb-16">
        {/* Hero */}
        <Motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative isolate overflow-hidden rounded-[28px] bg-brand-navy text-white shadow-[0_24px_60px_-28px_rgba(18,53,99,0.75)]"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-gold/25 blur-3xl" />
            <div className="absolute -bottom-40 left-1/3 h-80 w-[28rem] rounded-full bg-sky-400/15 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />
          </div>

          <div className="flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-end">
            <button
              type="button"
              onClick={() => setLogoOpen(true)}
              className="group relative shrink-0 self-start rounded-3xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/60"
              aria-label={profile.company_logo_url ? 'Change company logo' : 'Add a company logo'}
            >
              <CompanyLogo src={profile.company_logo_url} name={profile.company_name} size="xl" className="rounded-3xl border-white/90 shadow-xl sm:h-32 sm:w-32" />
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-3xl bg-slate-950/60 text-xs font-bold opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="h-6 w-6" aria-hidden /> {profile.company_logo_url ? 'Change' : 'Add logo'}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${status.className}`}>
                <status.icon className="h-3.5 w-3.5" aria-hidden /> {status.label}
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">{profile.company_name}</h1>
              <p className="mt-1.5 text-sm text-blue-100/80 sm:text-base">
                {profile.trade_name ? `Doing business as ${profile.trade_name}` : humanize(profile.company_type)}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-blue-50" aria-label="Company highlights">
                {industries.slice(0, 3).map((industry) => (
                  <li key={industry} className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">{industry}</li>
                ))}
                {industries.length > 3 && <li className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">+{industries.length - 3} more</li>}
                {profile.company_size && <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><UsersRound className="h-3.5 w-3.5" aria-hidden />{sizeLabel(profile.company_size)}</li>}
                {profile.city_municipality && <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><MapPin className="h-3.5 w-3.5" aria-hidden />{profile.city_municipality}</li>}
              </ul>
            </div>

            <Button icon={Pencil} size="lg" onClick={() => setEditing({})} className="shrink-0 self-start md:self-end">Edit profile</Button>
          </div>
        </Motion.header>

        {profile.verification_status === 'rejected' && profile.rejection_reason && (
          <div role="alert" className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p><strong className="font-bold">PESO needs you to fix something: </strong>{profile.rejection_reason} <Link to="/employer/dashboard" className="font-bold underline underline-offset-2">Go to your documents</Link></p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SectionCard index={1} title="About the company" icon={Building2}
              action={description && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ focus: 'company_description' })}>Edit</Button>}
            >
              {description ? (
                <>
                  <p className={`whitespace-pre-line text-[15px] leading-7 text-slate-700 ${longDescription && !expanded ? 'line-clamp-6' : ''}`}>{description}</p>
                  {longDescription && (
                    <button type="button" onClick={() => setExpanded((open) => !open)} className="mt-2 text-sm font-bold text-brand-navy hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-focus">
                      {expanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
                  <p className="text-sm font-bold text-slate-800">Tell job seekers who you are</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">A short description of what you do and what it's like to work with you helps applicants decide to apply.</p>
                  <Button size="sm" className="mt-4" icon={Pencil} onClick={() => setEditing({ focus: 'company_description' })}>Write a description</Button>
                </div>
              )}
            </SectionCard>

            <SectionCard index={2} title="Company details" icon={Factory}>
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Fact icon={Building2} label="Registered name">{profile.company_name}</Fact>
                <Fact icon={Building2} label="Trade name" muted={!profile.trade_name}>{profile.trade_name || 'None'}</Fact>
                <Fact icon={FileCheck2} label="Business type">{humanize(profile.company_type) ?? 'Not set'}</Fact>
                <Fact icon={Hash} label="TIN" muted={!profile.tin}>{profile.tin || 'Not set'}</Fact>
                <Fact icon={Factory} label="Industry" muted={!industries.length}>{industries.length ? industries.join(', ') : 'Not set'}</Fact>
                <Fact icon={UsersRound} label="Company size" muted={!profile.company_size}>{sizeLabel(profile.company_size) ?? 'Not set'}</Fact>
                <Fact icon={Mail} label="Account email">{profile.email}</Fact>
                <Fact icon={MapPin} label="Business address" muted={!address.length}>{address.length ? address.join(', ') : 'Not set'}</Fact>
              </dl>
              <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                The registered name, business type, TIN and address match your permits. To change them, contact the PESO office so they can re-verify your documents.
              </p>
            </SectionCard>

            <SectionCard index={3} title="Representative" icon={UserRound}
              action={<Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ focus: 'representative_name' })}>Edit</Button>}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-sky-700 text-lg font-black text-white shadow-md" aria-hidden="true">
                  {(profile.representative_name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-slate-900">{profile.representative_name || 'Not set'}</p>
                  <p className="text-sm text-slate-500">{profile.representative_designation || 'Position not set'}</p>
                </div>
                <dl className="grid gap-3 text-sm sm:text-right">
                  <div>
                    <dt className="sr-only">Mobile number</dt>
                    <dd>{profile.mobile_number
                      ? <a href={`tel:${profile.mobile_number}`} className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-brand-navy"><Smartphone className="h-4 w-4 text-slate-400" aria-hidden />{profile.mobile_number}</a>
                      : <span className="italic text-slate-400">No mobile number</span>}</dd>
                  </div>
                  {profile.representative_contact_number && (
                    <div>
                      <dt className="sr-only">Other number</dt>
                      <dd><a href={`tel:${profile.representative_contact_number}`} className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-brand-navy"><Phone className="h-4 w-4 text-slate-400" aria-hidden />{profile.representative_contact_number}</a></dd>
                    </div>
                  )}
                </dl>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-6" aria-label="Profile status">
            <Motion.div variants={rise} initial="hidden" animate="show" custom={1}>
              <ProfileStrengthCard strength={strength} onFix={fix} />
            </Motion.div>

            {profile.verification_status === 'verified' && (
              <Motion.div variants={rise} initial="hidden" animate="show" custom={2}>
                <ReputationSnapshotCard />
              </Motion.div>
            )}

            <Motion.section variants={rise} initial="hidden" animate="show" custom={3} aria-labelledby="verification-card" className={`${card} p-6`}>
              <h2 id="verification-card" className="text-base font-black text-slate-900">Verification</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {profile.verification_status === 'verified'
                  ? `Verified${profile.verified_at ? ` on ${new Date(profile.verified_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}` : ''}. You can post jobs.`
                  : profile.verification_status === 'rejected'
                    ? 'PESO asked for changes to your documents.'
                    : 'PESO is checking your documents.'}
              </p>
              {required.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Required documents approved</span>
                    <span className="tabular-nums">{approvedRequired} of {required.length}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <Motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(approvedRequired / required.length) * 100}%` }} transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                </div>
              )}
              <Link to="/employer/dashboard" className="mt-4 inline-flex text-sm font-bold text-brand-navy hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-focus">
                Manage documents
              </Link>
            </Motion.section>
          </aside>
        </div>

        <EditProfileSheet
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          profile={profile}
          focusField={editing?.focus}
          onSave={saveProfile}
        />
        <LogoUploadDialog
          open={logoOpen}
          onOpenChange={setLogoOpen}
          currentUrl={profile.company_logo_url}
          companyName={profile.company_name}
          onUpload={uploadLogo}
        />
      </div>
    </MotionConfig>
  )
}
