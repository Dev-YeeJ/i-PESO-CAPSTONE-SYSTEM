import { createElement, useEffect, useMemo, useState } from 'react'
import {
  Award,
  BriefcaseBusiness,
  Camera,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  GraduationCap,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import CertificateUploadModal from './components/CertificateUploadModal'
import ProfilePhotoUploadModal from './components/ProfilePhotoUploadModal'
import {
  deleteCertificate,
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
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [openingCertificate, setOpeningCertificate] = useState(null)
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

  const generateResume = async () => {
    setGenerating(true)
    const toastId = toast.loading('Building your resume from NSRP data...')
    try {
      const response = await generateSmartResume()
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `i-PESO_Resume_${profile.last_name}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Smart resume generated and downloaded.', { id: toastId })
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Unable to generate your resume.', { id: toastId })
    } finally {
      setGenerating(false)
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

  return (
    <div className="-mx-4 -mt-8 sm:-mx-6">
      <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-4 pb-28 pt-10 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">DOLE NSRP Job Seeker Profile</p>
          <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          <p className="mt-2 max-w-xl text-sm text-blue-100">Your skills, experience, training records, and employment documents in one place.</p>
        </div>
      </section>

      <div className="relative mx-auto -mt-20 max-w-6xl px-4 pb-10 sm:px-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center">
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-800 shadow-lg">
                {photoUrl
                  ? <img src={photoUrl} alt={fullName(profile)} className="h-full w-full object-cover" />
                  : initials(profile)}
              </div>
              <button
                type="button"
                onClick={() => setPhotoUploadOpen(true)}
                title={profile.has_profile_image ? 'Change 2x2 photo' : 'Upload 2x2 photo'}
                className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-blue-700 p-2 text-white shadow-md hover:bg-blue-800"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-950">{fullName(profile)}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  profileComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {profileComplete ? <ShieldCheck className="h-4 w-4" /> : null}
                  {profileComplete ? 'NSRP Profile Complete' : 'Profile Incomplete'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <ProfileFact icon={MapPin} value={[profile.address_municipality_city, profile.address_province].filter(Boolean).join(', ') || 'Location not provided'} />
                <ProfileFact icon={Phone} value={profile.mobile_number || 'Contact not provided'} />
                <ProfileFact icon={GraduationCap} value={profile.educ_attainment || 'Education not provided'} />
                <ProfileFact icon={Award} value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Birth date not provided'} />
              </div>
            </div>
            <button onClick={() => navigate('/seeker/onboarding')} className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Update NSRP Profile
            </button>
          </div>

          <div className="grid border-t border-slate-100 bg-slate-50 sm:grid-cols-3">
            <Stat icon={BriefcaseBusiness} label="Active Applications" value={profile.dashboard_stats?.active_applications ?? 0} />
            <Stat icon={Sparkles} label="Skills" value={profile.dashboard_stats?.skills ?? allSkills.length} />
            <Stat icon={FileText} label="Saved Jobs" value={profile.dashboard_stats?.saved_jobs ?? 0} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
          <main className="space-y-6">
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
                <EmptyState icon={GraduationCap} text="No education records saved yet." action="Add Education" onClick={() => navigate('/seeker/onboarding')} />
              )}
            </Card>

            <Card title="Skills" subtitle="Skills recorded in your DOLE NSRP profile">
              {allSkills.length ? (
                <div className="space-y-4">
                  {skillGroups.map(([key, label, classes]) => profile[key]?.length > 0 && (
                    <div key={key}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {profile[key].map((skill) => (
                          <span key={`${key}-${skill}`} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${classes}`}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Sparkles} text="No skills recorded yet." action="Add Skills" onClick={() => navigate('/seeker/onboarding')} />
              )}
            </Card>

            <Card title="Work Experience" subtitle="Employment history included in your NSRP profile">
              {profile.work_experiences?.length ? (
                <div className="divide-y divide-slate-100">
                  {profile.work_experiences.map((experience) => (
                    <div key={experience.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{experience.position}</p>
                          <p className="text-sm font-medium text-blue-700">{experience.company_name}</p>
                        </div>
                        {experience.number_of_months && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{experience.number_of_months} months</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{experience.company_address || 'Address not specified'}{experience.employment_status ? ` | ${experience.employment_status.replaceAll('_', ' ')}` : ''}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={BriefcaseBusiness} text="No work experience recorded." action="Add Experience" onClick={() => navigate('/seeker/onboarding')} />
              )}
            </Card>

            <Card
              title="E-Certificates & Trainings"
              subtitle="Private copies of TESDA, training, and competency documents"
              action={<button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Upload Certificate</button>}
            >
              {certificates.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {certificates.map((certificate) => (
                    <div key={certificate.certificate_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><Award className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900">{certificate.title}</p>
                          <p className="text-sm text-slate-500">{certificate.issuing_body}</p>
                          <p className="mt-1 text-xs text-slate-400">{certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : certificate.original_filename}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => viewCertificate(certificate)} disabled={openingCertificate === certificate.certificate_id} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                          <Eye className="h-4 w-4" /> {openingCertificate === certificate.certificate_id ? 'Opening...' : 'View'}
                        </button>
                        <button onClick={() => removeCertificate(certificate)} className="rounded-lg bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Award} text="No certificate files uploaded." action="Upload Certificate" onClick={() => setUploadOpen(true)} />
              )}

              {profile.trainings?.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">NSRP Training Records</p>
                  <div className="space-y-3">
                    {profile.trainings.map((training) => (
                      <div key={training.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-semibold text-slate-800">{training.course}</p>
                        <p className="text-sm text-slate-500">{training.training_institution || 'Institution not specified'}{training.hours_of_training ? ` | ${training.hours_of_training} hours` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </main>

          <aside className="space-y-6">
            <Card title="Profile Strength" subtitle="Complete your employment profile to improve opportunities">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-4xl font-black text-blue-800">{strength.percentage}%</span>
                  <p className="mt-1 text-xs text-slate-500">Profile complete</p>
                </div>
                <div className="text-right">
                  {strength.percentage === 100 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                      <Check className="h-3.5 w-3.5" /> Perfect
                    </span>
                  ) : strength.percentage >= 80 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Great
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <Award className="h-3.5 w-3.5" /> Good start
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${strength.percentage}%` }}
                />
              </div>

              <div className="mt-6 space-y-4">
                {/* Core Profile Section */}
                {strength.items.some((item) => item.weight === 10) && (
                  <div>
                    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-600">Core Profile (Foundation)</h3>
                    <div className="space-y-2.5">
                      {strength.items
                        .filter((item) => item.weight === 10)
                        .map((item) => (
                          <div key={item.key} className="flex items-center gap-2.5 text-sm">
                            <span
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                                item.complete ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {item.complete ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <span className={item.complete ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Work Profile Section */}
                {strength.items.some((item) => item.weight === 15) && (
                  <div>
                    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-600">Work Profile (Important)</h3>
                    <div className="space-y-2.5">
                      {strength.items
                        .filter((item) => item.weight === 15)
                        .map((item) => (
                          <div key={item.key} className="flex items-center gap-2.5 text-sm">
                            <span
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                                item.complete ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {item.complete ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <span className={item.complete ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Enhancement Section */}
                {strength.items.some((item) => item.weight < 10 || item.weight === 10) && (
                  <div>
                    <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-600">Enhancements (Optional)</h3>
                    <div className="space-y-2.5">
                      {strength.items
                        .filter((item) => item.weight === 10 && item.key !== 'photo' && item.key !== 'personal_information' && item.key !== 'address' && item.key !== 'occupations' && item.key !== 'skills')
                        .map((item) => (
                          <div key={item.key} className="flex items-center gap-2.5 text-sm">
                            <span
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                                item.complete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {item.complete ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <span className={item.complete ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <section className="portal-card-hero relative overflow-hidden rounded-xl bg-brand-navy p-6 text-white shadow-lg">
              <span className="inline-flex rounded-xl bg-white/10 p-2.5"><FileText className="h-6 w-6" /></span>
              <h2 className="mt-4 text-xl font-bold">Resume Management</h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">Generate a professional, employer-ready resume using your DOLE NSRP information and 2x2 portrait.</p>
              {!profile.has_profile_image && (
                <button type="button" onClick={() => setPhotoUploadOpen(true)} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-300/15 p-3 text-left text-xs text-amber-50">
                  <Camera className="h-5 w-5 shrink-0" />
                  <span><strong className="block text-sm">2x2 photo required</strong>Upload a square professional portrait before generating your resume.</span>
                </button>
              )}
              <button
                onClick={generateResume}
                disabled={generating || !profile.has_profile_image}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-800 shadow-sm disabled:opacity-60"
              >
                {generating ? <Download className="h-4 w-4 animate-bounce" /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating Resume...' : 'Generate Smart Resume'}
              </button>
              {profile.has_resume && <p className="mt-3 flex items-center gap-1.5 text-xs text-blue-100"><CheckCircle2 className="h-4 w-4" /> A resume has already been generated. Generate again to refresh it.</p>}
            </section>
          </aside>
        </div>
      </div>

      <CertificateUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(certificate) => {
          setProfile((current) => ({ ...current, certificates: [certificate, ...(current.certificates ?? [])] }))
          toast.success('Certificate added to your vault.')
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
