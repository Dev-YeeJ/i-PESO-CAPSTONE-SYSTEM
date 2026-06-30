// src/pages/employer/steps/Step4Representative.jsx
import { useState, useCallback } from 'react'
import Field from '@/components/form/Field'
import FormError from '@/components/form/FormError'
import * as employerService from '@/services/employerService'
import { validateEmployerStep4 } from '@/services/validationHelpers'

export default function Step4Representative({ onComplete }) {
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setApiError('')
    setErrors((err) => ({ ...err, [name]: undefined }))
  }, [])

  const handleBlur = useCallback((e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }))
  }, [])

  const getError = (name) => (touched[name] ? errors[name] : undefined)

  const handleGovernmentIdChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, government_id: 'Please upload an image file' }))
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, government_id: 'File size must be less than 5MB' }))
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setForm((prev) => ({
          ...prev,
          government_id: file,
          government_id_preview: event.target.result,
        }))
      }
      reader.readAsDataURL(file)

      if (errors.government_id) {
        setErrors((prev) => ({ ...prev, government_id: '' }))
      }
    }
  }

  const handleAuthLetterChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
      if (!validTypes.includes(file.type)) {
        setErrors((prev) => ({ ...prev, authorization_letter: 'Please upload PDF or image file' }))
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, authorization_letter: 'File size must be less than 10MB' }))
        return
      }

      setForm((prev) => ({
        ...prev,
        authorization_letter: file,
        authorization_letter_name: file.name,
      }))

      if (errors.authorization_letter) {
        setErrors((prev) => ({ ...prev, authorization_letter: '' }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allFields = ['first_name', 'last_name', 'designation', 'contact_number', 'representative_is_owner', 'government_id', 'authorization_letter']
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])))

    const errs = validateEmployerStep4(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('representative_first_name', form.first_name)
      formDataToSend.append('representative_middle_name', form.middle_name || '')
      const lastNameToSave = form.suffix ? `${form.last_name}, ${form.suffix}` : form.last_name
      formDataToSend.append('representative_last_name', lastNameToSave)
      formDataToSend.append('representative_designation', form.designation)
      formDataToSend.append('representative_contact_number', form.contact_number)
      formDataToSend.append('representative_is_owner', form.representative_is_owner)
      if (form.government_id) {
        formDataToSend.append('government_id', form.government_id)
      }
      if (form.authorization_letter) {
        formDataToSend.append('authorization_letter', form.authorization_letter)
      }

      await employerService.saveRepresentative(formDataToSend)

      onComplete({ registrationSubmitted: true })
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setApiError(err.response?.data?.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={apiError} />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Authorized Representative Details</p>
        <p>Please provide information about the person authorized to represent this company.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First Name"
          name="first_name"
          placeholder="Juan"
          value={form.first_name ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          error={getError('first_name')}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <Field
              label="Last Name"
              name="last_name"
              placeholder="Santos"
              value={form.last_name ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              error={getError('last_name')}
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 h-[20px] leading-5">Suffix</label>
            <select
              name="suffix"
              value={form.suffix ?? ''}
              onChange={handleChange}
              className="w-full px-2 py-2.5 text-sm rounded-xl border border-slate-300 bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value=""></option>
              {['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Field
        label="Middle Name (Optional)"
        name="middle_name"
        placeholder="Dela"
        value={form.middle_name ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('middle_name')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Designation / Position</label>
        <input
          type="text"
          name="designation"
          list="designation-options"
          placeholder="HR Manager, Director, etc."
          value={form.designation ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            getError('designation') ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-400'
          }`}
        />
        <datalist id="designation-options">
          {['HR Manager', 'HR Supervisor', 'Recruitment Officer', 'Owner', 'CEO', 'Director', 'President', 'General Manager', 'Admin Officer'].map(opt => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
        {getError('designation') && (
          <p className="mt-1.5 text-xs text-red-600">{getError('designation')}</p>
        )}
      </div>

      <Field
        label="Direct Contact Number"
        name="contact_number"
        placeholder="09123456789"
        value={form.contact_number ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('contact_number')}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Is the authorized representative the business owner?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: '1', label: 'Yes, owner' },
            { value: '0', label: 'No, representative' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                form.representative_is_owner === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="representative_is_owner"
                value={option.value}
                checked={form.representative_is_owner === option.value}
                onChange={handleChange}
                className="h-4 w-4 accent-blue-700"
              />
              <span className="text-sm text-slate-700">{option.label}</span>
            </label>
          ))}
        </div>
        {getError('representative_is_owner') && (
          <p className="mt-1.5 text-xs text-red-600">{getError('representative_is_owner')}</p>
        )}
      </div>

      {/* Government ID */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Company ID / Valid Government ID (Photo)
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
          {form.government_id_preview ? (
            <div className="space-y-2">
              <img
                src={form.government_id_preview}
                alt="Gov ID preview"
                className="w-32 h-24 mx-auto object-cover rounded"
              />
              <p className="text-sm text-slate-600">{form.government_id?.name}</p>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    government_id: null,
                    government_id_preview: null,
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
              <p className="text-sm text-slate-600 mb-2">Click to upload Government ID</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleGovernmentIdChange}
                className="hidden"
                id="gov-id-input"
              />
              <label
                htmlFor="gov-id-input"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-colors text-sm font-medium"
              >
                Choose File
              </label>
              <p className="text-xs text-slate-500 mt-2">JPG, PNG (max 5MB)</p>
            </div>
          )}
        </div>
        {getError('government_id') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('government_id')}
          </p>
        )}
      </div>

      {/* Authorization Letter */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Authorization Letter / Secretary&apos;s Certificate
          {form.representative_is_owner === '0' ? ' (Required)' : ' (Optional)'}
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
          {form.authorization_letter_name ? (
            <div className="space-y-2">
              <svg className="w-12 h-12 mx-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <p className="text-sm text-slate-600">{form.authorization_letter_name}</p>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    authorization_letter: null,
                    authorization_letter_name: '',
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-slate-600 mb-2">
                Upload proof that this person is authorized to represent the company
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleAuthLetterChange}
                className="hidden"
                id="auth-letter-input"
              />
              <label
                htmlFor="auth-letter-input"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition-colors text-sm font-medium"
              >
                Choose File
              </label>
              <p className="text-xs text-slate-500 mt-2">PDF or image (max 10MB)</p>
            </div>
          )}
        </div>
        {getError('authorization_letter') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {getError('authorization_letter')}
          </p>
        )}
      </div>

      {/* 👇 EXACT FIX: Updated Button Text */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
      >
        {isLoading ? 'Finalizing Profile...' : 'Complete Registration'}
      </button>
    </form>
  )
}
