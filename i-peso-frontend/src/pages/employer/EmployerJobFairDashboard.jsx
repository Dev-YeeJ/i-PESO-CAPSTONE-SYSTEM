import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Download, FileText, Hourglass, QrCode, Save, Star, TicketCheck, X, XCircle } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { AlertBox, Button, Card, CardHeader } from '@/components/ui'
import * as employerService from '@/services/employerService'
import {
  downloadRoiForm3,
  fastTrackJobFairApplication,
  joinJobFair,
  listJobFairs,
  scanJobFairQr,
} from '@/services/jobFairService'

const employerMismatchReasons = [
  ['salary_expectation_not_met', 'Salary Expectation Not Met'],
  ['lack_competencies_skills', 'Lack of Competencies or Skills'],
  ['lack_license_certification', 'Lack of Professional License or TESDA Certification'],
  ['documentary_requirements', 'Failed to Submit Documentary Requirements'],
  ['other_reason', 'Other Reason'],
]

const seekerMismatchReasons = [
  ['', 'Not Reported'],
  ['skill_mismatch', 'Skill Mismatch'],
  ['transportation_location', 'Transportation or Location Issue'],
  ['working_environment', 'Working Environment Is Not Acceptable'],
  ['other_reason', 'Other Reason'],
]

const statusStyles = {
  qualified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  near_hired: 'border-amber-200 bg-amber-50 text-amber-700',
  hots: 'border-blue-200 bg-blue-50 text-blue-700',
  reject: 'border-red-200 bg-red-50 text-red-700',
}

