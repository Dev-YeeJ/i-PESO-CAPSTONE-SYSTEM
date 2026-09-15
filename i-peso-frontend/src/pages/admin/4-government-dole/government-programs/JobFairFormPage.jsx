import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Plus, Save, X, Image as ImageIcon, UploadCloud } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardHeader, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import AddressPicker from '@/components/maps/AddressPicker'
import { adminService } from '@/services/adminService'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { isBefore, parseISO } from 'date-fns'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

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

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  venue: z.string().min(3, 'Venue is required.'),
  province: z.string().optional(),
  province_code: z.string().optional(),
  city_municipality: z.string().optional(),
  city_code: z.string().optional(),
  barangay: z.string().optional(),
  barangay_code: z.string().optional(),
  specific_address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  google_place_id: z.string().nullable().optional(),
  start_date: z.string().min(1, 'Start date is required.'),
  end_date: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required.'),
  end_time: z.string().min(1, 'End time is required.'),
  sector: z.enum(['local', 'overseas', 'both']),
  partner_agencies: z.array(z.string()).default([]),
  submission_deadline: z.string().optional().nullable(),
  maximum_representatives: z.coerce.number().min(1, 'At least 1 representative required.').max(10, 'Maximum 10 representatives allowed.'),
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date && data.start_date !== data.end_date) {
    if (isBefore(parseISO(data.end_date), parseISO(data.start_date))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date cannot be before start date', path: ['end_date'] })
    }
  }
  if (data.submission_deadline && data.start_date) {
    if (isBefore(parseISO(data.start_date), parseISO(data.submission_deadline))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Submission deadline must be before or on the start date.', path: ['submission_deadline'] })
    }
  }
})

