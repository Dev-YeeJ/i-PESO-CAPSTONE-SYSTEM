import { useState, useCallback } from 'react'
import Field from '@/components/form/Field'
import FormError from '@/components/form/FormError'
import SmartSuggestionInput from '@/components/form/SmartSuggestionInput'
import * as employerService from '@/services/employerService'
import { validateEmployerStep2 } from '@/services/validationHelpers'
import AddressPicker from '@/components/maps/AddressPicker'

const SERVER_FIELD_MAP = {
  city_municipality: 'city',
  house_unit_street: 'street_address',
  company_description: 'description',
  company_logo: 'logo',
}

const normalizeServerErrors = (serverErrors = {}) =>
  Object.fromEntries(
    Object.entries(serverErrors).map(([field, messages]) => [
      SERVER_FIELD_MAP[field] ?? field,
      Array.isArray(messages) ? messages[0] : messages,
    ]),
  )

const INDUSTRY_OPTIONS = [
  'Agriculture & Fishing',
  'Construction',
  'Education & Training',
  'Finance & Banking',
  'Food & Beverage',
  'Healthcare & Medical',
  'Information Technology',
  'Manufacturing',
  'Real Estate',
  'Retail & Commerce',
  'Transportation & Logistics',
  'Tourism & Hospitality',
  'Government & Public Sector',
  'Other',
]

const COMPANY_SIZE_OPTIONS = [
  { value: 'micro', label: 'Micro (1-9 employees)' },
  { value: 'small', label: 'Small (10-99 employees)' },
  { value: 'medium', label: 'Medium (100-199 employees)' },
  { value: 'large', label: 'Large (200+ employees)' },
]

