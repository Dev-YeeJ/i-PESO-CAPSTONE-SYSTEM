// i-peso-frontend/src/pages/admin/reports/ReportDetailPage.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '@/components/admin/PageHeader'
import { adminService } from '@/services/adminService'

export default function ReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getReportDetail(id).then(setReport).catch(e => {
      console.error(e)
      setLoading(false)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-8">Loading...</div>
  if (!report) return <div className="text-center py-8">Report not found</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <PageHeader title={report.title} subtitle={`${report.report_category} Report`} />
        <button onClick={() => navigate('/admin/reports')} className="text-sm font-medium">← Back</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Report Data</h3>
        <pre className="bg-slate-50 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(report.data_summary, null, 2)}
        </pre>
      </div>
    </div>
  )
}