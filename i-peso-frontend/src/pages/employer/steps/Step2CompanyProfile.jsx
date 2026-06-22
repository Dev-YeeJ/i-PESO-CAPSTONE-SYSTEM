import { useState, useCallback } from 'react'
import Field from '@/components/form/Field'
import FormError from '@/components/form/FormError'
import SmartSuggestionInput from '@/components/form/SmartSuggestionInput'
import * as employerService from '@/services/employerService'
import { validateEmployerStep2 } from '@/services/validationHelpers'
import PsgcCascade from '../components/PsgcCascade'

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
  { value: 'micro', label: '1-50 employees' },
  { value: 'small', label: '51-200 employees' },
  { value: 'medium', label: '201-500 employees' },
  { value: 'large', label: '500+ employees' },
]

const COMPANY_NAME_SUGGESTIONS = [
  { label: 'ABC Trading Corporation', value: 'ABC Trading Corporation', helper: 'Use the official SEC/DTI registered business name.' },
  { label: 'Urdaneta City Manpower Services', value: 'Urdaneta City Manpower Services', helper: 'Avoid branch nicknames unless part of the legal name.' },
  { label: 'North Luzon Food Services Inc.', value: 'North Luzon Food Services Inc.', helper: 'Keep suffixes like Inc., Corp., or Cooperative when applicable.' },
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

  const handleLocationChange = useCallback(({ province, city, barangay }) => {
    setForm((f) => ({ ...f, province, city, barangay }))
    setTouched((t) => ({ ...t, province: true, city: true, barangay: true }))
    setErrors((current) => ({
      ...current,
      province: province ? undefined : current.province,
      city: city ? undefined : current.city,
      barangay: barangay ? undefined : current.barangay,
    }))
    setApiError('')
  }, [])

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
      formDataToSend.append('city_municipality', form.city)
      formDataToSend.append('barangay', form.barangay)
      formDataToSend.append('house_unit_street', form.street_address)
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

      <SmartSuggestionInput
        label="Company Name"
        name="company_name"
        placeholder="Enter your official company name"
        value={form.company_name ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('company_name')}
        options={COMPANY_NAME_SUGGESTIONS}
        helper="Smart suggestions encourage the official registered name used for PESO verification."
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
          Industry
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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Company Size
        </label>
        <select
          name="company_size"
          value={form.company_size ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            getError('company_size')
              ? 'border-red-400 focus:border-red-400'
              : 'border-slate-300 focus:border-blue-400'
          }`}
        >
          <option value="">Select Size</option>
          {COMPANY_SIZE_OPTIONS.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
        {getError('company_size') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('company_size')}
          </p>
        )}
      </div>

      {/* Location */}
      <PsgcCascade
        province={form.province ?? ''}
        city={form.city ?? ''}
        barangay={form.barangay ?? ''}
        onChange={handleLocationChange}
      />
      {(getError('province') || getError('city') || getError('barangay')) && (
        <div className="space-y-1">
          {getError('province') && <p className="text-xs text-red-600">Province: {getError('province')}</p>}
          {getError('city') && <p className="text-xs text-red-600">City/Municipality: {getError('city')}</p>}
          {getError('barangay') && <p className="text-xs text-red-600">Barangay: {getError('barangay')}</p>}
        </div>
      )}

      <Field
        label="Street Address"
        name="street_address"
        placeholder="123 Business Street"
        value={form.street_address ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('street_address')}
      />

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
