import { createElement, useEffect, useState } from 'react'
import { FileText, FileBarChart, CalendarDays, CheckCircle2, Printer, X, Loader2 } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function DOLEReportingPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Print view state
  const [generatedReport, setGeneratedReport] = useState(null)

  const fetchReports = () => {
    setLoading(true)
    adminService.getReports({ per_page: 15 }).then(d => {
      setReports(d.data || [])
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    try {
      const res = await adminService.generateSPRS(selectedMonth, selectedYear)
      toast.success(res.message)
      setGeneratedReport(res.data)
      setShowGenerateModal(false)
      fetchReports() // refresh history
    } catch (err) {
      toast.error('Failed to generate SPRS report')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const columns = [
    { key: 'month', label: 'Report Period', render: (val, row) => new Date(row.coverage_start || row.report_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) },
    { key: 'category', label: 'Category', render: (val, row) => row.report_category?.toUpperCase() || 'SPRS' },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
          row.status === 'submitted'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {row.status || 'Draft'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (val, row) => (
        <button 
          onClick={() => setGeneratedReport(row.data_summary)}
          className="text-brand-600 hover:text-brand-900 text-sm font-bold"
        >
          View Details
        </button>
      ),
    },
  ]

  return (
    <div className="portal-page relative">
      {/* Hide the main UI when printing! */}
      <div className="print:hidden">
        <PageHeader
          title="DOLE Reporting (SPRS)"
          subtitle="Generate Statistical Performance Reports and manage official DOLE submissions."
          eyebrow="Government & DOLE"
          actions={[
            { label: 'Establishment Report / RO1-JF Form 3', onClick: () => navigate('/admin/establishment-report'), variant: 'outline' },
            { label: 'Generate New SPRS', onClick: () => setShowGenerateModal(true), variant: 'primary' },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={FileText} label="Total Reports" value={reports.length} detail="Generated SPRS" tone="navy" />
          <SummaryCard icon={CalendarDays} label="Recent Submissions" value={reports.filter(r => r.status === 'submitted').length} detail="Officially filed" tone="green" />
          <SummaryCard icon={FileBarChart} label="Placements YTD" value={0} detail="Year to date" tone="blue" />
          <SummaryCard icon={CheckCircle2} label="Compliance" value="100%" detail="On-time submission rate" tone="amber" />
        </div>

        <Card padding="none" className="mt-6">
          <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950">SPRS History</h2>
              <p className="text-sm text-slate-500">View and track past statistical reports.</p>
            </div>
          </div>
          
          <DataTable
            columns={columns}
            data={reports}
            loading={loading}
            emptyMessage="No reports found. Generate your first SPRS to begin tracking compliance."
          />
        </Card>
      </div>

      {/* GENERATE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Generate SPRS</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select 
                    className="w-full rounded-lg border border-slate-300 p-2.5"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-300 p-2.5"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    min="2020"
                    max="2100"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isGenerating} className="w-full">
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Generate & Extract Data'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW OVERLAY */}
      {generatedReport && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto print:absolute print:inset-0 print:bg-white print:overflow-visible">
          
          <div className="max-w-4xl mx-auto my-8 print:my-0">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="flex items-center justify-between bg-white rounded-t-2xl border-b border-slate-200 p-4 print:hidden">
              <h3 className="text-lg font-bold text-slate-900">SPRS Print Preview</h3>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setGeneratedReport(null)}>
                  Close
                </Button>
                <Button onClick={() => window.print()} className="gap-2">
                  <Printer className="h-4 w-4" /> Print Document
                </Button>
              </div>
            </div>

            {/* The Actual Report Form */}
            <div className="bg-white p-10 print:p-0 shadow-lg rounded-b-2xl print:shadow-none print:rounded-none">
              
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-xl font-bold uppercase">Department of Labor and Employment</h1>
                <h2 className="text-lg font-bold uppercase mt-1">Statistical Performance Reporting System (SPRS)</h2>
                <h3 className="text-md font-semibold mt-1">Form 2018</h3>
                <p className="mt-2 text-sm font-bold">REPORT PERIOD: {generatedReport.period}</p>
              </div>

              <div className="mb-6">
                <p className="font-bold border-b border-black text-sm mb-2 uppercase">1. Employment Facilitation</p>
                <table className="w-full text-sm border-collapse border border-black mb-4">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left w-1/2">Indicator</th>
                      <th className="border border-black p-2 text-center">Total</th>
                      <th className="border border-black p-2 text-center">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2">1.1 Job Vacancies Solicited/Reported</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport['1_1_vacancies']?.total || 0}</td>
                      <td className="border border-black p-2">
                        Local: {generatedReport['1_1_vacancies']?.local || 0} <br/>
                        Overseas: {generatedReport['1_1_vacancies']?.overseas || 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">1.2 Applicants Registered</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport['1_2_registered']?.total || 0}</td>
                      <td className="border border-black p-2">
                        Female: {generatedReport['1_2_registered']?.female || 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">1.3 Applicants Referred</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport['1_3_referred']?.total || 0}</td>
                      <td className="border border-black p-2">
                        Female: {generatedReport['1_3_referred']?.female || 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">1.4 Applicants Placed</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport['1_4_placed']?.total || 0}</td>
                      <td className="border border-black p-2">
                        Female: {generatedReport['1_4_placed']?.female || 0} <br/>
                        Private: {generatedReport['1_4_placed']?.private || 0} <br/>
                        Government: {generatedReport['1_4_placed']?.government || 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">1.5 SPES Placed</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport['1_5_spes']?.total || 0}</td>
                      <td className="border border-black p-2">
                        Female: {generatedReport['1_5_spes']?.female || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="font-bold border-b border-black text-sm mb-2 mt-8 uppercase">E. PEIS (PhilJobNet)</p>
                <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left w-1/2">Indicator</th>
                      <th className="border border-black p-2 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2">E.1 Establishments Registered</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport.peis?.establishments || 0}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">E.2 Applicants Registered</td>
                      <td className="border border-black p-2 text-center font-bold">{generatedReport.peis?.applicants || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-16 pt-8 grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p>Prepared by:</p>
                  <div className="mt-8 border-b border-black w-[80%] mb-1"></div>
                  <p className="font-bold uppercase">PESO MANAGER</p>
                </div>
                <div>
                  <p>Noted by:</p>
                  <div className="mt-8 border-b border-black w-[80%] mb-1"></div>
                  <p className="font-bold uppercase">DOLE REGIONAL DIRECTOR</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = {
    navy: 'bg-slate-100 text-brand-navy',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
    </Card>
  )
}
