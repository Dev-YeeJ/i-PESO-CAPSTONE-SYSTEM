import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity, BarChart3, BriefcaseBusiness, Building2, CalendarRange, CheckCircle2,
  ChevronRight, CircleAlert, FileChartColumn, FileText, RefreshCw,
  RotateCcw, Sparkles, UserRoundCheck, UsersRound, X,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import toast from 'react-hot-toast'
import { Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'
import { analyticsService } from '@/services/analyticsService'

const COLORS = ['#123b65', '#d89b28', '#0f766e', '#7c3aed', '#2563eb', '#dc2626', '#64748b', '#059669']
const today = new Date()
const initialFilters = {
  date_from: new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10),
  date_to: today.toISOString().slice(0, 10), period: 'monthly', province: '', city: '', barangay: '',
  broad_field: '', occupation: '', skill: '', application_status: '', vacancy_status: '',
  employer_verification_status: '',
}

const reportCatalog = [
  ['job_seeker_summary', 'Job Seeker Summary Report', 'Registrations, profile completeness, participation, and demographics.', 'Date range, location'],
  ['employer_summary', 'Employer Summary Report', 'Employer registrations, verification, vacancies, and hiring activity.', 'Date range, verification'],
  ['vacancy_summary', 'Vacancy Summary Report', 'Vacancy volume, status, categories, employers, and posting trends.', 'Date range, location, category'],
  ['application_status', 'Application Status Report', 'Application submissions and pipeline status distribution.', 'Date range, status'],
  ['hired_applicants', 'Hired Applicants Report', 'Placement trends and companies with the highest hires.', 'Date range, location, category'],
  ['skills_distribution', 'Skills Distribution Report', 'Common seeker skills and skills demanded in vacancies.', 'Date range, skill'],
  ['most_applied_categories', 'Most Applied Job Categories Report', 'Ranked job categories and occupations by applications.', 'Date range, category'],
  ['most_hiring_companies', 'Most Hiring Company Report', 'Companies ranked by vacancy, application, and hire activity.', 'Date range, location'],
  ['location_distribution', 'Barangay / Location Distribution Report', 'Seeker and vacancy distribution across available locations.', 'Date range, province, city, barangay'],
  ['employment_trends', 'Employment Trends Report', 'Hires over time and current employment-status distribution.', 'Date range, period'],
  ['labor_market_analytics', 'Labor Market Analytics Report', 'Complete analytics snapshot including the experimental forecast.', 'All dashboard filters'],
]