export default function Step2CompanyProfile({ initialData = {}, onComplete }) {
  const [form, setForm] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = useCallback((e) => {
    const { name } = e.target
    let { value } = e.target
    if (name === 'tin') {
      const digits = value.replace(/\D/g, '').slice(0, 12)
      value = digits.match(/.{1,3}/g)?.join('-') ?? ''
    }
    setForm((f) => ({ ...f, [name]: value }))
    setApiError('')
    setErrors((err) => ({ ...err, [name]: undefined }))
  }, [])

  const handleBlur = useCallback((e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }))
  }, [])

  const getError = (name) => (touched[name] ? errors[name] : undefined)

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, logo: 'Please upload an image file' }))
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, logo: 'Logo size must be less than 5MB' }))
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setForm((prev) => ({
          ...prev,
          logo: file,
          logo_preview: event.target.result,
        }))
      }
      reader.readAsDataURL(file)

      if (errors.logo) {
        setErrors((prev) => ({ ...prev, logo: '' }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allFields = ['company_name', 'tin', 'industry', 'company_size', 'province', 'city', 'barangay', 'street_address', 'description']
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])))

    const errs = validateEmployerStep2(form)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setApiError('Please complete all required company profile fields.')
      return
    }

    setIsLoading(true)
    setApiError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('company_name', form.company_name)
      formDataToSend.append('tin', form.tin)
      formDataToSend.append('trade_name', form.trade_name || '')
      formDataToSend.append('industry', form.industry)
      formDataToSend.append('company_size', form.company_size)
      formDataToSend.append('province', form.province)
      formDataToSend.append('province_code', form.province_code || '')
      formDataToSend.append('city_municipality', form.city)
      formDataToSend.append('city_code', form.city_code || '')
      formDataToSend.append('barangay', form.barangay)
      formDataToSend.append('barangay_code', form.barangay_code || '')
      formDataToSend.append('house_unit_street', form.street_address)
      if (form.latitude && form.longitude) {
        formDataToSend.append('latitude', form.latitude)
        formDataToSend.append('longitude', form.longitude)
      }
      if (form.location_accuracy) {
        formDataToSend.append('location_accuracy', form.location_accuracy)
      }
      formDataToSend.append('company_description', form.description)
      if (form.logo) {
        formDataToSend.append('company_logo', form.logo)
      }

      await employerService.saveCompanyProfile(formDataToSend)

      onComplete({
        company_name: form.company_name,
        industry: form.industry,
        tin: form.tin,
      })
    } catch (err) {
      if (err.response?.status === 422) {
        const serverErrors = normalizeServerErrors(err.response.data.errors)
        setErrors(serverErrors)
        setTouched((current) => ({
          ...current,
          ...Object.fromEntries(Object.keys(serverErrors).map((field) => [field, true])),
        }))
        setApiError(err.response.data.message ?? 'Please review the highlighted fields.')
      } else {
        setApiError(
          err.response?.data?.message
            ?? err.response?.data?.error
            ?? 'Unable to save the company profile. Please try again.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={apiError} />

      <Field
        label="Company Name"
        name="company_name"
        placeholder="Enter your official company name"
        value={form.company_name ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('company_name')}
        required
      />

      <Field
        label="TIN"
        name="tin"
        placeholder="000-000-000-000"
        value={form.tin ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('tin')}
      />

      <Field
        label="Trade Name (Optional)"
        name="trade_name"
        placeholder="Doing business as..."
        value={form.trade_name ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('trade_name')}
      />

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Industry (Optional)
        </label>
        <select
          name="industry"
          value={form.industry ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            getError('industry')
              ? 'border-red-400 focus:border-red-400'
              : 'border-slate-300 focus:border-blue-400'
          }`}
        >
          <option value="">Select Industry</option>
          {INDUSTRY_OPTIONS.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
        {getError('industry') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('industry')}
          </p>
        )}
      </div>

      {/* Company Size */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Company Size
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COMPANY_SIZE_OPTIONS.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, company_size: size.value }))
                setErrors((prev) => ({ ...prev, company_size: null }))
              }}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                form.company_size === size.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'
              } ${getError('company_size') ? 'border-red-400' : ''}`}
            >
              <span className="text-sm font-semibold">{size.label.split(' (')[0]}</span>
              <span className="text-xs text-slate-500">
                {size.label.split('(')[1]?.replace(')', '')}
              </span>
            </button>
          ))}
        </div>
        {getError('company_size') && (
          <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('company_size')}
          </p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <AddressPicker
          title="Company Office Address"
          province={form.province ?? ''}
          provinceCode={form.province_code ?? ''}
          city={form.city ?? ''}
          cityCode={form.city_code ?? ''}
          barangay={form.barangay ?? ''}
          barangayCode={form.barangay_code ?? ''}
          street={form.street_address ?? ''}
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(locationData) => {
            setForm((prev) => ({
              ...prev,
              province: locationData.province ?? prev.province,
              province_code: locationData.province_code ?? prev.province_code,
              city: locationData.city ?? prev.city,
              city_code: locationData.city_code ?? prev.city_code,
              barangay: locationData.barangay ?? prev.barangay,
              barangay_code: locationData.barangay_code ?? prev.barangay_code,
              street_address: locationData.street ?? prev.street_address,
              latitude: locationData.latitude ?? prev.latitude,
              longitude: locationData.longitude ?? prev.longitude,
              location_accuracy: locationData.location_accuracy ?? prev.location_accuracy,
            }))
            setTouched((prev) => ({ ...prev, province: true, city: true, barangay: true, street_address: true }))
          }}
        />
      </div>

      {(getError('province') || getError('city') || getError('barangay') || getError('street_address')) && (
        <div className="space-y-1">
          {getError('province') && <p className="text-xs text-red-600">Province: {getError('province')}</p>}
          {getError('city') && <p className="text-xs text-red-600">City/Municipality: {getError('city')}</p>}
          {getError('barangay') && <p className="text-xs text-red-600">Barangay: {getError('barangay')}</p>}
          {getError('street_address') && <p className="text-xs text-red-600">Street Address: {getError('street_address')}</p>}
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Company Description
        </label>
        <textarea
          name="description"
          value={form.description ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Tell us about your company..."
          rows={4}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            getError('description')
              ? 'border-red-400 focus:border-red-400'
              : 'border-slate-300 focus:border-blue-400'
          }`}
        />
        {getError('description') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('description')}
          </p>
        )}
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Company Logo
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
          {form.logo_preview ? (
            <div className="space-y-2">
              <img
                src={form.logo_preview}
                alt="Logo preview"
                className="w-24 h-24 mx-auto object-contain"
              />
              <p className="text-sm text-slate-600">{form.logo?.name}</p>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    logo: null,
                    logo_preview: null,
                  }))
                }
                className="text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-600 mb-2">Click to upload logo</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-input"
              />
              <label
                htmlFor="logo-input"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-colors text-sm font-medium"
              >
                Choose File
              </label>
              <p className="text-xs text-slate-500 mt-2">PNG, JPG (max 5MB)</p>
            </div>
          )}
        </div>
        {getError('logo') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('logo')}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 mt-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {isLoading ? 'Saving Profile...' : 'Save & Continue'}
      </button>
    </form>
  )
}
