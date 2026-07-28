import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileDown, FileText, Filter, RefreshCw, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState, LoadingSkeleton } from '@/components/ui'
import { downloadReportBlob, exportEstablishmentReport, previewEstablishmentReport } from '@/services/establishmentReportService'

const emptyFilters = {
  employer_id: '', job_fair_id: '', vacancy_id: '', date_from: '', date_to: '', status: '', source: 'all',
}

export default function EstablishmentReportWorkspace({ role }) {
  const isAdmin = role === 'admin'
  const [filters, setFilters] = useState(emptyFilters)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [error, setError] = useState('')

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setReport(await previewEstablishmentReport(role, filters))
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to generate the report preview.')
    } finally {
      setLoading(false)
    }
  }, [filters, role])

  useEffect(() => { loadPreview() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const options = report?.filter_options ?? {}
  const vacancies = useMemo(() => {
    const rows = options.vacancies ?? []
    return filters.employer_id ? rows.filter((vacancy) => String(vacancy.employer_id) === String(filters.employer_id)) : rows
  }, [filters.employer_id, options.vacancies])

  const update = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'employer_id' ? { vacancy_id: '' } : {}),
    }))
  }

  const exportFile = async (format) => {
    setExporting(format)
    try {
      const blob = await exportEstablishmentReport(role, filters, format)
      downloadReportBlob(blob, `establishment-report-ro1-jf-form-3.${format}`)
      toast.success(`${format.toUpperCase()} report generated.`)
    } catch (requestError) {
      toast.error(requestError.response?.data?.message ?? `Unable to export ${format.toUpperCase()}.`)
    } finally {
      setExporting('')
    }
  }

  const metrics = [
    ['Applicants', report?.summary?.total ?? 0, UsersRound, 'bg-blue-50 text-blue-800'],
    ['Qualified', report?.summary?.qualified ?? 0, FileText, 'bg-emerald-50 text-emerald-800'],
    ['Near Hired', report?.summary?.near_hired ?? 0, FileText, 'bg-amber-50 text-amber-800'],
    ['HOTS', report?.summary?.hots ?? 0, FileText, 'bg-cyan-50 text-cyan-800'],
    ['Rejected', report?.summary?.rejected ?? 0, FileText, 'bg-rose-50 text-rose-800'],
    ['Mismatch Cases', report?.summary?.mismatch_cases ?? 0, FileText, 'bg-violet-50 text-violet-800'],
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-blue-800">DOLE Region I Job Fair Reporting</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Establishment Report</h1>
          <p className="mt-1 text-sm font-bold text-slate-500">RO1-JF Form 3</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Generate the official establishment applicant register from online ATS and Digital Job Fair outcomes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportFile('csv')} disabled={Boolean(exporting)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"><FileDown className="h-4 w-4" />{exporting === 'csv' ? 'Exporting...' : 'Export CSV'}</button>
          <button onClick={() => exportFile('pdf')} disabled={Boolean(exporting)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting === 'pdf' ? 'Generating...' : 'Export PDF'}</button>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h2 className="font-black text-slate-950">Report Filters</h2></div>
        <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${isAdmin ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          {isAdmin && <FilterSelect label="Establishment" value={filters.employer_id} onChange={(value) => update('employer_id', value)} options={(options.employers ?? []).map((employer) => ({ value: employer.employer_id, label: employer.company_name || employer.email }))} empty="All establishments" />}
          <FilterSelect label="Source" value={filters.source} onChange={(value) => update('source', value)} options={[{ value: 'all', label: 'Online and Job Fair' }, { value: 'online', label: 'Online Applications' }, { value: 'job_fair', label: 'Job Fair Applications' }]} />
          <FilterSelect label="Job Fair" value={filters.job_fair_id} onChange={(value) => update('job_fair_id', value)} options={(options.job_fairs ?? []).map((fair) => ({ value: fair.job_fair_id, label: fair.title }))} empty="All job fairs" />
          <FilterSelect label="Vacancy" value={filters.vacancy_id} onChange={(value) => update('vacancy_id', value)} options={vacancies.map((vacancy) => ({ value: vacancy.post_id, label: vacancy.job_title }))} empty="All vacancies" />
          <FilterSelect label="Application Status" value={filters.status} onChange={(value) => update('status', value)} options={options.statuses ?? []} empty="All statuses" />
          <FilterDate label="Date From" value={filters.date_from} onChange={(value) => update('date_from', value)} />
          <FilterDate label="Date To" value={filters.date_to} onChange={(value) => update('date_to', value)} />
          <div className="flex items-end"><button onClick={loadPreview} disabled={loading} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-900 px-4 py-2.5 text-sm font-bold text-blue-900 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh Preview</button></div>
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Report summary">
        {metrics.map(([label, value, Icon, tone]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><span className={`inline-flex rounded-lg p-2 ${tone}`}>{createElement(Icon, { className: 'h-4 w-4' })}</span><p className="mt-3 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></div>)}
      </section>

      {loading ? <LoadingSkeleton variant="card" rows={3} /> : (report?.reports ?? []).length === 0 ? <EmptyState filtered icon={FileText} title="No report records found" description="Adjust the filters or record applicant outcomes in ATS and Job Fair." /> : (report.reports.map((establishment) =><ReportPreview key={establishment.establishment.employer_id} report={establishment} isAdmin={isAdmin} />))}
    </div>
  )
}

function ReportPreview({ report, isAdmin }) {
  const establishment = report.establishment
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4"><Meta label="Establishment" value={establishment.name} /><Meta label="Office Location" value={establishment.office_location} /><Meta label="Activity / Job Fair" value={`${establishment.job_fair_name} / ${establishment.job_fair_date}`} /><Meta label="Submitted By" value={`${establishment.submitted_by} / ${establishment.mobile_number}`} /></div><div className="overflow-x-auto"><table className="min-w-[1450px] w-full divide-y divide-slate-200 text-left"><thead className="bg-white text-[11px] font-extrabold uppercase text-slate-500"><tr><th className="px-3 py-3">No.</th>{isAdmin && <th className="px-3 py-3">Establishment</th>}<th className="px-3 py-3">Jobseeker</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Sex</th><th className="px-3 py-3">City</th><th className="px-3 py-3">Mobile</th><th className="px-3 py-3">Age Range</th><th className="px-3 py-3">Educ.</th><th className="px-3 py-3">Classification</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Employer Reason</th><th className="px-3 py-3">Seeker Reason</th><th className="px-3 py-3">Details</th><th className="px-3 py-3">Source</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs text-slate-700">{report.entries.map((entry, index) => <tr key={`${entry.application_id}-${entry.job_fair_id ?? 'online'}`} className="align-top hover:bg-slate-50"><td className="px-3 py-3 font-bold">{index + 1}</td>{isAdmin && <td className="px-3 py-3 font-bold">{establishment.name}</td>}<td className="px-3 py-3 font-bold text-slate-900">{entry.name}</td><td className="px-3 py-3">{entry.position_applying_for}</td><td className="px-3 py-3">{entry.sex}</td><td className="px-3 py-3">{entry.residence_city}</td><td className="px-3 py-3">{entry.contact_number}</td><td className="px-3 py-3">{entry.age_range}</td><td className="px-3 py-3 font-black">{entry.educational_attainment_code}</td><td className="px-3 py-3">{entry.jobseeker_classifications.join(', ')}</td><td className="px-3 py-3 font-bold">{entry.application_status}</td><td className="px-3 py-3">{entry.employer_mismatch_reason}</td><td className="px-3 py-3">{entry.seeker_mismatch_reason}</td><td className="max-w-64 px-3 py-3">{entry.mismatch_reason_details}</td><td className="px-3 py-3">{entry.source_label}</td></tr>)}</tbody></table></div></section>
}

function Meta({ label, value }) { return <div><p className="text-[11px] font-extrabold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div> }
function FilterSelect({ label, value, onChange, options, empty }) { return <label className="text-xs font-bold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-900"><option value="">{empty ?? `Select ${label.toLowerCase()}`}</option>{options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label> }
function FilterDate({ label, value, onChange }) { return <label className="text-xs font-bold text-slate-600">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-900" /></label> }