export default function LaborAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [options, setOptions] = useState({})
  const [data, setData] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState('')
  const requestSequence = useRef(0)
  const navigate = useNavigate()
  const view = searchParams.get('view') === 'reports' ? 'reports' : 'analytics'
  const selectView = (nextView) => setSearchParams(nextView === 'reports' ? { view: 'reports' } : {}, { replace: true })

  const loadAnalytics = useCallback(async (nextFilters = appliedFilters) => {
    const requestId = ++requestSequence.current
    setLoading(true)
    setError('')
    try {
      const snapshot = await analyticsService.getSnapshot(nextFilters)
      if (requestId === requestSequence.current) setData(snapshot)
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError.response?.data?.message || 'Analytics could not be loaded. Check the selected filters and try again.')
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    Promise.allSettled([analyticsService.getOptions(), adminService.getReports({ per_page: 50 })])
      .then(([optionResult, reportResult]) => {
        if (optionResult.status === 'fulfilled') setOptions(optionResult.value)
        else toast.error('Filter options could not be loaded.')
        if (reportResult.status === 'fulfilled') setReports(reportResult.value.data || [])
        else toast.error('Saved reports could not be loaded.')
      })
      .finally(() => setReportsLoading(false))
    loadAnalytics(initialFilters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters(filters)
    loadAnalytics(filters)
  }

  const resetFilters = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    loadAnalytics(initialFilters)
  }

  const removeFilter = (key) => {
    const nextFilters = { ...appliedFilters, [key]: initialFilters[key] }
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
    loadAnalytics(nextFilters)
  }

  const generateReport = async ([category, title]) => {
    setGenerating(category)
    try {
      const result = await adminService.generateReport({
        title: `${title} - ${new Date().toLocaleDateString('en-PH')}`,
        report_category: category,
        coverage_start: appliedFilters.date_from,
        coverage_end: appliedFilters.date_to,
        ...Object.fromEntries(Object.entries(appliedFilters).filter(([key, value]) => value && !['date_from', 'date_to'].includes(key))),
      })
      setReports((current) => [result.report, ...current])
      toast.success('Report generated from the selected date range.')
      navigate(`/admin/labor-analytics/${result.report.report_id}`)
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Report generation failed.')
    } finally {
      setGenerating('')
    }
  }

  const chips = Object.entries(appliedFilters)
    .filter(([key, value]) => value && !['date_from', 'date_to', 'period'].includes(key))
    .map(([key, value]) => [key, chipLabel(key, value, options)])

  return (
    <div className="portal-page">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Monitor job seeker participation, employer activity, vacancies, applications, and labor market trends."
        eyebrow="System & Reports"
        actions={[{ label: 'Refresh Data', icon: RefreshCw, variant: 'outline', onClick: () => loadAnalytics() }]}
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <ViewButton active={view === 'analytics'} onClick={() => selectView('analytics')} icon={BarChart3}>Dashboard</ViewButton>
        <ViewButton active={view === 'reports'} onClick={() => selectView('reports')} icon={FileText}>Reports</ViewButton>
      </div>

      {view === 'analytics' ? (
        <AnalyticsView
          data={data} loading={loading} error={error} filters={filters} appliedFilters={appliedFilters} setFilters={setFilters}
          options={options} chips={chips} applyFilters={applyFilters} resetFilters={resetFilters} removeFilter={removeFilter}
        />
      ) : (
        <ReportsView reports={reports} loading={reportsLoading} generating={generating} onGenerate={generateReport} navigate={navigate} />
      )}
    </div>
  )
}

