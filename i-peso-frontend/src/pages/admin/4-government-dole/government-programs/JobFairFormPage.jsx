import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Plus, Save, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardHeader, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import AddressPicker from '@/components/maps/AddressPicker'
import MapPinPicker from '@/components/maps/MapPinPicker'
import { adminService } from '@/services/adminService'
import { resolveCoordinatesAddress } from '@/services/geoService'

const emptyForm = {
  title: '',
  description: '',
  venue: '',
  province: '',
  province_code: '',
  city_municipality: '',
  city_code: '',
  barangay: '',
  barangay_code: '',
  specific_address: '',
  latitude: null,
  longitude: null,
  google_place_id: null,
  start_date: '',
  end_date: '',
  start_time: '08:00',
  end_time: '17:00',
  sector: 'local',
  partner_agencies: [],
  submission_deadline: '',
  maximum_representatives: 2,
}

export default function JobFairFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [singleDay, setSingleDay] = useState(true)
  const [partnerAgencyInput, setPartnerAgencyInput] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    let active = true
    setLoading(true)
    adminService.getJobFairDetail(id)
      .then((fair) => {
        if (!active) return
        const startDate = fair.start_date ?? fair.event_date ?? ''
        const endDate = fair.end_date ?? startDate
        setForm({
          title: fair.title ?? '',
          description: fair.description ?? '',
          venue: fair.venue ?? '',
          province: fair.province ?? '',
          province_code: fair.province_code ?? '',
          city_municipality: fair.city_municipality ?? '',
          city_code: fair.city_code ?? '',
          barangay: fair.barangay ?? '',
          barangay_code: fair.barangay_code ?? '',
          specific_address: fair.specific_address ?? '',
          latitude: fair.latitude ?? null,
          longitude: fair.longitude ?? null,
          google_place_id: fair.google_place_id ?? null,
          start_date: startDate,
          end_date: endDate,
          start_time: (fair.start_time ?? '08:00').slice(0, 5),
          end_time: (fair.end_time ?? '17:00').slice(0, 5),
          sector: fair.sector ?? 'local',
          partner_agencies: fair.partner_agencies ?? [],
          submission_deadline: fair.submission_deadline?.slice(0, 10) ?? '',
          maximum_representatives: fair.maximum_representatives ?? 2,
        })
        setSingleDay(!startDate || startDate === endDate)
        setMetrics(fair.metrics ?? null)
      })
      .catch((requestError) => setError(requestError.response?.data?.message ?? 'Unable to load job fair.'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const handleChange = useCallback((event) => {
    const { name, value } = event.target
    setForm((current) => {
      const next = { ...current, [name]: value }
      // Keep the hidden end date glued to the start date while the event is
      // marked single-day, so a later toggle-off doesn't reveal a stale value.
      if (name === 'start_date' && singleDay) next.end_date = value
      return next
    })
  }, [singleDay])

  const toggleSingleDay = useCallback((checked) => {
    setSingleDay(checked)
    if (checked) setForm((current) => ({ ...current, end_date: current.start_date }))
  }, [])

  const addPartnerAgency = useCallback(() => {
    const value = partnerAgencyInput.trim()
    if (!value) return
    setForm((current) => current.partner_agencies.includes(value)
      ? current
      : { ...current, partner_agencies: [...current.partner_agencies, value] })
    setPartnerAgencyInput('')
  }, [partnerAgencyInput])

  const removePartnerAgency = useCallback((index) => {
    setForm((current) => ({ ...current, partner_agencies: current.partner_agencies.filter((_, i) => i !== index) }))
  }, [])

  const [resolvingPin, setResolvingPin] = useState(false)
  const [pinMessage, setPinMessage] = useState('')

  const setLocation = useCallback((location) => {
    setForm((current) => ({
      ...current,
      province: location.province ?? current.province,
      province_code: location.province_code ?? current.province_code,
      city_municipality: location.city ?? current.city_municipality,
      city_code: location.city_code ?? current.city_code,
      barangay: location.barangay ?? current.barangay,
      barangay_code: location.barangay_code ?? current.barangay_code,
      specific_address: location.street ?? current.specific_address,
      latitude: location.latitude ?? current.latitude,
      longitude: location.longitude ?? current.longitude,
      google_place_id: location.google_place_id ?? current.google_place_id,
    }))
  }, [])

  const handlePinChange = useCallback(async (coords) => {
    setForm((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude }))
    setResolvingPin(true)
    setPinMessage('Finding the PSGC address for this pin...')

    try {
      const result = await resolveCoordinatesAddress(coords.latitude, coords.longitude)
      setForm((current) => ({
        ...current,
        province: result.province?.name ?? current.province,
        province_code: result.province?.code ?? current.province_code,
        city_municipality: result.city?.name ?? current.city_municipality,
        city_code: result.city?.code ?? current.city_code,
        barangay: result.barangay?.name ?? current.barangay,
        barangay_code: result.barangay?.code ?? current.barangay_code,
        specific_address: result.houseStreet || current.specific_address,
        google_place_id: result.placeId ?? current.google_place_id,
      }))
      setPinMessage(result.isComplete
        ? 'Province, city, and barangay were filled from the pin.'
        : `Pin located. Please verify${result.missingFields.length ? ` or complete: ${result.missingFields.join(', ')}` : ' the address fields'}.`)
    } catch (pinError) {
      setPinMessage(pinError.message ?? 'Pin saved, but its address could not be filled automatically.')
    } finally {
      setResolvingPin(false)
    }
  }, [])

  const dateError = useMemo(() => {
    if (!singleDay && form.start_date && form.end_date && form.end_date < form.start_date) {
      return 'End date cannot be before the start date.'
    }
    if (form.submission_deadline && form.start_date && form.submission_deadline > form.start_date) {
      return 'The submission deadline must be on or before the start date — employers need time to prepare.'
    }
    return ''
  }, [singleDay, form.start_date, form.end_date, form.submission_deadline])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (dateError) {
      setError(dateError)
      return
    }
    setSubmitting(true)
    setError('')

    const payload = {
      ...form,
      event_date: form.start_date,
      end_date: singleDay ? form.start_date : form.end_date,
      maximum_representatives: Number(form.maximum_representatives),
      submission_deadline: form.submission_deadline || null,
    }

    try {
      if (id) {
        await adminService.updateJobFair(id, payload)
      } else {
        await adminService.createJobFair(payload)
      }
      navigate('/admin/job-fairs')
    } catch (requestError) {
      const errors = requestError.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : requestError.response?.data?.message ?? 'Failed to save job fair.')
    } finally {
      setSubmitting(false)
    }
  }, [form, id, navigate, singleDay, dateError])

  return (
    <div className="portal-page">
      <PageHeader
        title={id ? 'Edit Job Fair' : 'Create Job Fair'}
        subtitle={id
          ? 'Publish the official bulletin, coordinate employers, and prepare post-event government reporting.'
          : 'Publishing this fair automatically emails every verified employer an invitation, with only the documentary requirements still outstanding for their company type.'}
        eyebrow="Government & DOLE"
        actions={[{ label: 'Back', onClick: () => navigate('/admin/job-fairs'), variant: 'secondary' }]}
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Event Details" subtitle="Official source for announcements, employer coordination, and reports." />
          {loading ? (
            <LoadingSkeleton variant="card" rows={3} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700">Title</label>
                <input name="title" value={form.title} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">Venue</label>
                <input name="venue" value={form.venue} onChange={handleChange} required placeholder="e.g. SM City Urdaneta - Events Center, 2nd Floor" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-4">
                <AddressPicker
                  title="Venue Location / PSGC"
                  province={form.province}
                  provinceCode={form.province_code}
                  city={form.city_municipality}
                  cityCode={form.city_code}
                  barangay={form.barangay}
                  barangayCode={form.barangay_code}
                  street={form.specific_address}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  google_place_id={form.google_place_id}
                  onChange={setLocation}
                />

                <MapPinPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  addressLine={`${form.venue || ''} ${form.barangay || ''} ${form.city_municipality || ''}`.trim()}
                  onChange={handlePinChange}
                />
                {(resolvingPin || pinMessage) && (
                  <p className="text-xs font-semibold text-blue-800">
                    {resolvingPin && <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
                    {pinMessage}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">Partner Agencies</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.partner_agencies.map((agency, index) => (
                    <span key={agency + index} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                      {agency}
                      <button type="button" onClick={() => removePartnerAgency(index)} aria-label={`Remove ${agency}`} className="text-blue-500 hover:text-blue-800">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={partnerAgencyInput}
                    onChange={(event) => setPartnerAgencyInput(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addPartnerAgency() } }}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <Button type="button" variant="outline" icon={Plus} onClick={addPartnerAgency}>Add</Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700">Submission Deadline</label>
                  <input type="date" name="submission_deadline" value={form.submission_deadline} onChange={handleChange} required max={form.start_date || undefined} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  <p className="mt-1 text-xs text-slate-500">Employers must submit their documentary requirements by this date.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">Maximum Representatives</label>
                  <input type="number" min="1" max="10" name="maximum_representatives" value={form.maximum_representatives} onChange={handleChange} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={singleDay} onChange={(event) => toggleSingleDay(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  This is a single-day event
                </label>
              </div>

              <div className={`grid gap-4 ${singleDay ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                <div>
                  <label className="block text-sm font-bold text-slate-700">Start Date</label>
                  <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required min={id ? undefined : new Date().toISOString().slice(0, 10)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                {!singleDay && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700">End Date</label>
                    <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required min={form.start_date || undefined} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700">Start Time</label>
                  <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">End Time</label>
                  <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              {dateError && <p className="text-xs font-semibold text-red-600">{dateError}</p>}

              <div>
                <label className="block text-sm font-bold text-slate-700">Sector</label>
                <select name="sector" value={form.sector} onChange={handleChange} className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="local">Local</option>
                  <option value="overseas">Overseas</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                <Button type="submit" icon={Save} disabled={submitting}>{submitting ? 'Saving...' : 'Save Job Fair'}</Button>
                <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/job-fairs')}>Cancel</Button>
              </div>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader title="Reporting Readiness" subtitle="Participation and post-event reporting only." />
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Approved', metrics?.approved ?? 0],
              ['Reports', (metrics?.self_service_reports ?? 0) + (metrics?.proxy_reports ?? 0)],
              ['Applicants', metrics?.total_applicants ?? 0],
              ['HOTS', metrics?.total_hots ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
