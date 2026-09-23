import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEmployerApplicationDetail, getApplicantResume } from '@/services/employerApplicationService'
import { ChevronLeft, Briefcase, FileText, Mail, MapPin, Phone, Sparkles, GraduationCap, Building } from 'lucide-react'
import { Button, LoadingSkeleton } from '@/components/ui'
import ApplicantAvatar from './ApplicantAvatar'
import { TERMINAL_STATUSES } from './atsConstants'
import { formatDate, formatDateTime } from './atsFormatters'
import { toast } from 'sonner'

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value || 'Not specified'}</p>
    </div>
  )
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-800">
      <Icon className="h-4 w-4 text-blue-600" /> {title}
    </h3>
  )
}

export default function EmployerApplicantProfilePage() {
  const { applicationId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const response = await getEmployerApplicationDetail(applicationId)
        setData(response.application)
      } catch (error) {
        console.error(error)
        toast.error('Failed to load application details')
      } finally {
        setLoading(false)
      }
    }
    fetchApplication()
  }, [applicationId])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Application not found</h2>
        <Link to="/employer/ats" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to ATS
        </Link>
      </div>
    )
  }

  const seeker = data.seeker || {}
  const status = data.status
  const skills = seeker.skills || []
  const timeline = data.timeline || []
  const educations = seeker.educations || []
  const workExperiences = seeker.work_experiences || []

  const handleDownloadResume = async () => {
    if (!data?.apply_id) return
    const toastId = toast.loading('Opening resume...')
    try {
      const blob = await getApplicantResume(data.apply_id)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
      toast.dismiss(toastId)
    } catch (error) {
      console.error(error)
      toast.error('Unable to open the resume.', { id: toastId })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Link to="/employer/ats" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to ATS
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-5">
              <ApplicantAvatar applicationId={data?.apply_id} hasPhoto={seeker.has_profile_image} name={seeker.name} size="lg" />
              <div>
                <h1 className="text-2xl font-black text-slate-900">{seeker.name || 'Applicant'}</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Applying for: <span className="font-bold text-blue-700">{data?.job?.job_title}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status === 'hired' ? 'bg-emerald-100 text-emerald-800' : status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {data?.status_label}
                  </span>
                  <span className="text-sm font-semibold text-amber-600">{data?.match_percentage}% Match</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50" 
                onClick={handleDownloadResume}
                disabled={!seeker.has_resume}
                title={seeker.has_resume ? "Download Resume" : "No resume generated"}
              >
                <Briefcase className="mr-2 h-4 w-4" /> View Resume
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div>
              <SectionHeading icon={Briefcase} title="Work Experience" />
              {workExperiences.length > 0 ? (
                <div className="space-y-6">
                  {workExperiences.map((xp, index) => (
                    <div key={index} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                      <div className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
                      <h4 className="text-base font-bold text-slate-900">{xp.position}</h4>
                      <p className="text-sm font-semibold text-slate-700">{xp.company_name}</p>
                      <p className="mb-2 text-xs text-slate-500">
                        {formatDate(xp.start_date)} - {xp.is_current ? 'Present' : formatDate(xp.end_date)}
                      </p>
                      {xp.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{xp.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No work experience provided.
                </div>
              )}
            </div>

            <hr className="border-slate-200" />

            <div>
              <SectionHeading icon={GraduationCap} title="Education" />
              {educations.length > 0 ? (
                <div className="space-y-6">
                  {educations.map((edu, index) => (
                    <div key={index} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                      <div className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
                      <h4 className="text-base font-bold text-slate-900">{edu.course_strand || edu.level}</h4>
                      <p className="text-sm font-semibold text-slate-700">{edu.institution_name}</p>
                      <p className="text-xs text-slate-500">
                        {edu.year_started || 'N/A'} - {edu.completion_status === 'graduated' ? edu.year_graduated : (edu.expected_year_graduated || edu.undergrad_year_last_attended || 'Present')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No education history provided.
                </div>
              )}
            </div>
            
            <hr className="border-slate-200" />

            <div>
              <SectionHeading icon={Building} title="Interview & Outcome" />
              <div className="space-y-3 text-sm text-slate-600">
                {data?.interview ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900 shadow-sm">
                    <p className="text-base font-black">Interview scheduled</p>
                    <p className="mt-1 font-medium">{formatDateTime(data.interview.schedule)}</p>
                    <p className="mt-2 text-blue-800">{data.interview.venue_or_link || 'Venue to follow'}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">No interview scheduled yet.</div>
                )}
                <InfoTile label="Employer remarks" value={data?.employer_remarks} />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-800">Contact & Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" /> {seeker.email || 'Not provided'}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" /> {seeker.mobile_number || 'Not provided'}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 text-slate-400" /> {seeker.address || 'Not provided'}
                </div>
                <div className="pt-2">
                  <InfoTile label="Applied on" value={formatDate(data?.applied_at)} />
                </div>
              </div>
            </div>

            <div>
              <SectionHeading icon={Sparkles} title="Matched Skills" />
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span key={`${skill}-${index}`} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {skill}
                  </span>
                ))}
                {!skills.length && <span className="text-sm text-slate-500">No declared skills yet.</span>}
              </div>
            </div>

            <div>
              <SectionHeading icon={FileText} title="Application Timeline" />
              <div className="space-y-4">
                {timeline.length ? timeline.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="flex gap-3">
                    <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === status ? 'bg-blue-600 ring-4 ring-blue-50' : 'bg-slate-300'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {item.timestamp ? formatDateTime(item.timestamp) : 'Pending'}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No timeline entries yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