export default function EmployerJobFairDashboard() {
  const [fairs, setFairs] = useState([])
  const [vacancies, setVacancies] = useState([])
  const [selectedFairId, setSelectedFairId] = useState('')
  const [selectedVacancyId, setSelectedVacancyId] = useState('')
  const [linkedVacancyIds, setLinkedVacancyIds] = useState([])
  const [queue, setQueue] = useState([])
  const [manualCode, setManualCode] = useState('')
  const [scannerOn, setScannerOn] = useState(false)
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingJoin, setSavingJoin] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedFair = useMemo(
    () => fairs.find((fair) => String(fair.job_fair_id) === String(selectedFairId)),
    [fairs, selectedFairId],
  )

  const linkedVacancies = useMemo(
    () => vacancies.filter((vacancy) => linkedVacancyIds.includes(vacancy.post_id)),
    [linkedVacancyIds, vacancies],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [fairData, vacancyData] = await Promise.all([
        listJobFairs(),
        employerService.getVacancies(),
      ])
      const activeVacancies = (vacancyData.data ?? []).filter((vacancy) => vacancy.status === 'active')
      setFairs(fairData)
      setVacancies(activeVacancies)
      const firstFair = fairData[0]
      if (firstFair) {
        setSelectedFairId(String(firstFair.job_fair_id))
        const initialLinks = firstFair.linked_vacancy_ids ?? []
        setLinkedVacancyIds(initialLinks)
        setSelectedVacancyId(String(initialLinks[0] ?? activeVacancies[0]?.post_id ?? ''))
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load job fair booth data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selectedFair) return
    const links = selectedFair.linked_vacancy_ids ?? []
    setLinkedVacancyIds(links)
    setSelectedVacancyId(String(links[0] ?? vacancies[0]?.post_id ?? ''))
  }, [selectedFair, vacancies])

  const scanCode = useCallback(async (code) => {
    const qrCodeUuid = String(code ?? '').trim()
    if (!qrCodeUuid || !selectedFairId) return

    setError('')
    try {
      const response = await scanJobFairQr({ qrCodeUuid, jobFairId: Number(selectedFairId) })
      setQueue((current) => {
        const withoutDuplicate = current.filter((item) => item.qr_code_uuid !== response.attendee.qr_code_uuid)
        return [{ ...response.attendee, booth_status: 'queued' }, ...withoutDuplicate]
      })
      setNotice(`${response.attendee.name} added to booth queue.`)
      setManualCode('')
    } catch (requestError) {
      if (!navigator.onLine) {
        const offlineQueue = JSON.parse(localStorage.getItem('ipeso-offline-job-fair-scans') ?? '[]')
        localStorage.setItem('ipeso-offline-job-fair-scans', JSON.stringify([
          { qrCodeUuid, jobFairId: Number(selectedFairId), capturedAt: new Date().toISOString() },
          ...offlineQueue,
        ]))
        setNotice('Connection lost. QR code cached locally for manual retry when online.')
      } else {
        setError(requestError.response?.data?.message ?? 'Unable to scan this QR pass.')
      }
    }
  }, [selectedFairId])

  useEffect(() => {
    if (!scannerOn || !selectedFairId) return undefined

    const scanner = new Html5QrcodeScanner('job-fair-qr-reader', {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      rememberLastUsedCamera: true,
    }, false)

    scanner.render((decodedText) => scanCode(decodedText), () => {})

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [scanCode, scannerOn, selectedFairId])

  const toggleVacancy = (postId) => {
    setLinkedVacancyIds((current) => (
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId]
    ))
  }

  const saveJoin = async () => {
    if (!selectedFairId || linkedVacancyIds.length === 0) {
      setError('Select at least one active vacancy before joining the fair.')
      return
    }

    setSavingJoin(true)
    setError('')
    try {
      const response = await joinJobFair(Number(selectedFairId), linkedVacancyIds)
      setFairs((current) => current.map((fair) => (
        fair.job_fair_id === response.job_fair.job_fair_id ? response.job_fair : fair
      )))
      setSelectedVacancyId(String(linkedVacancyIds[0]))
      setNotice('Job fair booth setup saved.')
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to join this job fair.')
    } finally {
      setSavingJoin(false)
    }
  }

  const saveAction = async ({ attendee, action, data = {} }) => {
    if (!selectedVacancyId) {
      setError('Select a linked vacancy before taking ATS action.')
      return
    }

    const optimisticStatus = action
    setQueue((current) => current.map((item) => (
      item.qr_code_uuid === attendee.qr_code_uuid ? { ...item, booth_status: optimisticStatus } : item
    )))

    try {
      const response = await fastTrackJobFairApplication({
        job_fair_id: Number(selectedFairId),
        vacancy_id: Number(selectedVacancyId),
        seeker_id: attendee.seeker_id,
        qr_code_uuid: attendee.qr_code_uuid,
        action,
        ...data,
      })
      setQueue((current) => current.map((item) => (
        item.qr_code_uuid === attendee.qr_code_uuid
          ? { ...item, booth_status: action, application: response.application }
          : item
      )))
      setNotice('ATS action saved.')
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to save ATS action.')
      setQueue((current) => current.map((item) => (
        item.qr_code_uuid === attendee.qr_code_uuid ? { ...item, booth_status: 'queued' } : item
      )))
    }
  }

  const downloadReport = async () => {
    if (!selectedFairId) return
    try {
      const blob = await downloadRoiForm3(Number(selectedFairId))
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `establishment-report-ro1-jf-form-3-${selectedFairId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to generate Establishment Report / RO1-JF Form 3.')
    }
  }

  return (
    <div className="portal-page">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="portal-eyebrow">Digital Job Fair</p>
          <h1 className="portal-title mt-1">Live Booth Dashboard</h1>
          <p className="portal-subtitle">Scan QR passes, build your booth queue, and record rapid ATS outcomes without page reloads.</p>
        </div>
        <Button icon={FileText} variant="navy" onClick={downloadReport} disabled={!selectedFairId}>Export Establishment Report / RO1-JF Form 3</Button>
      </div>

      {error && <AlertBox variant="danger" title="Job fair action failed">{error}</AlertBox>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

      {loading ? (
        <Card><div className="py-16 text-center text-sm font-semibold text-slate-500">Loading booth workspace...</div></Card>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Pre-Event Setup" subtitle="Join a fair and link the vacancies handled by this booth." />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">Job Fair</label>
                  <select value={selectedFairId} onChange={(event) => setSelectedFairId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    {fairs.map((fair) => <option key={fair.job_fair_id} value={fair.job_fair_id}>{fair.title}</option>)}
                  </select>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-extrabold text-slate-900">{selectedFair?.venue ?? 'No fair selected'}</p>
                  <p>{selectedFair?.start_date ?? 'TBD'} to {selectedFair?.end_date ?? 'TBD'}</p>
                  <p>{selectedFair?.metrics?.employers_joined ?? 0} employers · {selectedFair?.metrics?.seekers_rsvped ?? 0} RSVPs</p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700">Active Vacancies</p>
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {vacancies.map((vacancy) => (
                      <label key={vacancy.post_id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={linkedVacancyIds.includes(vacancy.post_id)}
                          onChange={() => toggleVacancy(vacancy.post_id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-bold text-slate-900">{vacancy.job_title}</span>
                          <span className="text-xs text-slate-500">{vacancy.vacancies_count} opening(s)</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button icon={Save} onClick={saveJoin} disabled={savingJoin || linkedVacancyIds.length === 0} className="w-full">
                  {savingJoin ? 'Saving...' : 'Join Fair / Save Vacancies'}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader title="QR Scanner" subtitle="Camera scanning is optimized for tablet booths." />
              <div className="space-y-3">
                <Button icon={Camera} variant={scannerOn ? 'outline' : 'primary'} onClick={() => setScannerOn((value) => !value)} className="w-full">
                  {scannerOn ? 'Stop Camera' : 'Start Camera'}
                </Button>
                {scannerOn && <div id="job-fair-qr-reader" className="overflow-hidden rounded-lg border border-slate-200" />}
                <div className="flex gap-2">
                  <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Paste QR UUID" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <Button icon={QrCode} onClick={() => scanCode(manualCode)}>Scan</Button>
                </div>
              </div>
            </Card>
          </div>

          <Card padding="none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-black text-slate-950">Booth Queue</h2>
                <p className="text-sm text-slate-500">Select the vacancy, then record each applicant’s booth outcome.</p>
              </div>
              <select value={selectedVacancyId} onChange={(event) => setSelectedVacancyId(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold">
                {linkedVacancies.map((vacancy) => <option key={vacancy.post_id} value={vacancy.post_id}>{vacancy.job_title}</option>)}
              </select>
            </div>

            {queue.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <TicketCheck className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 font-extrabold text-slate-900">No scanned seekers yet</p>
                <p className="mt-1 text-sm text-slate-500">Scanned QR passes appear here instantly for ATS action.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Seeker</th>
                      <th className="px-5 py-3">Profile</th>
                      <th className="px-5 py-3">Skills</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">ATS Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {queue.map((attendee) => (
                      <tr key={attendee.qr_code_uuid} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-slate-950">{attendee.name}</p>
                          <p className="text-xs text-slate-500">{attendee.mobile_number ?? attendee.email}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          <p>{attendee.educ_attainment ?? 'Education not listed'}</p>
                          <p className="text-xs">{attendee.employment_status ?? 'Employment status not listed'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {(attendee.skills ?? []).slice(0, 5).map((skill) => (
                              <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{skill}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-md border px-2 py-1 text-xs font-extrabold uppercase ${statusStyles[attendee.booth_status] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                            {attendee.booth_status?.replaceAll('_', ' ') ?? 'Queued'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" icon={Star} onClick={() => saveAction({ attendee, action: 'qualified' })}>Qualified</Button>
                            <Button size="sm" variant="outline" icon={Hourglass} onClick={() => saveAction({ attendee, action: 'near_hired' })}>Near Hired</Button>
                            <Button size="sm" variant="navy" icon={TicketCheck} onClick={() => setModal({ type: 'hots', attendee })}>HOTS</Button>
                            <Button size="sm" variant="danger" icon={XCircle} onClick={() => setModal({ type: 'reject', attendee })}>Reject</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {modal && (
        <ActionModal
          modal={modal}
          onClose={() => setModal(null)}
          onSubmit={(data) => {
            saveAction({ attendee: modal.attendee, action: modal.type === 'hots' ? 'hots' : 'reject', data })
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function ActionModal({ modal, onClose, onSubmit }) {
  const [form, setForm] = useState({
    placement_start_date: '',
    placement_salary: '',
    dole_mismatch_code: employerMismatchReasons[0][0],
    seeker_mismatch_reason_code: '',
    remarks: '',
  })

  const isHots = modal.type === 'hots'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase text-blue-700">{isHots ? 'Placement Modal' : 'Mismatch Modal'}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{modal.attendee.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close modal"><X className="h-5 w-5" /></button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(isHots ? {
              placement_start_date: form.placement_start_date,
              placement_salary: form.placement_salary,
            } : {
              dole_mismatch_code: form.dole_mismatch_code,
              seeker_mismatch_reason_code: form.seeker_mismatch_reason_code || null,
              remarks: form.remarks,
            })
          }}
          className="mt-5 space-y-4"
        >
          {isHots ? (
            <>
              <div>
                <label className="text-sm font-bold text-slate-700">Start Date</label>
                <input type="date" required value={form.placement_start_date} onChange={(event) => setForm((current) => ({ ...current, placement_start_date: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Salary</label>
                <input type="number" min="1" required value={form.placement_salary} onChange={(event) => setForm((current) => ({ ...current, placement_salary: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-bold text-slate-700">Employer-Side Reason</label>
                <select required value={form.dole_mismatch_code} onChange={(event) => setForm((current) => ({ ...current, dole_mismatch_code: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {employerMismatchReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Seeker-Side Reason</label>
                <select value={form.seeker_mismatch_reason_code} onChange={(event) => setForm((current) => ({ ...current, seeker_mismatch_reason_code: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {seekerMismatchReasons.map(([value, label]) => <option key={value || 'none'} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Additional Details</label>
                <textarea value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} rows={3} maxLength={1000} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional context for the report" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" icon={isHots ? Download : XCircle}>{isHots ? 'Save HOTS' : 'Save Mismatch'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
