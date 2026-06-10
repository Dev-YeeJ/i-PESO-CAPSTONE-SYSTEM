import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { DownloadNSRPButton } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

const formatValue = (value, fallback = 'Not provided') => {
  if (value === null || value === undefined || value === '') return fallback
  return String(value).replaceAll('_', ' ')
}

const formatDate = (value) => {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const fullName = (seeker) => [
  seeker.first_name,
  seeker.middle_name,
  seeker.last_name,
  seeker.suffix,
].filter(Boolean).join(' ')

export default function JobSeekerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [seeker, setSeeker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSeeker = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setSeeker(await adminService.getSeekerDetail(id))
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load the job seeker profile.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadSeeker()
  }, [loadSeeker])

  const profileScore = useMemo(() => {
    if (!seeker) return 0

    const checks = [
      seeker.mobile_number && seeker.email,
      seeker.date_of_birth && seeker.sex,
      seeker.address_municipality_city && seeker.address_province,
      seeker.employment_status,
      seeker.occupations?.length,
      seeker.educ_attainment || seeker.educations?.length,
      seeker.seeker_skills?.length || seeker.other_skills?.length,
      seeker.profile_completed,
    ]

    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [seeker])

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-brand-navy" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading NSRP case profile...</p>
        </div>
      </div>
    )
  }

  if (!seeker) {
    return (
      <Card className="mx-auto max-w-xl">
        <div className="text-center">
          <p className="font-bold text-red-700">{error || 'Job seeker not found.'}</p>
          <Button className="mt-4" variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/job-seekers')}>
            Back to job seekers
          </Button>
        </div>
      </Card>
    )
  }

  const name = fullName(seeker)
  const location = [
    seeker.address_barangay,
    seeker.address_municipality_city,
    seeker.address_province,
  ].filter(Boolean).join(', ')
  const skills = seeker.seeker_skills ?? []
  const occupations = seeker.occupations ?? []
  const workLocations = seeker.work_locations ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/admin/job-seekers')}>
          Job Seeker Management
        </Button>
        <DownloadNSRPButton seekerId={seeker.seeker_id} seekerName={name} />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadSeeker} className="inline-flex items-center gap-1 font-bold">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      <Card
        hero
        padding="none"
        heroContent={(
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-black text-amber-300">
              {seeker.first_name?.[0]}{seeker.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">DOLE NSRP Case Profile</p>
                <Badge status={seeker.profile_completed ? 'verified' : 'pending'}>
                  {seeker.profile_completed ? 'NSRP Complete' : 'Needs Completion'}
                </Badge>
              </div>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{name}</h1>
              <p className="mt-2 text-sm text-blue-100">
                Job Seeker ID #{seeker.seeker_id} · Registered {formatDate(seeker.created_at)}
              </p>
            </div>
            <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 lg:w-56">
              <div className="flex items-end justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-blue-200">Profile readiness</span>
                <strong className="text-2xl text-white">{profileScore}%</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${profileScore}%` }} />
              </div>
              <p className="mt-2 text-xs text-blue-100">For PESO referral and matching services</p>
            </div>
          </div>
        )}
      >
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <HeroFact icon={Mail} label="Email" value={seeker.email} />
          <HeroFact icon={Phone} label="Mobile" value={seeker.mobile_number} />
          <HeroFact icon={MapPin} label="Location" value={location} />
          <HeroFact icon={BriefcaseBusiness} label="Employment" value={seeker.employment_status} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <main className="space-y-6">
          <Card>
            <CardHeader title="Personal and Contact Information" subtitle="Core information submitted in the NSRP registration." />
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Complete name" value={name} />
              <InfoItem label="Date of birth" value={formatDate(seeker.date_of_birth)} />
              <InfoItem label="Sex" value={seeker.sex} />
              <InfoItem label="Civil status" value={seeker.civil_status} />
              <InfoItem label="Email address" value={seeker.email} />
              <InfoItem label="Mobile number" value={seeker.mobile_number} />
              <InfoItem label="House / Street" value={seeker.address_house_street} />
              <InfoItem label="Barangay" value={seeker.address_barangay} />
              <InfoItem label="City / Municipality" value={seeker.address_municipality_city} />
              <InfoItem label="Province" value={seeker.address_province} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Employment Profile" subtitle="Information PESO staff can use for counseling, matching, and referrals." />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Current employment status" value={seeker.employment_status} />
              <InfoItem label="Employment type" value={seeker.employment_type} />
              <InfoItem label="Work type preference" value={seeker.work_type_preference} />
              <InfoItem label="Preferred work location" value={seeker.preferred_work_location} />
              <InfoItem label="Educational attainment" value={seeker.educ_attainment} />
              <InfoItem label="Unemployment duration" value={seeker.unemployment_months ? `${seeker.unemployment_months} months` : null} />
            </div>

            <SectionDivider />
            <TagSection
              title="Preferred occupations"
              empty="No occupation preferences recorded."
              items={occupations.map((item) => item.occupation_title)}
              tone="navy"
            />
            <div className="mt-5">
              <TagSection
                title="Preferred locations"
                empty="No detailed work locations recorded."
                items={workLocations.map((item) => item.location_name)}
                tone="blue"
              />
            </div>
            <div className="mt-5">
              <TagSection
                title="Skills"
                empty="No structured skills recorded."
                items={[
                  ...skills.map((item) => item.skill_name),
                  ...(Array.isArray(seeker.other_skills) ? seeker.other_skills : []),
                ]}
                tone="amber"
              />
            </div>
          </Card>

          <RecordSection
            icon={GraduationCap}
            title="Education History"
            subtitle="Formal education records included in the NSRP profile."
            records={seeker.educations}
            empty="No education history recorded."
            render={(education) => (
              <TimelineRecord
                key={education.id}
                title={formatValue(education.level)}
                subtitle={formatValue(education.course_strand, 'Course or strand not specified')}
                meta={education.year_graduated ? `Graduated ${education.year_graduated}` : 'Year not specified'}
              />
            )}
          />

          <RecordSection
            icon={BriefcaseBusiness}
            title="Work Experience"
            subtitle="Previous employment that may support job referrals."
            records={seeker.work_experiences}
            empty="No work experience recorded."
            render={(experience) => (
              <TimelineRecord
                key={experience.id}
                title={formatValue(experience.position)}
                subtitle={formatValue(experience.company_name)}
                meta={[
                  experience.number_of_months ? `${experience.number_of_months} months` : null,
                  experience.employment_status ? formatValue(experience.employment_status) : null,
                ].filter(Boolean).join(' · ') || 'Employment details not specified'}
              />
            )}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <RecordSection
              icon={BookOpen}
              title="Trainings"
              records={seeker.trainings}
              empty="No training records."
              render={(training) => (
                <TimelineRecord
                  key={training.id}
                  title={formatValue(training.course)}
                  subtitle={formatValue(training.training_institution, 'Institution not specified')}
                  meta={training.hours_of_training ? `${training.hours_of_training} training hours` : 'Hours not specified'}
                />
              )}
            />
            <RecordSection
              icon={Award}
              title="Licenses and Eligibilities"
              records={seeker.eligibilities}
              empty="No eligibility records."
              render={(eligibility) => (
                <TimelineRecord
                  key={eligibility.id}
                  title={formatValue(eligibility.name)}
                  subtitle={formatValue(eligibility.type)}
                  meta={eligibility.date_taken ? `Taken ${formatDate(eligibility.date_taken)}` : 'Date not specified'}
                />
              )}
            />
          </div>
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="PESO Service Summary" subtitle="Quick indicators for staff assessment." />
            <div className="space-y-3">
              <StatusRow
                icon={seeker.profile_completed ? CheckCircle2 : Clock3}
                label="NSRP registration"
                value={seeker.profile_completed ? 'Complete' : 'Needs completion'}
                complete={seeker.profile_completed}
              />
              <StatusRow icon={Sparkles} label="Skills recorded" value={`${skills.length} skill${skills.length === 1 ? '' : 's'}`} complete={skills.length > 0} />
              <StatusRow icon={BriefcaseBusiness} label="Work experience" value={`${seeker.work_experiences?.length ?? 0} record(s)`} complete={seeker.work_experiences?.length > 0} />
              <StatusRow icon={GraduationCap} label="Education history" value={`${seeker.educations?.length ?? 0} record(s)`} complete={seeker.educations?.length > 0} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Program and Accommodation Notes" subtitle="Use only when relevant to PESO assistance." />
            <div className="space-y-4">
              <InfoItem label="4Ps beneficiary" value={seeker.is_4ps_beneficiary ? 'Yes' : 'No'} />
              <InfoItem label="OFW status" value={seeker.is_ofw ? `Current OFW${seeker.ofw_country ? ` - ${seeker.ofw_country}` : ''}` : 'Not indicated'} />
              <InfoItem label="Former OFW" value={seeker.is_former_ofw ? `Yes${seeker.former_ofw_country ? ` - ${seeker.former_ofw_country}` : ''}` : 'No'} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Disability / accommodation</p>
                {seeker.disabilities?.length ? (
                  <div className="mt-2 space-y-2">
                    {seeker.disabilities.map((item) => (
                      <p key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                        {formatValue(item.disability_type)}
                        {item.disability_specification ? `: ${item.disability_specification}` : ''}
                      </p>
                    ))}
                  </div>
                ) : <p className="mt-1 text-sm font-semibold text-slate-700">None indicated</p>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Languages" />
            {seeker.languages?.length ? (
              <div className="space-y-3">
                {seeker.languages.map((language) => {
                  const capabilities = [
                    language.can_read && 'Read',
                    language.can_write && 'Write',
                    language.can_speak && 'Speak',
                    language.can_understand && 'Understand',
                  ].filter(Boolean)

                  return (
                    <div key={language.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <Languages className="h-4 w-4 text-blue-700" />
                        {language.language_other || formatValue(language.language)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{capabilities.join(', ') || 'Proficiency not specified'}</p>
                    </div>
                  )
                })}
              </div>
            ) : <EmptyText>No language records.</EmptyText>}
          </Card>

          <Card>
            <CardHeader title="Certificate Vault" subtitle="Metadata for files submitted by the job seeker." />
            {seeker.certificates?.length ? (
              <div className="space-y-3">
                {seeker.certificates.map((certificate) => (
                  <div key={certificate.certificate_id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-3">
                      <span className="rounded-lg bg-amber-50 p-2 text-amber-700"><FileText className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{certificate.title}</p>
                        <p className="text-xs text-slate-500">{certificate.issuing_body || 'Issuing body not specified'}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{certificate.original_filename}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyText>No certificate files uploaded.</EmptyText>}
          </Card>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p><strong>Read-only case record.</strong> Job seekers are not approved or rejected here. PESO staff use this page for employment assistance, referrals, and NSRP reporting.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function HeroFact({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 p-4">
      <span className="rounded-xl bg-slate-100 p-2 text-brand-navy">
        {createElement(icon, { className: 'h-4 w-4' })}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold capitalize text-slate-800">{formatValue(value)}</p>
      </div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-slate-800">{formatValue(value)}</p>
    </div>
  )
}

function SectionDivider() {
  return <div className="my-6 border-t border-slate-100" />
}

function TagSection({ title, items, empty, tone }) {
  const colors = {
    navy: 'border-slate-300 bg-slate-100 text-brand-navy',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  }
  const uniqueItems = [...new Set(items.filter(Boolean))]

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      {uniqueItems.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {uniqueItems.map((item) => (
            <span key={item} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${colors[tone]}`}>
              {formatValue(item)}
            </span>
          ))}
        </div>
      ) : <p className="mt-2 text-sm text-slate-500">{empty}</p>}
    </div>
  )
}

function RecordSection({ icon, title, subtitle, records = [], empty, render }) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={(
          <span className="rounded-xl bg-slate-100 p-2 text-brand-navy">
            {createElement(icon, { className: 'h-5 w-5' })}
          </span>
        )}
      />
      {records?.length ? <div className="divide-y divide-slate-100">{records.map(render)}</div> : <EmptyText>{empty}</EmptyText>}
    </Card>
  )
}

function TimelineRecord({ title, subtitle, meta }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <p className="font-bold capitalize text-slate-900">{title}</p>
      <p className="mt-0.5 text-sm capitalize text-slate-600">{subtitle}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs capitalize text-slate-400">
        <CalendarDays className="h-3.5 w-3.5" /> {meta}
      </p>
    </div>
  )
}

function StatusRow({ icon, label, value, complete }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <span className={`rounded-lg p-2 ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {createElement(icon, { className: 'h-4 w-4' })}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function EmptyText({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <UserRound className="mx-auto h-5 w-5 text-slate-400" />
      <p className="mt-2 text-sm text-slate-500">{children}</p>
    </div>
  )
}