function AnalyticsView({ data, loading, error, filters, appliedFilters, setFilters, options, chips, applyFilters, resetFilters, removeFilter }) {
  if (loading && !data) return <AnalyticsSkeleton />
  const summary = data?.summary || {}
  const trends = data?.trends || {}
  const distributions = data?.distributions || {}
  const top = data?.top_lists || {}
  const forecast = data?.forecast || {}

  return (
    <>
      <Card padding="none">
        <form onSubmit={applyFilters} className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="font-bold text-slate-950">Analytics filters</h2><p className="text-sm text-slate-500">All cards, charts, rankings, and generated reports follow the applied range.</p></div>
            <CalendarRange className="h-5 w-5 text-brand-700" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Filter label="Date from"><input type="date" max={filters.date_to || undefined} value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></Filter>
            <Filter label="Date to"><input type="date" min={filters.date_from || undefined} value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></Filter>
            <SelectFilter label="Period" value={filters.period} onChange={(value) => setFilters({ ...filters, period: value })} options={[['monthly', 'Monthly'], ['yearly', 'Yearly']]} />
            <SelectFilter label="Province" value={filters.province} onChange={(value) => setFilters({ ...filters, province: value })} options={toOptions(options.provinces)} />
            <SelectFilter label="City / Municipality" value={filters.city} onChange={(value) => setFilters({ ...filters, city: value })} options={toOptions(options.cities)} />
            <SelectFilter label="Barangay" value={filters.barangay} onChange={(value) => setFilters({ ...filters, barangay: value })} options={toOptions(options.barangays)} />
            <SelectFilter label="Broad field" value={filters.broad_field} onChange={(value) => setFilters({ ...filters, broad_field: value })} options={toOptions(options.broad_fields)} />
            <SelectFilter label="Occupation" value={filters.occupation} onChange={(value) => setFilters({ ...filters, occupation: value })} options={(options.occupations || []).map((item) => [String(item.id), item.title])} />
            <Filter label="Skill"><input placeholder="e.g. Welding" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} /></Filter>
            <SelectFilter label="Application status" value={filters.application_status} onChange={(value) => setFilters({ ...filters, application_status: value })} options={toOptions(options.application_statuses, true)} />
            <SelectFilter label="Vacancy status" value={filters.vacancy_status} onChange={(value) => setFilters({ ...filters, vacancy_status: value })} options={toOptions(options.vacancy_statuses, true)} />
            <SelectFilter label="Employer verification" value={filters.employer_verification_status} onChange={(value) => setFilters({ ...filters, employer_verification_status: value })} options={toOptions(options.employer_verification_statuses, true)} />
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1"><Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Applying…' : 'Apply filters'}</Button><Button type="button" variant="outline" onClick={resetFilters} disabled={loading} aria-label="Reset filters"><RotateCcw className="h-4 w-4" /><span>Reset</span></Button></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Applied analytics filters">
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">{formatDateRange(appliedFilters.date_from, appliedFilters.date_to)}</span>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800">Period: {pretty(appliedFilters.period)}</span>
            {chips.map(([key, value]) => <span key={key} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs font-semibold text-slate-700"><span className="truncate">{pretty(key)}: {value}</span><button type="button" onClick={() => removeFilter(key)} className="rounded-full p-1 hover:bg-slate-200" aria-label={`Remove ${pretty(key)} filter`}><X className="h-3 w-3" /></button></span>)}
          </div>
        </form>
      </Card>

      {error && <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="h-5 w-5" />{error}</div>}
      {loading && <div className="h-1 overflow-hidden rounded-full bg-brand-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" /></div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={UsersRound} label="Total Registered Applicants" value={summary.total_registered_applicants} detail={`${summary.complete_profiles || 0} complete · ${summary.incomplete_profiles || 0} incomplete`} />
        <Kpi icon={UserRoundCheck} label="Active Participants" value={summary.active_participants} detail="Activity in selected date range" />
        <Kpi icon={Building2} label="Total Employers" value={summary.total_employers} detail={`${summary.verified_employers || 0} verified`} />
        <Kpi icon={BriefcaseBusiness} label="Job Vacancies" value={summary.total_job_vacancies} detail={`${summary.active_job_vacancies || 0} active · ${summary.closed_job_vacancies || 0} closed`} />
        <Kpi icon={FileChartColumn} label="Total Applications" value={summary.total_applications} detail={`${summary.pending_applications || 0} pending`} />
        <Kpi icon={CheckCircle2} label="Hired Applicants" value={summary.hired_applicants} detail="Recorded application status: hired" />
        <Kpi icon={Activity} label="Unemployed Applicants" value={summary.unemployed_applicants} detail="Current self-reported status" />
        <Kpi icon={CalendarRange} label="Scheduled Interviews" value={summary.scheduled_interviews} detail="Currently scheduled" />
      </section>

      <Insight icon={UserRoundCheck} title="How Active Participants is defined">{summary.active_participants_definition}</Insight>

      <SectionTitle title="Applicant and employment trends" subtitle="Registered job seekers and job applications are intentionally reported as separate indicators." />
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Registered Job Seekers vs Job Applications Submitted" subtitle={`${pretty(appliedFilters.period)} counts within the selected range.`}>
          <TrendChart series={mergeTrends(trends.registered_job_seekers, trends.job_applications_submitted, 'Registered Job Seekers', 'Job Applications Submitted')} lines={['Registered Job Seekers', 'Job Applications Submitted']} />
        </ChartCard>
        <ChartCard title="Employment Activity" subtitle="Hires and newly posted vacancies over time.">
          <TrendChart series={mergeTrends(trends.hired_applicants, trends.vacancy_postings, 'Hired Applicants', 'Vacancy Postings')} lines={['Hired Applicants', 'Vacancy Postings']} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Current Employment Status" subtitle="Current distribution; status history is not stored."><Donut data={distributions.employment_status} /></ChartCard>
        <ChartCard title="Gender Distribution" subtitle="Registered job seekers with available sex data."><Donut data={distributions.gender} /></ChartCard>
        <ChartCard title="Educational Attainment" subtitle="Top recorded attainment levels."><HorizontalBars data={distributions.educational_attainment} /></ChartCard>
      </div>
      <Insight icon={CircleAlert} title="Unemployment trend limitation">{data?.meta?.unemployment_note}</Insight>

      <SectionTitle title="Skills and job demand" subtitle="Supply from seeker profiles compared with demand recorded on vacancies." />
      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Common Job Seeker Skills"><HorizontalBars data={top.job_seeker_skills} /></ChartCard>
        <ChartCard title="Demanded Vacancy Skills"><HorizontalBars data={top.vacancy_demanded_skills} color="#d89b28" /></ChartCard>
        <ChartCard title="Most Applied Job Categories"><HorizontalBars data={top.most_applied_job_categories} color="#0f766e" /></ChartCard>
      </div>

      <SectionTitle title="Location analytics" subtitle="Top locations are limited to keep the dashboard readable and responsive." />
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Job Seekers by Barangay"><HorizontalBars data={distributions.job_seeker_locations?.barangay} /></ChartCard>
        <ChartCard title="Job Seekers by City / Municipality"><HorizontalBars data={distributions.job_seeker_locations?.city_municipality} color="#d89b28" /></ChartCard>
        <ChartCard title="Employers by Location"><HorizontalBars data={distributions.employer_locations?.city_municipality} color="#7c3aed" /></ChartCard>
        <ChartCard title="Vacancies by Location"><HorizontalBars data={distributions.vacancy_locations?.city_municipality} color="#0f766e" /></ChartCard>
      </div>

      <SectionTitle title="Company and vacancy analytics" subtitle="Employer activity is separated into applications, vacancies, and confirmed hires." />
      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Most Active Hiring Companies"><RankList data={top.most_active_hiring_companies} unit="applications" /></ChartCard>
        <ChartCard title="Companies with Most Vacancies"><RankList data={top.companies_with_most_vacancies} unit="vacancies" /></ChartCard>
        <ChartCard title="Companies with Highest Hires"><RankList data={top.companies_with_highest_hires} unit="hires" /></ChartCard>
        <ChartCard title="Job Vacancies by Status"><Donut data={distributions.vacancy_status} /></ChartCard>
        <div className="xl:col-span-2"><ChartCard title="Job Vacancies by Category / Occupation"><HorizontalBars data={top.vacancies_by_category} /></ChartCard></div>
      </div>

      <Forecast forecast={forecast} />
    </>
  )
}

function ReportsView({ reports, loading, generating, onGenerate, navigate }) {
  const latestByCategory = useMemo(() => Object.fromEntries(reports.map((report) => [report.report_category, report.created_at])), [reports])
  return (
    <>
      <Card>
        <div className="flex items-start gap-4"><span className="rounded-xl bg-brand-50 p-3 text-brand-700"><FileChartColumn className="h-6 w-6" /></span><div><h2 className="text-lg font-bold text-slate-950">Reports workspace</h2><p className="mt-1 text-sm leading-6 text-slate-600">Generate saved, auditable snapshots from the currently applied dashboard date range. Export buttons are only shown in the dedicated DOLE/establishment workspaces where backend export support already exists.</p></div></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCatalog.map((report) => (
          <Card key={report[0]} padding="sm" className="h-full">
            <div className="flex h-full flex-col">
              <div className="flex flex-1 items-start gap-3"><span className="shrink-0 rounded-xl bg-slate-100 p-2 text-brand-700"><FileText className="h-5 w-5" /></span><div className="min-w-0"><h3 className="font-bold text-slate-950">{report[1]}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{report[2]}</p><p className="mt-3 text-xs font-semibold text-slate-500">Filters: {report[3]}</p><p className="mt-1 text-xs leading-5 text-slate-400">Last generated: {latestByCategory[report[0]] ? new Date(latestByCategory[report[0]]).toLocaleString('en-PH') : 'Not yet generated'}</p></div></div>
              <Button className="mt-4 w-full" variant="outline" onClick={() => onGenerate(report)} disabled={Boolean(generating)}>{generating === report[0] ? 'Generating…' : 'Generate & View'}</Button>
            </div>
          </Card>
        ))}
        <LinkedReport title="Job Fair Report" description="Use the Job Fairs workspace for participant, employer, and SPRS-supported reporting." href="/admin/job-fairs" navigate={navigate} />
        <LinkedReport title="Establishment Report / RO1-JF Form 3" description="Preview and export the existing establishment report from the DOLE Reporting workspace." href="/admin/dole-reporting" navigate={navigate} />
      </div>
      <Card padding="none">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-950">Saved reports</h2><p className="text-sm text-slate-500">Most recently generated analytics snapshots.</p></div>
        {loading ? <ReportListSkeleton /> : reports.length ? <div className="divide-y divide-slate-100">{reports.slice(0, 15).map((report) => <button key={report.report_id} onClick={() => navigate(`/admin/labor-analytics/${report.report_id}`)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{report.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{pretty(report.report_category)} · {new Date(report.created_at).toLocaleString('en-PH')}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div> : <Empty label="No saved reports have been generated yet." />}
      </Card>
    </>
  )
}

function Forecast({ forecast }) {
  const items = Array.isArray(forecast.items) ? forecast.items : []
  return <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm"><div className="flex items-start gap-4 border-b border-amber-100 p-5 sm:p-6"><span className="shrink-0 rounded-xl bg-amber-100 p-3 text-amber-800"><Sparkles className="h-6 w-6" /></span><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Experimental Forecast</p><h2 className="mt-1 text-xl font-black text-slate-950">Next-month labor demand signal</h2><p className="mt-1 text-sm leading-6 text-slate-600">{forecast.explanation || forecast.message || 'Forecast information is not available.'}</p></div></div>{forecast.available && items.length ? <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3 2xl:grid-cols-5">{items.map((item, index) => <div key={item.item || index} className="rounded-xl border border-amber-100 bg-white p-4"><p className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900">{item.item || 'Unspecified category'}</p><p className="mt-3 text-3xl font-black text-brand-900">{safeNumber(item.predicted_next_month_count)}</p><p className="text-xs text-slate-500">predicted postings · {item.trend_direction || 'stable'}</p><p className="mt-2 text-xs font-semibold text-amber-800">R² fit: {formatFit(item.r_squared)}</p></div>)}</div> : <div className="p-5 sm:p-6"><Empty label="Not enough historical data yet to generate reliable predictions." /></div>}{forecast.confidence_note && <p className="border-t border-amber-100 px-5 py-4 text-xs leading-5 text-slate-600 sm:px-6">{forecast.confidence_note}</p>}</section>
}

function Kpi({ icon, label, value, detail }) { return <Card padding="sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{Number(value || 0).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">{createElement(icon, { className: 'h-5 w-5' })}</span></div></Card> }
function ChartCard({ title, subtitle, children }) { return <Card className="min-w-0"><div className="mb-5"><h3 className="font-bold leading-5 text-slate-950">{title}</h3>{subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}</div>{children}</Card> }
function TrendChart({ series, lines }) { return series.length ? <div className="h-72 min-w-0"><ResponsiveContainer><LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={24} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} /><Tooltip content={<ChartTooltip />} /><Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />{lines.map((line, index) => <Line key={line} type="monotone" dataKey={line} stroke={COLORS[index]} strokeWidth={3} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />)}</LineChart></ResponsiveContainer></div> : <Empty /> }
function Donut({ data = [] }) { return data.length ? <div className="space-y-3"><div className="h-48"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={76} paddingAngle={2}>{data.map((item, index) => <Cell key={item.label} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{data.map((item, index) => <div key={item.label} className="flex min-w-0 items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="min-w-0 flex-1 truncate text-slate-600" title={item.label}>{item.label}</span><span className="font-bold text-slate-900">{safeNumber(item.value)}</span></div>)}</div></div> : <Empty /> }
function HorizontalBars({ data = [], color = COLORS[0] }) { const rows = data.slice(0, 8); return rows.length ? <div className="h-72 min-w-0"><ResponsiveContainer><BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} /><YAxis dataKey="label" type="category" width={132} tickFormatter={(value) => truncateLabel(value, 18)} tick={{ fontSize: 10, fill: '#475569' }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} /><Bar dataKey="value" name="Count" fill={color} radius={[0, 6, 6, 0]} maxBarSize={24} /></BarChart></ResponsiveContainer></div> : <Empty /> }
function RankList({ data = [], unit }) { return data.length ? <ol className="space-y-3">{data.slice(0, 7).map((item, index) => <li key={item.label} className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-black text-brand-800">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800" title={item.label}>{item.label}</span><span className="shrink-0 text-xs font-bold text-slate-500">{safeNumber(item.value)} {unit}</span></li>)}</ol> : <Empty /> }
function Insight({ icon, title, children }) { return <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><span className="mt-0.5 text-brand-700">{createElement(icon, { className: 'h-5 w-5' })}</span><div><p className="text-sm font-bold text-brand-950">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{children}</p></div></div> }
function SectionTitle({ title, subtitle }) { return <div className="pt-2"><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div> }
function Filter({ label, children }) { return <label className="block min-w-0"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><span className="block [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:outline-none focus-within:[&_input]:ring-2 focus-within:[&_input]:ring-brand-500">{children}</span></label> }
function SelectFilter({ label, value, onChange, options = [] }) { return <label className="min-w-0"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"><option value="">All</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label> }
function ViewButton({ active, icon, onClick, children }) { return <button onClick={onClick} aria-pressed={active} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${active ? 'bg-brand-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>{createElement(icon, { className: 'h-4 w-4' })}{children}</button> }
function LinkedReport({ title, description, href, navigate }) { return <Card padding="sm" className="h-full"><div className="flex h-full flex-col"><h3 className="font-bold text-slate-950">{title}</h3><p className="mt-1 flex-1 text-sm leading-5 text-slate-600">{description}</p><Button className="mt-4 w-full" variant="outline" onClick={() => navigate(href)}>Open workspace</Button></div></Card> }
function Empty({ label = 'No data matches the selected filters.' }) { return <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{label}</div> }
function ReportListSkeleton() { return <div className="divide-y divide-slate-100 animate-pulse">{[1, 2, 3].map((item) => <div key={item} className="p-4"><div className="h-4 w-2/3 rounded bg-slate-200" /><div className="mt-2 h-3 w-1/3 rounded bg-slate-100" /></div>)}</div> }
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const heading = payload[0]?.payload?.label || label
  return <div className="max-w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"><p className="mb-1 break-words font-bold text-slate-900">{heading}</p>{payload.map((entry) => <div key={entry.dataKey || entry.name} className="flex items-center justify-between gap-4 py-0.5"><span className="text-slate-600">{entry.name || pretty(entry.dataKey)}</span><span className="font-bold text-slate-950">{safeNumber(entry.value)}</span></div>)}</div>
}
function AnalyticsSkeleton() { return <div className="space-y-6 animate-pulse"><div className="h-44 rounded-2xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded-2xl bg-slate-200" />)}</div><div className="grid gap-6 xl:grid-cols-2"><div className="h-80 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div></div> }
function mergeTrends(first = [], second = [], firstKey, secondKey) { const rows = new Map(); first.forEach(({ period, value }) => rows.set(period, { period, [firstKey]: value, [secondKey]: 0 })); second.forEach(({ period, value }) => rows.set(period, { ...(rows.get(period) || { period, [firstKey]: 0 }), [secondKey]: value })); return [...rows.values()].sort((a, b) => a.period.localeCompare(b.period)) }
function toOptions(values = [], humanize = false) { return values.map((value) => [value, humanize ? pretty(value) : value]) }
function chipLabel(key, value, options) { if (key === 'occupation') return options.occupations?.find((item) => String(item.id) === String(value))?.title || 'Selected occupation'; return pretty(value) }
function formatDateRange(from, to) { if (!from || !to) return 'Date range not set'; return `${new Date(`${from}T00:00:00`).toLocaleDateString('en-PH')} – ${new Date(`${to}T00:00:00`).toLocaleDateString('en-PH')}` }
function formatPeriod(value) { const text = String(value || ''); if (/^\d{4}-\d{2}$/.test(text)) return new Date(`${text}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }); return text }
function truncateLabel(value, limit) { const text = String(value || 'Not specified'); return text.length > limit ? `${text.slice(0, limit - 1)}…` : text }
function safeNumber(value) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric.toLocaleString() : '0' }
function formatFit(value) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric.toFixed(2) : 'Not available' }
function pretty(value = '') { return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
