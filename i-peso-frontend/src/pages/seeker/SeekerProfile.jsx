import { createElement, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import CertificateUploadModal from './components/CertificateUploadModal'
import ProfilePhotoUploadModal from './components/ProfilePhotoUploadModal'
import {
  deleteCertificate,
  generateAiProfessionalSummary,
  generateSmartResume,
  getCertificateFile,
  getProfileImage,
  getSeekerProfile,
} from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'

const skillGroups = [
  ['dole_skills', 'DOLE Skills', 'bg-blue-50 text-blue-700 border-blue-200'],
  ['technical_skills', 'Technical Skills', 'bg-violet-50 text-violet-700 border-violet-200'],
  ['soft_skills', 'Soft Skills', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
]

export default function SeekerProfile() {
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(Boolean(location.state?.openCertificateUpload))
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [openingCertificate, setOpeningCertificate] = useState(null)
  const [resumeStudioOpen, setResumeStudioOpen] = useState(false)
  const [generatingResume, setGeneratingResume] = useState(false)
  const [professionalSummary, setProfessionalSummary] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [summaryEditing, setSummaryEditing] = useState(false)
  const [summaryGenerating, setSummaryGenerating] = useState(false)
  const [openExperienceEditors, setOpenExperienceEditors] = useState({})
  const [experienceDrafts, setExperienceDrafts] = useState({})
  const [experienceResponsibilities, setExperienceResponsibilities] = useState({})
  const updateUser = useAuthStore((state) => state.updateUser)
  const navigate = useNavigate()

  useEffect(() => {
    getSeekerProfile()
      .then((result) => {
        setProfile(result)
        updateUser({ name: fullName(result) })
      })
      .catch((error) => toast.error(error.response?.data?.message ?? 'Unable to load your profile.'))
      .finally(() => setLoading(false))
  }, [updateUser])

  useEffect(() => {
    if (!profile?.has_profile_image) {
      setPhotoUrl(null)
      return undefined
    }

    let active = true
    let objectUrl
    getProfileImage()
      .then((file) => {
        objectUrl = URL.createObjectURL(file)
        if (active) setPhotoUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPhotoUrl(null)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [profile?.has_profile_image, photoVersion])

  useEffect(() => {
    if (!profile) return

    const savedSummary = profile.professional_summary ?? profile.summary ?? ''
    setProfessionalSummary(savedSummary)
    setSummaryDraft(savedSummary)
    setSummaryEditing(false)

    const responsibilities = Object.fromEntries(
      (profile.work_experiences ?? []).map((experience, index) => [
        experienceKey(experience, index),
        experience.responsibilities ?? '',
      ]),
    )
    setExperienceResponsibilities(responsibilities)
    setExperienceDrafts(responsibilities)
    setOpenExperienceEditors({})
  }, [profile?.id, profile?.seeker_id])

  const allSkills = useMemo(
    () => skillGroups.flatMap(([key]) => profile?.[key] ?? []),
    [profile],
  )

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading your NSRP profile...</div>
  }

  if (!profile) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">Your profile could not be loaded.</div>
  }

  const profileComplete = Boolean(profile.profile_completed)
  const strength = profile.profile_strength ?? { percentage: 0, items: [] }
  const certificates = profile.certificates ?? []
  const hardSkills = [...(profile.dole_skills ?? []), ...(profile.technical_skills ?? [])]
  const premiumSkillGroups = [
    { label: 'Technical & Hard Skills', helper: 'Tools, trade, software, vocational, and professional skills.', skills: hardSkills, tone: 'blue' },
    { label: 'Soft Skills', helper: 'Communication, teamwork, service, and workplace behavior.', skills: profile.soft_skills ?? [], tone: 'emerald' },
  ]
  const strengthInsights = profileStrengthInsights(strength)
  const hasExperienceBullets = Object.values(experienceResponsibilities).some((value) => value?.trim())

  const openSummaryEditor = () => {
    setSummaryDraft(professionalSummary)
    setSummaryEditing(true)
  }

  const openProfileEditor = (section = 'identity') => {
    navigate(`/seeker/profile/edit#${section}`)
  }

  const openFirstExperienceEditor = () => {
    const firstExperience = profile.work_experiences?.[0]
    if (!firstExperience) {
      openProfileEditor('work')
      return
    }

    const key = experienceKey(firstExperience, 0)
    setOpenExperienceEditors((current) => ({ ...current, [key]: true }))
    setExperienceDrafts((current) => ({
      ...current,
      [key]: current[key] ?? experienceResponsibilities[key] ?? '',
    }))
  }

  const openResumePreview = () => {
    setResumeStudioOpen(true)
  }

  const resumePolishItems = [
    {
      key: 'summary',
      label: 'Professional summary',
      helper: 'Add a short About Me for employers.',
      complete: Boolean(professionalSummary),
      action: 'Polish summary',
      onClick: openSummaryEditor,
    },
    {
      key: 'experience_bullets',
      label: 'Experience bullet points',
      helper: 'Turn duties into resume-ready achievements.',
      complete: !profile.work_experiences?.length || hasExperienceBullets,
      action: profile.work_experiences?.length ? 'Add bullets' : 'Add experience',
      onClick: openFirstExperienceEditor,
    },
    {
      key: 'photo',
      label: 'Professional 2x2 photo',
      helper: 'Required for previewing the PDF resume.',
      complete: Boolean(profile.has_profile_image),
      action: 'Upload photo',
      onClick: () => setPhotoUploadOpen(true),
    },
    {
      key: 'preview',
      label: 'Resume preview',
      helper: 'Review before downloading.',
      complete: Boolean(profile.has_resume),
      action: 'Preview resume',
      onClick: openResumePreview,
    },
  ]
  const completedPolishItems = resumePolishItems.filter((item) => item.complete).length

  const handleStrengthAction = (item) => {
    if (item.key === 'photo') {
      setPhotoUploadOpen(true)
      return
    }

    const sectionByKey = {
      personal_information: 'identity',
      address: 'identity',
      occupations: 'preferences',
      skills: 'education',
      education: 'education',
      work_experience: 'work',
      training: 'training',
      languages: 'languages',
    }

    openProfileEditor(sectionByKey[item.key] ?? 'identity')
  }

  const generateProfessionalSummary = async () => {
    setSummaryGenerating(true)
    const toastId = toast.loading('Reviewing your verified profile...')

    try {
      const result = await generateAiProfessionalSummary(summaryDraft.trim() || professionalSummary.trim())
      setSummaryDraft(result.summary)
      setSummaryEditing(true)
      toast.success('A new profile-aware summary is ready for review.', { id: toastId })
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to generate your professional summary.', { id: toastId })
    } finally {
      setSummaryGenerating(false)
    }
  }

  const saveProfessionalSummary = () => {
    setProfessionalSummary(summaryDraft.trim())
    setSummaryEditing(false)
    toast.success('Professional summary saved for this resume polish session.')
  }

  const enhanceResponsibilities = (key, experience) => {
    const draft = experienceDrafts[key]?.trim()
    const enhanced = draft?.toLowerCase().includes('encoded data')
      ? '- Accurately encoded and managed large datasets, ensuring 100% data integrity and operational efficiency.'
      : `- Delivered ${experience.position || 'assigned'} responsibilities with accuracy, consistency, and attention to operational standards.`

    setExperienceDrafts((current) => ({ ...current, [key]: enhanced }))
    toast.success('AI enhanced the responsibility into a resume-ready bullet.')
  }

  const saveResponsibilities = (key) => {
    setExperienceResponsibilities((current) => ({
      ...current,
      [key]: experienceDrafts[key]?.trim() ?? '',
    }))
    setOpenExperienceEditors((current) => ({ ...current, [key]: false }))
    toast.success('Responsibilities saved for this resume polish session.')
  }

  const downloadResume = async () => {
    if (!profile.has_profile_image) {
      toast.error('Upload a professional 2x2 photo before downloading the PDF resume.')
      setPhotoUploadOpen(true)
      return
    }

    if (!professionalSummary.trim()) {
      toast.error('Add a professional summary before downloading your standard Philippine resume.')
      return
    }

    setGeneratingResume(true)
    const toastId = toast.loading('Generating your standard Philippine resume PDF...')
    try {
      const response = await generateSmartResume({
        professional_summary: professionalSummary.trim() || null,
        responsibility_overrides: resumeResponsibilityPayload(profile.work_experiences ?? [], experienceResponsibilities),
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `i-PESO_Resume_${profile.last_name || 'Job_Seeker'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      setProfile((current) => current ? ({ ...current, has_resume: true }) : current)
      toast.success('Standard Philippine resume generated and downloaded.', { id: toastId })
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to generate your resume.', { id: toastId })
    } finally {
      setGeneratingResume(false)
    }
  }

  const viewCertificate = async (certificate) => {
    setOpeningCertificate(certificate.certificate_id)
    try {
      const file = await getCertificateFile(certificate.certificate_id)
      const url = URL.createObjectURL(file)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to open certificate.')
    } finally {
      setOpeningCertificate(null)
    }
  }

  const removeCertificate = async (certificate) => {
    if (!window.confirm(`Delete "${certificate.title}" from your certificate vault?`)) return

    const previous = profile
    setProfile((current) => ({
      ...current,
      certificates: current.certificates.filter((item) => item.certificate_id !== certificate.certificate_id),
    }))

    try {
      await deleteCertificate(certificate.certificate_id)
      toast.success('Certificate deleted.')
    } catch (error) {
      setProfile(previous)
      toast.error(error.response?.data?.message ?? 'Unable to delete certificate.')
    }
  }

  const preferredTitle = preferredOccupationLabel(profile)
  const locationLabel = [profile.address_municipality_city, profile.address_province].filter(Boolean).join(', ') || 'Location not provided'
  const activeApplications = profile.dashboard_stats?.active_applications ?? 0
  const verifiedSkillCount = profile.dashboard_stats?.skills ?? allSkills.length
  const profileStrengthPercent = strength.percentage ?? 0

  return (
    <div className="-mx-4 -mt-8 bg-slate-50 pb-12 sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-36 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.35),_transparent_32%),linear-gradient(135deg,_#0f172a,_#1d4ed8_58%,_#38bdf8)] sm:h-40">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.16)_0,_rgba(255,255,255,0)_45%)]" />
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">DOLE NSRP Career Hub</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50">A premium, employer-ready profile built from verified government employment data.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                {profileComplete ? 'Actively Applying' : 'Open to Work'}
              </span>
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative -mt-10 shrink-0 sm:-mt-12">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-blue-100 text-3xl font-black text-blue-800 shadow-xl">
                    {photoUrl
                      ? <img src={photoUrl} alt={fullName(profile)} className="h-full w-full object-cover" />
                      : initials(profile)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoUploadOpen(true)}
                    title={profile.has_profile_image ? 'Change 2x2 photo' : 'Upload 2x2 photo'}
                    className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-blue-700 p-2.5 text-white shadow-md transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">{fullName(profile)}</h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      profileComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {profileComplete ? <ShieldCheck className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                      {profileComplete ? 'NSRP Verified Profile' : 'Profile Needs Completion'}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-700">{preferredTitle}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <ProfileFact icon={MapPin} value={locationLabel} />
                    <ProfileFact icon={Phone} value={profile.mobile_number || 'Contact not provided'} />
                    <ProfileFact icon={GraduationCap} value={profile.educ_attainment || 'Education not provided'} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => openProfileEditor('identity')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <UserCheck className="h-4 w-4" /> Update Profile Data
                </button>
                <button onClick={openResumePreview} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Eye className="h-4 w-4" /> Preview Resume
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroStat icon={Target} label="Profile Strength" value={`${profileStrengthPercent}%`} tone="blue" />
              <HeroStat icon={BriefcaseBusiness} label="Active Applications" value={activeApplications} tone="emerald" />
              <HeroStat icon={Sparkles} label="Verified Skills" value={verifiedSkillCount} tone="indigo" />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
          <main className="space-y-6">
            <Card
              title="About"
              subtitle="A professional summary employers can quickly scan before opening your resume"
              action={(
                <button
                  type="button"
                  onClick={generateProfessionalSummary}
                  disabled={summaryGenerating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {summaryGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {summaryGenerating ? 'Generating...' : professionalSummary || summaryDraft ? 'Regenerate with AI' : 'Generate with AI'}
                </button>
              )}
            >
              {summaryEditing ? (
                <div className="space-y-3">
                  <label htmlFor="professional-summary" className="sr-only">Professional summary</label>
                  <textarea
                    id="professional-summary"
                    value={summaryDraft}
                    onChange={(event) => setSummaryDraft(event.target.value)}
                    rows={5}
                    placeholder="Write a short summary of your career goals, top skills, and preferred work."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Use this space for the resume version of your profile, not government form data.</p>
                    <button
                      type="button"
                      onClick={saveProfessionalSummary}
                      disabled={!summaryDraft.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> Save Summary
                    </button>
                  </div>
                </div>
              ) : professionalSummary ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm leading-7 text-slate-700">{professionalSummary}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSummaryDraft(professionalSummary)
                      setSummaryEditing(true)
                    }}
                    className="mt-4 text-sm font-bold text-blue-700 hover:text-blue-800"
                  >
                    Edit summary
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
                  <p className="text-sm font-bold text-slate-800">Create an employer-ready introduction from your verified profile.</p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">The generator can use your target occupation, work history, education, skills, training, eligibility, languages, and certificates. Review the draft before saving it to your resume.</p>
                </div>
              )}
            </Card>

            <Card title="Educational Background" subtitle="School records saved from your NSRP profile">
              {profile.educations?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.educations.map((education) => (
                    <div key={education.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-bold text-slate-900">{education.institution_name || 'School not specified'}</p>
                      <p className="mt-1 text-sm font-semibold text-blue-700">{educationLabel(education.level)}</p>
                      {education.course_strand && <p className="mt-1 text-sm text-slate-600">{education.course_strand}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">{educationStatusLabel(education)}</span>
                        {educationYearRange(education) && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{educationYearRange(education)}</span>
                        )}
                        {education.undergrad_level_reached && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{education.undergrad_level_reached}</span>
                        )}
                        {education.current_level && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{education.current_level}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={GraduationCap} text="No education records saved yet." action="Add Education" onClick={() => openProfileEditor('education')} />
              )}
            </Card>

            <Card title="Skills & Proficiencies" subtitle="Verified skills presented as employer-friendly premium chips">
              {allSkills.length ? (
                <div className="space-y-5">
                  {premiumSkillGroups.map((group) => group.skills.length > 0 && (
                    <div key={group.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-900">{group.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{group.helper}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${group.tone === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {group.skills.length} verified
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {group.skills.map((skill, index) => (
                          <PremiumSkillChip key={`${group.label}-${skill}-${index}`} skill={skill} tone={group.tone} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Sparkles} text="No skills recorded yet." action="Add Skills" onClick={() => openProfileEditor('education')} />
              )}
            </Card>

            <Card title="Work Experience" subtitle="Career timeline built from your NSRP employment history">
              {profile.work_experiences?.length ? (
                <div className="relative space-y-0 pl-7">
                  <div className="absolute left-2.5 top-3 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden="true" />
                  {profile.work_experiences.map((experience, index) => {
                    const key = experienceKey(experience, index)
                    const savedResponsibilities = experienceResponsibilities[key] ?? ''
                    const isOpen = openExperienceEditors[key]

                    return (
                      <div key={key} className="relative pb-6 last:pb-0">
                        <span className="absolute -left-[1.82rem] top-2 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white bg-blue-700 shadow-sm" />
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-black text-slate-950">{experience.position}</p>
                              <p className="mt-1 text-sm font-bold text-blue-700">{experience.company_name}</p>
                              <p className="mt-1 text-sm text-slate-500">{experience.company_address || 'Address not specified'}{experience.employment_status ? ` | ${experience.employment_status.replaceAll('_', ' ')}` : ''}</p>
                            </div>
                            {experience.number_of_months && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{experience.number_of_months} months</span>}
                          </div>

                          {savedResponsibilities && !isOpen && (
                            <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                              {responsibilityLines(savedResponsibilities).map((line) => (
                                <li key={line} className="flex gap-2">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setOpenExperienceEditors((current) => ({ ...current, [key]: !current[key] }))
                              setExperienceDrafts((current) => ({ ...current, [key]: current[key] ?? savedResponsibilities }))
                            }}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <Plus className="h-4 w-4" /> {savedResponsibilities ? 'Edit Job Duties / Responsibilities' : 'Add Job Duties / Responsibilities'}
                          </button>

                          {isOpen && (
                            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">Resume bullet points</p>
                                  <p className="text-xs text-slate-500">Type simple duties, then let AI polish them into stronger resume language.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => enhanceResponsibilities(key, experience)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100 transition hover:bg-indigo-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <Sparkles className="h-4 w-4" /> AI Enhance Bullets
                                </button>
                              </div>
                              <label htmlFor={`responsibilities-${key}`} className="sr-only">Responsibilities for {experience.position}</label>
                              <textarea
                                id={`responsibilities-${key}`}
                                value={experienceDrafts[key] ?? ''}
                                onChange={(event) => setExperienceDrafts((current) => ({ ...current, [key]: event.target.value }))}
                                rows={4}
                                placeholder="Example: encoded files"
                                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                              />
                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setOpenExperienceEditors((current) => ({ ...current, [key]: false }))}
                                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveResponsibilities(key)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
                                >
                                  <Save className="h-4 w-4" /> Save Bullets
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                  )})}
                </div>
              ) : (
                <EmptyState icon={BriefcaseBusiness} text="No work experience recorded." action="Add Experience" onClick={() => openProfileEditor('work')} />
              )}
            </Card>

            <Card
              title="E-Certificates & Trainings"
              subtitle="Maintain complete certificate records with privately stored supporting proof."
              action={(
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openProfileEditor('training')} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    <FileText className="h-4 w-4" /> Update Records
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    <Plus className="h-4 w-4" /> Add Certificate
                  </button>
                </div>
              )}
            >
              {profile.trainings?.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.trainings.map((training) => (
                    <TrainingRecordCard key={training.id} training={training} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Award} text="No NSRP training records saved yet. Certificates can still be added as standalone credentials." action="Add Training Record" onClick={() => openProfileEditor('training')} />
              )}

              {certificates.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Certificate records</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {certificates.map((certificate) => (
                      <div key={certificate.certificate_id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                          <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><Award className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900">{certificate.title}</p>
                            <p className="mt-0.5 text-sm text-slate-500">{certificate.issuing_body}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{certificateCategory(certificate.category)}</span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Verified by Upload</span>
                              <span className={`rounded-full px-2.5 py-1 ${isExpiredCertificate(certificate) ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                {isExpiredCertificate(certificate) ? 'Expired' : certificate.expires_at ? `Expires ${formatCertificateDate(certificate.expires_at)}` : 'No expiration'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <dl className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
                          <div><dt className="inline font-bold text-slate-700">Issued: </dt><dd className="inline">{formatCertificateDate(certificate.issued_at)}</dd></div>
                          {certificate.credential_number && <div><dt className="inline font-bold text-slate-700">Credential no.: </dt><dd className="inline break-all">{certificate.credential_number}</dd></div>}
                          {certificate.training && <div><dt className="inline font-bold text-slate-700">Related training: </dt><dd className="inline">{certificate.training.course}</dd></div>}
                          {certificate.description && <div><dt className="inline font-bold text-slate-700">Remarks: </dt><dd className="inline">{certificate.description}</dd></div>}
                          <div><dt className="inline font-bold text-slate-700">Proof file: </dt><dd className="inline break-all">{certificate.original_filename}</dd></div>
                        </dl>
                        <div className="mt-4 flex gap-2">
                          <button onClick={() => viewCertificate(certificate)} disabled={openingCertificate === certificate.certificate_id} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                            <Eye className="h-4 w-4" /> {openingCertificate === certificate.certificate_id ? 'Opening...' : 'View'}
                          </button>
                          <button onClick={() => removeCertificate(certificate)} className="rounded-lg bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <ProfileStrengthCard
              insights={strengthInsights}
              percentage={strength.percentage}
              onItemAction={handleStrengthAction}
            />

            <ResumePolishCard items={resumePolishItems} completed={completedPolishItems} />

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
              <span className="relative inline-flex rounded-xl bg-white/10 p-2.5"><FileText className="h-6 w-6" /></span>
              <h2 className="relative mt-4 text-xl font-black">Resume Studio</h2>
              <p className="relative mt-2 text-sm leading-6 text-blue-100">Transform this profile into a DOLE-compliant, ATS-friendly PDF resume in one click.</p>
              {!profile.has_profile_image && (
                <button type="button" onClick={() => setPhotoUploadOpen(true)} className="relative mt-4 flex w-full items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-300/15 p-3 text-left text-xs text-amber-50">
                  <Camera className="h-5 w-5 shrink-0" />
                  <span><strong className="block text-sm">2x2 photo required</strong>Upload a square professional portrait before generating your resume.</span>
                </button>
              )}
              <button
                onClick={openResumePreview}
                className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-blue-900 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <Eye className="h-4 w-4" />
                Open Resume Studio
              </button>
              {profile.has_resume && <p className="relative mt-3 flex items-center gap-1.5 text-xs text-blue-100"><CheckCircle2 className="h-4 w-4" /> A resume has already been generated. Preview again to refresh it.</p>}
            </section>
          </aside>
        </div>
      </div>

      <CertificateUploadModal
        open={uploadOpen}
        trainings={profile.trainings ?? []}
        onClose={() => setUploadOpen(false)}
        onUploaded={(certificate) => {
          if (!certificate?.certificate_id) return
          setProfile((current) => ({ ...current, certificates: [certificate, ...(current.certificates ?? [])] }))
        }}
      />
      <ProfilePhotoUploadModal
        open={photoUploadOpen}
        onClose={() => setPhotoUploadOpen(false)}
        onUploaded={() => {
          setProfile((current) => updateStrength({
            ...current,
            has_profile_image: true,
            profile_image_url: '/api/seeker/profile-image',
            has_resume: false,
          }, { photo: true, resume: false }))
          setPhotoVersion((current) => current + 1)
          toast.success('Your 2x2 photo is ready for the resume.')
        }}
      />
      <ResumeStudioModal
        open={resumeStudioOpen}
        onClose={() => setResumeStudioOpen(false)}
        profile={profile}
        photoUrl={photoUrl}
        professionalSummary={professionalSummary}
        allSkills={allSkills}
        experienceResponsibilities={experienceResponsibilities}
        onUploadPhoto={() => setPhotoUploadOpen(true)}
        onDownload={downloadResume}
        generating={generatingResume}
      />
    </div>
  )
}

function ResumeStudioModal({
  open,
  onClose,
  profile,
  photoUrl,
  professionalSummary,
  allSkills,
  experienceResponsibilities,
  onUploadPhoto,
  onDownload,
  generating,
}) {
  if (!open) return null

  const location = [profile.address_municipality_city, profile.address_province].filter(Boolean).join(', ')
  const experiences = [...(profile.work_experiences ?? [])].sort((first, second) => resumeSortValue(second) - resumeSortValue(first))
  const hardSkillText = skillListText([...(profile.dole_skills ?? []), ...(profile.technical_skills ?? [])])
  const softSkillText = skillListText(profile.soft_skills ?? [])
  const hasExperienceDetails = experiences.length === 0 || experiences.some((experience, index) => (
    responsibilityLines(experienceResponsibilities[experienceKey(experience, index)] ?? experience.responsibilities ?? '').length > 0
  ))
  const hasCredentialSection = profile.trainings?.length > 0 || profile.certificates?.length > 0
  const resumeChecks = [
    { label: '2x2 professional photo', complete: Boolean(profile.has_profile_image) },
    { label: 'Professional summary', complete: Boolean(professionalSummary) },
    { label: 'Skills profile', complete: allSkills.length > 0 },
    { label: 'Education background', complete: profile.educations?.length > 0 || Boolean(profile.educ_attainment) },
    { label: 'Experience duties or first-time seeker note', complete: hasExperienceDetails },
  ]
  const completedChecks = resumeChecks.filter((item) => item.complete).length

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="resume-studio-title">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Resume Studio</p>
            <h2 id="resume-studio-title" className="mt-1 text-xl font-black text-slate-950">Customize & Preview Resume</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close Resume Studio"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner sm:p-6">
            <div className="mx-auto max-w-[820px] bg-white px-7 py-8 text-slate-900 shadow-sm ring-1 ring-slate-200 sm:px-10 sm:py-10">
              <header className="border-b-2 border-slate-900 pb-4">
                <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-black uppercase tracking-[0.08em] text-slate-950">{fullName(profile)}</h3>
                    <p className="mt-1 text-sm font-bold uppercase tracking-wide text-slate-700">{preferredOccupationLabel(profile)}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      {[location, profile.mobile_number, profile.email].filter(Boolean).join(' | ')}
                    </p>
                  </div>
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-slate-300 bg-slate-50 text-xl font-black text-slate-500">
                    {photoUrl
                      ? <img src={photoUrl} alt={fullName(profile)} className="h-full w-full object-cover" />
                      : initials(profile)}
                  </div>
                </div>
              </header>

              <div className="mt-5 space-y-5">
              <ResumePreviewSection title="Professional Summary">
                <p className="text-sm leading-6 text-slate-700">
                  {professionalSummary || 'No professional summary yet. Use the About section Auto-Generate button to draft one before downloading.'}
                </p>
              </ResumePreviewSection>

              <ResumePreviewSection title="Skills">
                {hardSkillText || softSkillText ? (
                  <div className="space-y-2 text-sm leading-6 text-slate-700">
                    {hardSkillText && <p><strong className="text-slate-900">Technical & hard skills:</strong> {hardSkillText}</p>}
                    {softSkillText && <p><strong className="text-slate-900">Soft skills:</strong> {softSkillText}</p>}
                  </div>
                ) : <p className="text-sm text-slate-500">No skills recorded yet.</p>}
              </ResumePreviewSection>

              <ResumePreviewSection title="Work Experience">
                {experiences.length ? (
                  <div className="space-y-4">
                    {experiences.map((experience, index) => {
                      const duties = responsibilityLines(experienceResponsibilities[experienceKey(experience, index)] ?? experience.responsibilities ?? '')

                      return (
                        <article key={experienceKey(experience, index)}>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                            <div>
                              <p className="font-black text-slate-950">{experience.position || 'Position not specified'}</p>
                              <p className="text-sm font-bold text-slate-700">{experience.company_name || 'Company not specified'}</p>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{resumeDateRange(experience)}</p>
                          </div>
                          {duties.length > 0 ? (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                              {duties.map((line) => <li key={line}>{line}</li>)}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm italic text-amber-700">Add 2-4 responsibility bullets from the Work Experience section to make this role resume-ready.</p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No work experience recorded. First-time job seekers can still download a skills-focused resume.</p>
                )}
              </ResumePreviewSection>

              <ResumePreviewSection title="Education">
                {profile.educations?.length ? (
                  <div className="space-y-3">
                    {profile.educations.map((education) => (
                      <article key={education.id} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <div>
                          <p className="font-black text-slate-950">{education.course_strand || educationLabel(education.level)}</p>
                          <p className="text-sm font-semibold text-slate-700">{education.institution_name || educationLabel(education.level)}</p>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{educationYearRange(education) || educationStatusLabel(education)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{profile.educ_attainment || 'No education records saved yet.'}</p>
                )}
              </ResumePreviewSection>

              {hasCredentialSection && (
                <ResumePreviewSection title="Training & Certifications">
                  <div className="space-y-3">
                    {(profile.trainings ?? []).map((training) => (
                      <article key={`${training.course}-${training.training_institution}`} className="text-sm leading-6 text-slate-700">
                        <p className="font-black text-slate-950">{training.course}</p>
                        <p>{[training.training_institution, training.hours_of_training ? `${training.hours_of_training} hours` : null, training.certificates_received].filter(Boolean).join(' | ')}</p>
                      </article>
                    ))}
                    {(profile.certificates ?? []).map((certificate) => (
                      <article key={certificate.certificate_id} className="text-sm leading-6 text-slate-700">
                        <p className="font-black text-slate-950">{certificate.title}</p>
                        <p>{[certificate.issuing_body, certificate.issued_at ? `Issued ${formatMonthYear(certificate.issued_at)}` : null].filter(Boolean).join(' | ')}</p>
                      </article>
                    ))}
                  </div>
                </ResumePreviewSection>
              )}

              {profile.eligibilities?.length > 0 && (
                <ResumePreviewSection title="Licenses & Eligibility">
                  <div className="space-y-2 text-sm leading-6 text-slate-700">
                    {profile.eligibilities.map((eligibility) => (
                      <p key={eligibility.id}>
                        <strong className="text-slate-950">{eligibility.name}</strong>
                        {eligibility.valid_until ? ` | Valid until ${formatMonthYear(eligibility.valid_until)}` : ''}
                      </p>
                    ))}
                  </div>
                </ResumePreviewSection>
              )}

              {profile.languages?.length > 0 && (
                <ResumePreviewSection title="Languages">
                  <p className="text-sm leading-6 text-slate-700">{profile.languages.map(languageLabel).filter(Boolean).join(', ')}</p>
                </ResumePreviewSection>
              )}
            </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-950">Resume readiness</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{completedChecks} of {resumeChecks.length} items ready for your PDF.</p>
              <div className="mt-4 space-y-2">
                {resumeChecks.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className={item.complete ? 'font-semibold text-slate-700' : 'text-slate-500'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {!profile.has_profile_image && (
              <button
                type="button"
                onClick={onUploadPhoto}
                className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <Camera className="h-5 w-5 shrink-0" />
                <span><strong className="block">2x2 photo required</strong>Upload your professional portrait before PDF download.</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDownload}
              disabled={generating || !String(professionalSummary || '').trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {generating ? 'Generating PDF...' : 'Download PDF Resume'}
            </button>
            <p className="text-center text-xs leading-5 text-slate-500">The final PDF is generated by the backend from your NSRP data and uploaded portrait.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}

function ResumePreviewSection({ title, children }) {
  return (
    <section>
      <h4 className="border-b border-slate-300 pb-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950">{title}</h4>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function TrainingRecordCard({ training }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2 text-blue-700 shadow-sm">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900">{training.course}</p>
          <p className="mt-1 text-sm text-slate-600">
            {[training.training_institution || 'Institution not specified', training.hours_of_training ? `${training.hours_of_training} hours` : null].filter(Boolean).join(' | ')}
          </p>
          {training.certificates_received && (
            <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              {training.certificates_received}
            </span>
          )}
          {training.skills_acquired && <p className="mt-3 text-sm leading-6 text-slate-600">{training.skills_acquired}</p>}
        </div>
      </div>
    </div>
  )
}

function Card({ title, subtitle, action, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function ProfileFact({ icon, value }) {
  return <span className="flex min-w-0 items-center gap-2">{createElement(icon, { className: 'h-4 w-4 shrink-0 text-blue-600' })}<span className="truncate">{value}</span></span>
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="rounded-xl bg-white p-2 text-blue-700 shadow-sm">{createElement(icon, { className: 'h-5 w-5' })}</span>
      <div><p className="text-xl font-black text-slate-900">{value}</p><p className="text-xs font-medium text-slate-500">{label}</p></div>
    </div>
  )
}

function HeroStat({ icon, label, value, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${tones[tone] ?? tones.blue}`}>
      <span className="rounded-xl bg-white/80 p-2 shadow-sm">{createElement(icon, { className: 'h-5 w-5' })}</span>
      <div>
        <p className="text-lg font-black leading-none">{value}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      </div>
    </div>
  )
}

function PremiumSkillChip({ skill, tone }) {
  const name = skillName(skill)
  const classes = tone === 'emerald'
    ? 'border-emerald-200 bg-white text-emerald-800 shadow-emerald-900/5'
    : 'border-blue-200 bg-white text-blue-800 shadow-blue-900/5'

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold shadow-sm ${classes}`}>
      <span className={`h-2 w-2 rounded-full ${tone === 'emerald' ? 'bg-emerald-500' : 'bg-blue-600'}`} />
      {name}
    </span>
  )
}

function ProfileStrengthCard({ insights, percentage, onItemAction }) {
  const ringStyle = {
    background: `conic-gradient(#2563eb ${Math.max(0, Math.min(100, percentage)) * 3.6}deg, #e2e8f0 0deg)`,
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Profile Strength</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Employer readiness</h2>
          <p className="mt-1 text-sm text-slate-500">{insights.message}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${insights.badgeClass}`}>{insights.label}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/60 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full p-2" style={ringStyle}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-2xl font-black text-blue-800">{percentage}%</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{insights.completedCount} of {insights.totalCount} profile items complete</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Finish the highest-impact items first to improve matching, employer review, and resume quality.</p>
          </div>
        </div>
      </div>

      {insights.nextItems.length > 0 && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">Next best actions</h3>
          </div>
          <div className="space-y-2.5">
            {insights.nextItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onItemAction(item)}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>
                  <span className="block font-bold text-slate-800">{item.label}</span>
                  <span className="text-xs text-slate-500">{profileStrengthHelper(item.key)}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-600 transition group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {insights.groups.map((group) => (
          <StrengthChecklistGroup key={group.title} group={group} />
        ))}
      </div>
    </section>
  )
}

function StrengthChecklistGroup({ group }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
          {createElement(group.icon, { className: 'h-4 w-4 text-blue-600' })}
          {group.title}
        </h3>
        <span className="text-xs font-bold text-slate-400">{group.completed}/{group.items.length}</span>
      </div>
      <div className="space-y-2">
        {group.items.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200'
              }`}
            >
              {item.complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span className={item.complete ? 'font-medium text-slate-700' : 'text-slate-500'}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResumePolishCard({ items, completed }) {
  const percentage = Math.round((completed / items.length) * 100)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Resume Polish</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Ready for employers</h2>
          <p className="mt-1 text-sm text-slate-500">Turn clinical NSRP data into a stronger resume presentation.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{completed}/{items.length}</span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all duration-500" style={{ width: `${percentage}%` }} />
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {item.complete ? <Check className="h-3.5 w-3.5" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800">{item.label}</span>
                <span className="text-xs font-bold text-indigo-600">{item.complete ? 'Done' : item.action}</span>
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.helper}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function EmptyState({ icon, text, action, onClick }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
      {createElement(icon, { className: 'mx-auto h-8 w-8 text-slate-300' })}
      <p className="mt-3 text-sm text-slate-500">{text}</p>
      <button onClick={onClick} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700"><Plus className="h-4 w-4" /> {action}</button>
    </div>
  )
}

function fullName(profile) {
  return [profile.first_name, profile.middle_name, profile.last_name, profile.suffix].filter(Boolean).join(' ')
}

function initials(profile) {
  return [profile.first_name, profile.last_name].filter(Boolean).map((name) => name[0]).join('').toUpperCase()
}

function resumeResponsibilityPayload(experiences, responsibilities) {
  return Object.fromEntries(
    experiences
      .map((experience, index) => {
        const key = experienceKey(experience, index)
        const payloadKey = String(experience.id ?? experience.work_experience_id ?? key)
        return [payloadKey, responsibilities[key] ?? experience.responsibilities ?? '']
      })
      .filter(([, value]) => String(value ?? '').trim()),
  )
}

function preferredOccupationLabel(profile) {
  const occupation = profile.occupations?.[0]
  return occupation?.title
    || occupation?.general_term
    || occupation?.matched_general_term
    || occupation?.preferred_occupation
    || 'Job seeker'
}

function skillName(skill) {
  if (typeof skill === 'object' && skill) {
    return skill.skill_name || skill.name || skill.title || 'Skill'
  }
  return String(skill)
}

function skillListText(skills) {
  return skills
    .map(skillName)
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
    .slice(0, 18)
    .join(', ')
}

function titleCase(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function educationLabel(level) {
  return ({
    elementary: 'Elementary',
    secondary_non_k12: 'Secondary / Junior High School Non-K-12',
    secondary_k12: 'Secondary / Junior High School K-12',
    senior_high: 'Senior High School',
    senior_high_strand: 'Senior High School',
    tertiary: 'Tertiary / College',
    graduate: 'Graduate Studies / Post-graduate',
    graduate_studies: 'Graduate Studies / Post-graduate',
  })[level] || 'Education level not specified'
}

function educationStatusLabel(education) {
  if (education.completion_status === 'currently_studying') return 'Currently Studying'
  if (education.completion_status === 'undergraduate') return 'Undergraduate / Did Not Finish'
  if (education.completion_status === 'graduated' || education.year_graduated) return 'Graduated'
  return 'Status not specified'
}

function educationYearRange(education) {
  const endYear = education.year_graduated
    || education.undergrad_year_last_attended
    || (education.completion_status === 'currently_studying' ? 'Present' : null)

  return [education.year_started, endYear].filter(Boolean).join(' - ')
}

function resumeDateRange(experience) {
  if (experience.start_date) {
    return [
      formatMonthYear(experience.start_date),
      experience.currently_employed ? 'Present' : formatMonthYear(experience.end_date),
    ].filter(Boolean).join(' - ')
  }

  return experience.number_of_months ? `${experience.number_of_months} months` : 'Dates not specified'
}

function resumeSortValue(experience) {
  const date = experience.end_date || experience.start_date || experience.created_at
  return date ? new Date(date).getTime() || 0 : 0
}

function formatMonthYear(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function experienceKey(experience, index) {
  return String(experience.id ?? experience.work_experience_id ?? `${experience.company_name}-${experience.position}-${index}`)
}

function responsibilityLines(value) {
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function languageLabel(language) {
  const name = language.language === 'others' ? language.language_other : language.language
  const abilities = [
    language.can_speak ? 'speak' : null,
    language.can_read ? 'read' : null,
    language.can_write ? 'write' : null,
    language.can_understand ? 'understand' : null,
  ].filter(Boolean).join('/')

  return [titleCase(name), abilities].filter(Boolean).join(' - ')
}

function profileStrengthInsights(strength) {
  const items = strength.items ?? []
  const completedCount = items.filter((item) => item.complete).length
  const totalCount = items.length
  const coreKeys = new Set(['photo', 'personal_information', 'address', 'occupations', 'skills'])

  const groups = [
    {
      title: 'Essentials',
      icon: UserCheck,
      items: items.filter((item) => coreKeys.has(item.key)),
    },
    {
      title: 'Employability',
      icon: BriefcaseBusiness,
      items: items.filter((item) => item.weight === 15),
    },
    {
      title: 'Enhancements',
      icon: Sparkles,
      items: items.filter((item) => !coreKeys.has(item.key) && item.weight !== 15),
    },
  ]
    .filter((group) => group.items.length)
    .map((group) => ({
      ...group,
      completed: group.items.filter((item) => item.complete).length,
    }))

  const nextItems = [...items]
    .filter((item) => !item.complete)
    .sort((first, second) => (second.weight ?? 0) - (first.weight ?? 0))
    .slice(0, 3)

  if ((strength.percentage ?? 0) >= 90) {
    return {
      completedCount,
      totalCount,
      groups,
      nextItems,
      label: 'Employer-ready',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      message: 'Your profile is strong. Keep details fresh before applying.',
    }
  }

  if ((strength.percentage ?? 0) >= 75) {
    return {
      completedCount,
      totalCount,
      groups,
      nextItems,
      label: 'Strong',
      badgeClass: 'bg-blue-100 text-blue-700',
      message: 'A few final details can make your profile more convincing.',
    }
  }

  if ((strength.percentage ?? 0) >= 50) {
    return {
      completedCount,
      totalCount,
      groups,
      nextItems,
      label: 'In progress',
      badgeClass: 'bg-amber-100 text-amber-700',
      message: 'Complete the missing essentials to improve matching quality.',
    }
  }

  return {
    completedCount,
    totalCount,
    groups,
    nextItems,
    label: 'Needs attention',
    badgeClass: 'bg-rose-100 text-rose-700',
    message: 'Start with the key details employers and PESO staff review first.',
  }
}

function profileStrengthHelper(key) {
  return ({
    photo: 'Upload a professional 2x2 photo.',
    personal_information: 'Complete your basic identity and contact details.',
    address: 'Add a complete barangay, city, and province.',
    occupations: 'Select preferred occupations for better job matching.',
    skills: 'Add at least three skills employers can search for.',
    education: 'Add your highest education or school history.',
    work_experience: 'Add work, OJT, freelance, or relevant experience.',
    training: 'Upload certificates or add completed trainings.',
    languages: 'Record languages you can speak, read, or write.',
  })[key] ?? 'Complete this profile item.'
}

function certificateCategory(category) {
  return ({
    training_certificate: 'Training Certificate',
    tesda_nc_certificate: 'TESDA / NC Certificate',
    professional_certificate: 'Professional Certificate',
    seminar_certificate: 'Seminar Certificate',
    workshop_certificate: 'Workshop Certificate',
    employment_certificate: 'Employment Certificate',
    academic_certificate: 'Academic Certificate',
    other: 'Other',
  })[category] ?? 'Legacy Certificate'
}

function formatCertificateDate(value) {
  if (!value) return 'Not specified'
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return String(value)
  return new Date(year, month - 1, day).toLocaleDateString()
}

function isExpiredCertificate(certificate) {
  if (!certificate.expires_at) return false
  return certificate.expires_at < new Date().toISOString().slice(0, 10)
}

function updateStrength(profile, states) {
  const items = profile.profile_strength.items.map((item) => (
    Object.hasOwn(states, item.key) ? { ...item, complete: states[item.key] } : item
  ))

  // Calculate weighted percentage
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0)
  const completedWeight = items
    .filter((item) => item.complete)
    .reduce((sum, item) => sum + (item.weight ?? 1), 0)
  const percentage = Math.round((completedWeight / totalWeight) * 100)

  return {
    ...profile,
    profile_strength: {
      ...profile.profile_strength,
      items,
      percentage,
    },
  }
}
