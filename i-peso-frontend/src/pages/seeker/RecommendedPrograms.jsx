import { ArrowLeft, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgramCard from '@/components/government-programs/ProgramCard'
import governmentProgramService from '@/services/governmentProgramService'

export default function RecommendedPrograms() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { governmentProgramService.recommendedPrograms().then(setPrograms).catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to build recommendations.')).finally(() => setLoading(false)) }, [])

  return <div className="space-y-6"><button onClick={() => navigate('/seeker/upskill-hub')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Upskill Hub</button><header className="border-b border-slate-200 pb-6"><div className="flex items-center gap-2 text-amber-600"><Sparkles className="h-5 w-5" /><p className="text-xs font-black uppercase">Smart Matching Connection</p></div><h1 className="mt-2 text-3xl font-black text-slate-950">Recommended Upskill Programs</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Recommendations prioritize skills missing from matching vacancies, then your preferred occupations and skill demand submitted by verified employers.</p></header>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}{loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Analyzing skill gaps and programs...</div> : programs.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center"><Sparkles className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-black text-slate-800">No targeted recommendations yet</h2><p className="mt-1 text-sm text-slate-500">Complete your preferred occupations and skills, then check again as new training opens.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <ProgramCard key={program.program_id} program={program} to={`/seeker/upskill-hub/${program.program_id}`} />)}</div>}</div>
}