export default function JobFairFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
    mode: 'onTouched'
  })

  const formValues = watch()
  const [multiDay, setMultiDay] = useState(false)
  const [partnerAgencyInput, setPartnerAgencyInput] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return

    let active = true
    setLoading(true)
    adminService.getJobFairDetail(id)
      .then((fair) => {
        if (!active) return
        const startDate = fair.start_date ?? fair.event_date ?? ''
        const endDate = fair.end_date ?? startDate
        
        reset({
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
        
        setMultiDay(Boolean(startDate) && startDate !== endDate)
        setMetrics(fair.metrics ?? null)
      })
      .catch((requestError) => {
        toast.error(requestError.response?.data?.message ?? 'Unable to load job fair.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, reset])

  const toggleMultiDay = useCallback((checked) => {
    setMultiDay(checked)
    if (!checked) setValue('end_date', formValues.start_date, { shouldValidate: true })
  }, [formValues.start_date, setValue])

  // Sync end_date to start_date when single-day
  useEffect(() => {
    if (!multiDay) {
      setValue('end_date', formValues.start_date, { shouldValidate: false })
    }
  }, [multiDay, formValues.start_date, setValue])

  const addPartnerAgency = useCallback(() => {
    const value = partnerAgencyInput.trim()
    if (!value) return
    const current = formValues.partner_agencies || []
    if (!current.includes(value)) {
      setValue('partner_agencies', [...current, value], { shouldValidate: true })
    }
    setPartnerAgencyInput('')
  }, [partnerAgencyInput, formValues.partner_agencies, setValue])

  const removePartnerAgency = useCallback((index) => {
    const current = formValues.partner_agencies || []
    setValue('partner_agencies', current.filter((_, i) => i !== index), { shouldValidate: true })
  }, [formValues.partner_agencies, setValue])

  const setLocation = useCallback((location) => {
    if (location.province) setValue('province', location.province)
    if (location.province_code) setValue('province_code', location.province_code)
    if (location.city) setValue('city_municipality', location.city)
    if (location.city_code) setValue('city_code', location.city_code)
    if (location.barangay) setValue('barangay', location.barangay)
    if (location.barangay_code) setValue('barangay_code', location.barangay_code)
    if (location.street) setValue('specific_address', location.street)
    if (location.latitude) setValue('latitude', location.latitude)
    if (location.longitude) setValue('longitude', location.longitude)
    if (location.google_place_id) setValue('google_place_id', location.google_place_id)
  }, [setValue])

  const [publishAfterSave, setPublishAfterSave] = useState(false)
  const [flyerFile, setFlyerFile] = useState(null)
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => setFlyerFile(acceptedFiles[0])
  })

  const onSubmit = async (data, event) => {
    const publishNow = event?.nativeEvent?.submitter?.name === 'publish'
    setPublishAfterSave(publishNow)

    const payload = {
      ...data,
      event_date: data.start_date,
      end_date: multiDay ? data.end_date : data.start_date,
      submission_deadline: data.submission_deadline || null,
    }

    try {
      if (id) {
        await adminService.updateJobFair(id, payload)
        toast.success('Job fair updated successfully.')
        navigate(`/admin/job-fairs/${id}`)
      } else {
        const { job_fair: created } = await adminService.createJobFair(payload)
        if (publishNow) {
          await adminService.publishJobFair(created.job_fair_id)
        }
        toast.success('Job fair created successfully.')
        navigate(`/admin/job-fairs/${created.job_fair_id}`)
      }
    } catch (requestError) {
      const msgs = requestError.response?.data?.errors
      const msgText = msgs ? Object.values(msgs).flat().join(' ') : requestError.response?.data?.message ?? 'Failed to save job fair.'
      toast.error(msgText)
    }
  }

  const backTarget = id ? `/admin/job-fairs/${id}` : '/admin/job-fairs'
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  return (
    <div className="portal-page">
      <PageHeader
        title={id ? 'Edit Job Fair' : 'Create Job Fair'}
        subtitle={id
          ? 'Publish the official bulletin, coordinate employers, and prepare post-event government reporting.'
          : 'Publishing this fair automatically emails every verified employer an invitation, with only the documentary requirements still outstanding for their company type.'}
        eyebrow="Government & DOLE"
        actions={[{ label: 'Back', onClick: () => navigate(backTarget), variant: 'secondary' }]}
      />

      {loading ? (
        <Card><LoadingSkeleton variant="card" rows={3} /></Card>
      ) : (
        <motion.form 
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          onSubmit={handleSubmit(onSubmit)} 
          className={`grid gap-6 ${id ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}
        >
          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} className="space-y-6">
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card>
                <CardHeader title="Basic Info" subtitle="What job seekers and employers see first." />
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Title</label>
                    <input {...register('title')} className={`mt-2 w-full rounded-lg border ${errors.title ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500'} px-4 py-2.5 text-sm focus:outline-none focus:ring-2`} />
                    {errors.title && <p className="mt-1 text-xs font-semibold text-red-600">{errors.title.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Description</label>
                    <textarea {...register('description')} rows={4} className={`mt-2 w-full rounded-lg border ${errors.description ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500'} px-4 py-2.5 text-sm focus:outline-none focus:ring-2`} />
                    {errors.description && <p className="mt-1 text-xs font-semibold text-red-600">{errors.description.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Sector</label>
                    <select {...register('sector')} className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                      <option value="local">Local</option>
                      <option value="overseas">Overseas</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  
                  {/* Dropzone Integration */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Event Flyer / Banner (Optional)</label>
                    <div {...getRootProps()} className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                      <input {...getInputProps()} />
                      {flyerFile ? (
                        <div className="flex items-center gap-3">
                          <ImageIcon className="h-8 w-8 text-blue-500" />
                          <div className="text-sm font-semibold text-slate-700">{flyerFile.name}</div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-500">
                          <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-sm font-semibold">Drag & drop a flyer image, or click to select</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card>
                <CardHeader title="Location" subtitle="Venue address and the map pin job seekers see." />
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Venue</label>
                    <input {...register('venue')} placeholder="e.g. SM City Urdaneta - Events Center, 2nd Floor" className={`mt-2 w-full rounded-lg border ${errors.venue ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                    {errors.venue && <p className="mt-1 text-xs font-semibold text-red-600">{errors.venue.message}</p>}
                  </div>
                  <AddressPicker
                    title="Venue Location / PSGC"
                    province={formValues.province}
                    provinceCode={formValues.province_code}
                    city={formValues.city_municipality}
                    cityCode={formValues.city_code}
                    barangay={formValues.barangay}
                    barangayCode={formValues.barangay_code}
                    street={formValues.specific_address}
                    latitude={formValues.latitude}
                    longitude={formValues.longitude}
                    google_place_id={formValues.google_place_id}
                    onChange={setLocation}
                  />
                </div>
              </Card>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card>
                <CardHeader title="Schedule" subtitle="Dates, times, and the employer submission deadline." />
                <div className="space-y-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={multiDay} onChange={(event) => toggleMultiDay(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                      This is a multi-day event
                    </label>
                  </div>

                  <div className={`grid gap-4 md:grid-cols-2 ${multiDay ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                    <div>
                      <label className="block text-sm font-bold text-slate-700">Start Date</label>
                      <input type="date" {...register('start_date')} min={id ? undefined : todayDate} className={`mt-2 w-full rounded-lg border ${errors.start_date ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                      {errors.start_date && <p className="mt-1 text-xs font-semibold text-red-600">{errors.start_date.message}</p>}
                    </div>
                    <AnimatePresence>
                      {multiDay && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.3 }}
                        >
                          <label className="block text-sm font-bold text-slate-700">End Date</label>
                          <input type="date" {...register('end_date')} min={formValues.start_date || undefined} className={`mt-2 w-full rounded-lg border ${errors.end_date ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                          {errors.end_date && <p className="mt-1 text-xs font-semibold text-red-600">{errors.end_date.message}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div>
                      <label className="block text-sm font-bold text-slate-700">Start Time</label>
                      <input type="time" {...register('start_time')} className={`mt-2 w-full rounded-lg border ${errors.start_time ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700">End Time</label>
                      <input type="time" {...register('end_time')} className={`mt-2 w-full rounded-lg border ${errors.end_time ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-bold text-slate-700">Submission Deadline</label>
                      <input type="date" {...register('submission_deadline')} max={formValues.start_date || undefined} className={`mt-2 w-full rounded-lg border ${errors.submission_deadline ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                      {errors.submission_deadline && <p className="mt-1 text-xs font-semibold text-red-600">{errors.submission_deadline.message}</p>}
                      <p className="mt-1 text-xs text-slate-500">Employers must submit their documentary requirements by this date.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700">Maximum Representatives</label>
                      <input type="number" {...register('maximum_representatives')} className={`mt-2 w-full rounded-lg border ${errors.maximum_representatives ? 'border-red-400' : 'border-slate-300'} px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`} />
                      {errors.maximum_representatives && <p className="mt-1 text-xs font-semibold text-red-600">{errors.maximum_representatives.message}</p>}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card>
                <CardHeader title="Partner Agencies" subtitle="Optional — co-organizers shown on the official bulletin." />
                <div className="flex flex-wrap gap-2">
                  {formValues.partner_agencies.map((agency, index) => (
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
              </Card>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  {id ? (
                    <Button type="submit" icon={Save} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                  ) : (
                    <>
                      <Button type="submit" name="draft" variant="outline" icon={Save} disabled={isSubmitting}>
                        {isSubmitting && !publishAfterSave ? 'Saving...' : 'Save as Draft'}
                      </Button>
                      <Button type="submit" name="publish" icon={Save} disabled={isSubmitting}>
                        {isSubmitting && publishAfterSave ? 'Publishing...' : 'Save & Publish'}
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="outline" icon={ArrowLeft} onClick={() => navigate(backTarget)}>Cancel</Button>
                </div>
                {!id && (
                  <p className="mt-3 text-xs text-slate-500">
                    <strong>Save as Draft</strong> keeps this private while you finish setting it up.{' '}
                    <strong>Save &amp; Publish</strong> makes it visible to job seekers immediately and emails every
                    verified employer an invitation.
                  </p>
                )}
              </Card>
            </motion.div>
          </motion.div>

          {id && (
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card className="h-fit">
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
            </motion.div>
          )}
        </motion.form>
      )}
    </div>
  )
}
