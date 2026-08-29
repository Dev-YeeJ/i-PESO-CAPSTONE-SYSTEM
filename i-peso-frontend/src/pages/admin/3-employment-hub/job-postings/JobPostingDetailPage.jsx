import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminService } from '@/services/adminService'
import { 
  ArrowLeft, 
  MapPin, 
  BriefcaseBusiness, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  Building2 
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
    <dt className="text-sm font-medium text-slate-500 sm:w-48 sm:shrink-0">{label}</dt>
    <dd className="text-sm font-semibold text-slate-900">{value || <span className="font-normal text-slate-400">Not provided</span>}</dd>
  </div>
)

export default function JobPostingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vacancy, setVacancy] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchVacancy = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminService.getJobVacancyDetail(id)
      setVacancy(response)
    } catch (error) {
      console.error('Failed to fetch vacancy detail', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchVacancy()
  }, [fetchVacancy])

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center text-slate-500">Loading...</div>
  }

  if (!vacancy) {
    return <div className="flex min-h-[400px] items-center justify-center text-slate-500">Job vacancy not found.</div>
  }

  const companyName = vacancy.employer?.company_name || 'N/A'
  
  return (
    <div className="portal-page">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/job-postings')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Job Postings
        </Button>
      </div>

      <PageHeader
        title={vacancy.job_title}
        subtitle={`${companyName} • ${vacancy.general_term || vacancy.occupation?.title || 'Uncategorized'}`}
        eyebrow="Employment Hub"
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card padding="sm">
            <h2 className="text-lg font-black text-slate-950 mb-4">Job Description</h2>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {vacancy.job_description}
            </div>
          </Card>
          
          <Card padding="sm">
            <h2 className="text-lg font-black text-slate-950 mb-4">Candidate Requirements</h2>
            <div className="divide-y divide-slate-100">
              <InfoRow label="Education" value={vacancy.minimum_education} />
              <InfoRow label="Experience" value={vacancy.experience_level} />
              <InfoRow 
                label="Required Skills" 
                value={
                  vacancy.skill_requirements?.length > 0 
                  ? <div className="flex flex-wrap gap-2">{vacancy.skill_requirements.map(sr => <Badge key={sr.id} variant="secondary">{sr.skill?.name || 'Skill'}</Badge>)}</div>
                  : (vacancy.required_skills?.length > 0 
                      ? <div className="flex flex-wrap gap-2">{vacancy.required_skills.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>
                      : null)
                } 
              />
              <InfoRow label="Soft Skills" value={vacancy.soft_skills?.join(', ')} />
              <InfoRow label="Required Certifications" value={vacancy.required_certifications?.join(', ')} />
            </div>
          </Card>

          <Card padding="sm">
            <h2 className="text-lg font-black text-slate-950 mb-4">Inclusivity & Preferences</h2>
            <div className="divide-y divide-slate-100">
              <InfoRow label="Preferred Gender" value={vacancy.preferred_gender} />
              <InfoRow label="Age Requirement" value={vacancy.minimum_age || vacancy.maximum_age ? `${vacancy.minimum_age || 'Any'} to ${vacancy.maximum_age || 'Any'} years old` : 'Any'} />
              <InfoRow label="Open to PWDs" value={vacancy.open_to_pwds ? 'Yes' : 'No'} />
              <InfoRow label="Open to Senior Citizens" value={vacancy.open_to_senior_citizens ? 'Yes' : 'No'} />
              <InfoRow label="SPES/TUPAD Eligible" value={vacancy.spes_tupad_eligible ? 'Yes' : 'No'} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="sm">
            <h2 className="text-lg font-black text-slate-950 mb-4">Job Overview</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500">Employer</p>
                  <p className="text-sm font-bold text-slate-900">{companyName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500">Location</p>
                  <p className="text-sm font-bold text-slate-900">{vacancy.location || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500">Employment Type</p>
                  <p className="text-sm font-bold text-slate-900">{vacancy.employment_type} • {vacancy.work_setup}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500">Salary</p>
                  <p className="text-sm font-bold text-slate-900">
                    {vacancy.hide_salary ? 'Hidden' : (vacancy.salary_min && vacancy.salary_max ? `₱${Number(vacancy.salary_min).toLocaleString()} - ₱${Number(vacancy.salary_max).toLocaleString()} / ${vacancy.salary_type}` : 'Not provided')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500">Application Deadline</p>
                  <p className="text-sm font-bold text-slate-900">{vacancy.application_deadline ? new Date(vacancy.application_deadline).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500">Status</p>
                  <p className="text-sm font-bold capitalize text-slate-900">{vacancy.status}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card padding="sm">
             <h2 className="text-lg font-black text-slate-950 mb-4">Benefits</h2>
             {vacancy.benefits && vacancy.benefits.length > 0 ? (
               <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                 {vacancy.benefits.map((b, i) => <li key={i}>{b}</li>)}
               </ul>
             ) : (
               <p className="text-sm text-slate-500">No specific benefits listed.</p>
             )}
          </Card>
        </div>
      </div>
    </div>
  )
}
