import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Clock3, Search, XCircle } from 'lucide-react'
import { AlertBox, Badge, Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

const QR_ELEMENT_ID = 'job-fair-qr-reader'
const emptyWalkIn = { guest_name: '', guest_mobile_number: '', guest_email: '', guest_educ_attainment: '', guest_preferred_job: '' }

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function AttendeeCard({ attendee }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-lg font-black text-slate-950">{attendee.name || 'Unnamed seeker'}</p>
        <p className="text-sm text-slate-600">{attendee.mobile_number || 'No mobile number on file'} {attendee.email ? `· ${attendee.email}` : ''}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        {attendee.educ_attainment && <span className="rounded-full bg-slate-100 px-2.5 py-1">{attendee.educ_attainment}</span>}
        {attendee.employment_status && <span className="rounded-full bg-slate-100 px-2.5 py-1">{attendee.employment_status}</span>}
        {attendee.preferred_job && <span className="rounded-full bg-slate-100 px-2.5 py-1">Prefers: {attendee.preferred_job}</span>}
        {attendee.is_guest && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">Walk-in</span>}
      </div>
      {attendee.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attendee.skills.slice(0, 6).map((skill) => (
            <span key={skill} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">{skill}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JobFairCheckInPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lockedRef = useRef(false)
  const checkInRef = useRef(() => {})
  const [cameraError, setCameraError] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [result, setResult] = useState(null)
  const [counts, setCounts] = useState({ attendance: 0, rsvps: 0 })
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [walkIn, setWalkIn] = useState(emptyWalkIn)
  const [encoding, setEncoding] = useState(false)

  const refreshCounts = useCallback(async () => {
    try {
      const fair = await adminService.getJobFairDetail(id)
      setCounts({ attendance: fair?.metrics?.attendance ?? 0, rsvps: fair?.metrics?.seekers_rsvped ?? 0 })
    } catch {
      // Non-critical — scanning still works even if the counter can't refresh.
    }
  }, [id])

  useEffect(() => { refreshCounts() }, [refreshCounts])

  // Other staff may be checking people in from a different phone at the same
  // time — poll so the counter reflects the whole desk, not just this device.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshCounts()
    }, 8000)
    return () => clearInterval(interval)
  }, [refreshCounts])

  const checkIn = useCallback(async (payload) => {
    if (lockedRef.current) return
    lockedRef.current = true
    setLookupError('')
    try {
      const data = await adminService.checkInJobFairAttendee(id, payload)
      setResult({ kind: data.status, attendee: data.attendee })
      refreshCounts()
    } catch (e) {
      if (e.response?.status === 404) {
        setResult({ kind: 'not_found' })
      } else {
        setLookupError(e.response?.data?.message ?? 'Check-in failed.')
        lockedRef.current = false
      }
    }
  }, [id, refreshCounts])

  useEffect(() => { checkInRef.current = checkIn }, [checkIn])

  const scanNext = () => {
    setResult(null)
    setLookupError('')
    setSearch('')
    setSearchResults([])
    setWalkIn(emptyWalkIn)
    lockedRef.current = false
  }

  const encodeWalkIn = async (e) => {
    e.preventDefault()
    if (encoding || !walkIn.guest_name.trim()) return
    setEncoding(true)
    setLookupError('')
    try {
      const data = await adminService.encodeJobFairWalkIn(id, walkIn)
      setResult({ kind: data.status, attendee: data.attendee })
      refreshCounts()
    } catch (e2) {
      setLookupError(Object.values(e2.response?.data?.errors ?? {}).flat().join(' ') || e2.response?.data?.message || 'Could not encode this registration.')
    } finally {
      setEncoding(false)
    }
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(QR_ELEMENT_ID)
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (lockedRef.current) return
        checkInRef.current({ qr_code_uuid: decodedText })
      },
      () => {}, // per-frame decode misses are normal while framing the QR — ignore
    ).catch(() => {
      setCameraError('Could not access the camera. Allow camera permission for this site, or use manual search below.')
    })

    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await adminService.searchJobFairAttendees(id, search.trim())
        setSearchResults(data)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(timeout)
  }, [search, id])

  return (
    <div className="portal-page">
      <PageHeader
        title="Job Fair Check-In"
        subtitle="Scan a seeker's digital pass to verify pre-registration and mark attendance."
        eyebrow="Info Desk"
        actions={[{ label: 'Back to event', onClick: () => navigate(`/admin/job-fairs/${id}`), variant: 'secondary' }]}
      />

      <section className="grid grid-cols-2 gap-3">
        <Card padding="sm">
          <p className="text-2xl font-black text-slate-950">{counts.attendance}</p>
          <p className="text-xs font-bold text-slate-500">Checked in</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-black text-slate-950">{counts.rsvps}</p>
          <p className="text-xs font-bold text-slate-500">Pre-registered</p>
        </Card>
      </section>

      {lookupError && <AlertBox variant="danger" title="Check-in failed">{lookupError}</AlertBox>}

      {!result && (
        <Card padding="none">
          <div id={QR_ELEMENT_ID} className="w-full overflow-hidden rounded-xl" />
          {cameraError && <div className="p-4"><AlertBox variant="warning" title="Camera unavailable">{cameraError}</AlertBox></div>}
        </Card>
      )}

      {result?.kind === 'checked_in' && (
        <Card className="border-emerald-200">
          <Badge variant="approved" className="mb-3">Checked in just now</Badge>
          <AttendeeCard attendee={result.attendee} />
          <Button className="mt-4 w-full" onClick={scanNext}>Scan next</Button>
        </Card>
      )}

      {result?.kind === 'already_checked_in' && (
        <Card className="border-amber-200">
          <Badge variant="pending" className="mb-3">
            Already checked in {result.attendee?.scanned_at ? `at ${formatTime(result.attendee.scanned_at)}` : ''}
          </Badge>
          <AttendeeCard attendee={result.attendee} />
          <Button className="mt-4 w-full" onClick={scanNext}>Scan next</Button>
        </Card>
      )}

      {result?.kind === 'not_found' && (
        <div className="space-y-4">
          <Card className="border-red-200">
            <Badge variant="rejected" className="mb-3">Not registered for this job fair</Badge>
            <p className="text-sm text-slate-600">Search by name or mobile number instead — the seeker may have RSVP'd under a different phone, or a QR read may have failed.</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or mobile number"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
            {searching && <p className="mt-2 text-xs text-slate-400">Searching…</p>}
            {searchResults.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {searchResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => checkIn({ attendee_id: row.id })}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-bold text-slate-900">{row.name}</span>
                        <span className="ml-2 text-slate-500">{row.mobile_number}</span>
                        {row.is_guest && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">walk-in</span>}
                      </span>
                      {row.is_attended
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        : <Clock3 className="h-4 w-4 shrink-0 text-slate-300" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="mt-4 w-full" onClick={scanNext}>
              <XCircle className="h-4 w-4" /> Cancel and rescan
            </Button>
          </Card>

          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Still can't find them? Encode a walk-in</p>
            <p className="mt-1 text-sm text-slate-500">For a seeker with no i-peso account — only the physical/Google Form pre-registration.</p>
            <form onSubmit={encodeWalkIn} className="mt-3 space-y-2">
              <input
                required
                value={walkIn.guest_name}
                onChange={(e) => setWalkIn((w) => ({ ...w, guest_name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
              <input
                value={walkIn.guest_mobile_number}
                onChange={(e) => setWalkIn((w) => ({ ...w, guest_mobile_number: e.target.value }))}
                placeholder="Mobile number"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
              <input
                value={walkIn.guest_educ_attainment}
                onChange={(e) => setWalkIn((w) => ({ ...w, guest_educ_attainment: e.target.value }))}
                placeholder="Educational attainment"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
              <input
                value={walkIn.guest_preferred_job}
                onChange={(e) => setWalkIn((w) => ({ ...w, guest_preferred_job: e.target.value }))}
                placeholder="Preferred job"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
              <Button type="submit" disabled={encoding || !walkIn.guest_name.trim()} className="w-full">
                {encoding ? 'Registering…' : 'Register & check in'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
