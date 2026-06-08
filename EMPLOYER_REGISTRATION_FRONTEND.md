# Employer Registration - Frontend Implementation Guide

## Quick Start for Junior Developers

Your backend API is ready! Here's what you need to build on the frontend.

---

## Frontend App Structure (React Web)

### Step 1: Create Main Registration Component
**File**: `src/pages/employer/EmployerRegistration.jsx`

```jsx
import { useState } from 'react'
import Step1AccountSetup from './steps/Step1AccountSetup'
import Step2CompanyProfile from './steps/Step2CompanyProfile'
import Step3DocumentUpload from './steps/Step3DocumentUpload'
import Step4Representative from './steps/Step4Representative'

export default function EmployerRegistration() {
  const [currentStep, setCurrentStep] = useState(1)
  const [employerId, setEmployerId] = useState(null)
  const [formData, setFormData] = useState({})

  const handleStepComplete = (stepData, newEmployerId) => {
    // Save form data
    setFormData({ ...formData, ...stepData })
    if (newEmployerId) setEmployerId(newEmployerId)
    
    // Move to next step
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm">
          <div className={`${currentStep >= 1 ? 'text-blue-600 font-bold' : ''}`}>Step 1</div>
          <div className={`${currentStep >= 2 ? 'text-blue-600 font-bold' : ''}`}>Step 2</div>
          <div className={`${currentStep >= 3 ? 'text-blue-600 font-bold' : ''}`}>Step 3</div>
          <div className={`${currentStep >= 4 ? 'text-blue-600 font-bold' : ''}`}>Step 4</div>
        </div>
      </div>

      {/* Steps */}
      {currentStep === 1 && <Step1AccountSetup onComplete={handleStepComplete} />}
      {currentStep === 2 && <Step2CompanyProfile employerId={employerId} onComplete={handleStepComplete} />}
      {currentStep === 3 && <Step3DocumentUpload employerId={employerId} onComplete={handleStepComplete} />}
      {currentStep === 4 && <Step4Representative employerId={employerId} onComplete={handleStepComplete} />}
    </div>
  )
}
```

---

## Step 1: Account Setup Component

**File**: `src/pages/employer/steps/Step1AccountSetup.jsx`

```jsx
import { useState } from 'react'
import employerService from '../../../services/employerService'

export default function Step1AccountSetup({ onComplete }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirmation: '',
    company_type: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await employerService.registerStep1(formData)
      onComplete(formData, response.employer_id)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Step 1: Account Setup & Company Type</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="employer@company.com"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-1">Password *</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Min 8 characters"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password *</label>
          <input
            type="password"
            required
            value={formData.password_confirmation}
            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Confirm password"
          />
        </div>

        {/* Company Type */}
        <div>
          <label className="block text-sm font-medium mb-3">Company Type *</label>
          <div className="space-y-2">
            {[
              { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
              { value: 'corporation_partnership', label: 'Corporation / Partnership' },
              { value: 'local_recruitment_agency', label: 'Local Recruitment / Manpower Agency (PRPA)' },
              { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency (POEA/DMW)' },
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name="company_type"
                  value={option.value}
                  checked={formData.company_type === option.value}
                  onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                  className="mr-3"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Continue to Step 2'}
        </button>
      </form>
    </div>
  )
}
```

---

## Step 2: Company Profile Component

**File**: `src/pages/employer/steps/Step2CompanyProfile.jsx`

```jsx
import { useState, useEffect } from 'react'
import employerService from '../../../services/employerService'
import PsgcCascade from '../components/PsgcCascade'

export default function Step2CompanyProfile({ employerId, onComplete }) {
  const [formData, setFormData] = useState({
    employer_id: employerId,
    company_name: '',
    trade_name: '',
    industry: '',
    company_size: '',
    province: '',
    city_municipality: '',
    barangay: '',
    house_unit_street: '',
    company_description: '',
    company_logo: null,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    setFormData({ ...formData, company_logo: e.target.files[0] })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await employerService.registerStep2(formData)
      onComplete(formData, null)
    } catch (err) {
      setError(err.message || 'Failed to save company profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Step 2: Company Profile</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Registered Company Name *</label>
          <input
            type="text"
            required
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Official company name"
          />
        </div>

        {/* Trade Name / DBA */}
        <div>
          <label className="block text-sm font-medium mb-1">Trade Name / DBA (Optional)</label>
          <input
            type="text"
            value={formData.trade_name}
            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Name used in daily business"
          />
        </div>

        {/* Industry & Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Industry *</label>
            <select
              required
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select industry</option>
              <option value="IT">Information Technology</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="BPO">Business Process Outsourcing</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Size *</label>
            <select
              required
              value={formData.company_size}
              onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select size</option>
              <option value="micro">Micro (1-9 employees)</option>
              <option value="small">Small (10-49 employees)</option>
              <option value="medium">Medium (50-199 employees)</option>
              <option value="large">Large (200+ employees)</option>
            </select>
          </div>
        </div>

        {/* PSGC Cascade */}
        <PsgcCascade
          province={formData.province}
          city={formData.city_municipality}
          barangay={formData.barangay}
          onChange={(province, city, barangay) => 
            setFormData({ ...formData, province, city_municipality: city, barangay })
          }
        />

        {/* Street Address */}
        <div>
          <label className="block text-sm font-medium mb-1">House/Unit No. & Street *</label>
          <input
            type="text"
            required
            value={formData.house_unit_street}
            onChange={(e) => setFormData({ ...formData, house_unit_street: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="123 Business Avenue"
          />
        </div>

        {/* Company Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Company Description *</label>
          <textarea
            required
            value={formData.company_description}
            onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows="4"
            placeholder="Tell job seekers about your company..."
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">Company Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full"
          />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue to Step 3'}
        </button>
      </form>
    </div>
  )
}
```

---

## Step 3: Document Upload Component

**File**: `src/pages/employer/steps/Step3DocumentUpload.jsx`

```jsx
import { useState, useEffect } from 'react'
import employerService from '../../../services/employerService'
import DocumentUploadZone from '../components/DocumentUploadZone'
import RequiredDocumentsCheckbox from '../components/RequiredDocumentsCheckbox'

export default function Step3DocumentUpload({ employerId, onComplete }) {
  const [requiredDocuments, setRequiredDocuments] = useState([])
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRequiredDocuments()
  }, [employerId])

  const fetchRequiredDocuments = async () => {
    try {
      const response = await employerService.getRequiredDocuments(employerId)
      setRequiredDocuments(response.required_documents)
      setUploadedDocuments(response.uploaded_documents)
    } catch (err) {
      setError('Failed to load required documents')
    }
  }

  const handleDocumentUpload = async (documentType, file) => {
    setLoading(true)
    setError('')

    try {
      await employerService.uploadDocument(employerId, documentType, file)
      
      // Refresh documents list
      await fetchRequiredDocuments()
    } catch (err) {
      setError(`Failed to upload ${documentType}: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const allUploaded = requiredDocuments.every(doc => uploadedDocuments.includes(doc))

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Step 3: Upload Documents</h2>
      
      <RequiredDocumentsCheckbox 
        requiredDocuments={requiredDocuments}
        uploadedDocuments={uploadedDocuments}
      />

      {/* Document Upload Zones */}
      <div className="mt-6 space-y-4">
        {requiredDocuments.map((docType) => (
          <DocumentUploadZone
            key={docType}
            documentType={docType}
            isUploaded={uploadedDocuments.includes(docType)}
            onUpload={(file) => handleDocumentUpload(docType, file)}
            loading={loading}
          />
        ))}
      </div>

      {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}

      <button
        onClick={() => onComplete({}, null)}
        disabled={!allUploaded || loading}
        className="w-full mt-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {allUploaded ? 'Continue to Step 4' : 'Upload all required documents first'}
      </button>
    </div>
  )
}
```

---

## Step 4: Representative Details Component

**File**: `src/pages/employer/steps/Step4Representative.jsx`

```jsx
import { useState } from 'react'
import employerService from '../../../services/employerService'

export default function Step4Representative({ employerId, onComplete }) {
  const [formData, setFormData] = useState({
    employer_id: employerId,
    representative_first_name: '',
    representative_middle_name: '',
    representative_last_name: '',
    representative_designation: '',
    representative_contact_number: '',
    government_id: null,
    authorization_letter: null,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e) => {
    const { name } = e.target
    setFormData({ ...formData, [name]: e.target.files[0] })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await employerService.registerStep4(formData)
      setSuccess(true)
      // Redirect to dashboard or completion page
      onComplete(formData, null)
    } catch (err) {
      setError(err.message || 'Failed to submit registration')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 p-6 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold text-green-700 mb-4">Registration Submitted!</h2>
        <p className="text-gray-700 mb-4">
          Your employer account has been submitted for verification by Urdaneta City PESO.
        </p>
        <p className="text-gray-700 mb-4">
          You will receive an email notification when your account has been reviewed.
        </p>
        <button
          onClick={() => window.location.href = '/employer/dashboard'}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Step 4: Authorized Representative</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <input
              type="text"
              required
              value={formData.representative_first_name}
              onChange={(e) => setFormData({ ...formData, representative_first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Middle Name</label>
            <input
              type="text"
              value={formData.representative_middle_name}
              onChange={(e) => setFormData({ ...formData, representative_middle_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <input
              type="text"
              required
              value={formData.representative_last_name}
              onChange={(e) => setFormData({ ...formData, representative_last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Designation & Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Designation/Position *</label>
            <input
              type="text"
              required
              value={formData.representative_designation}
              onChange={(e) => setFormData({ ...formData, representative_designation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="e.g., HR Manager"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Number *</label>
            <input
              type="tel"
              required
              value={formData.representative_contact_number}
              onChange={(e) => setFormData({ ...formData, representative_contact_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="09123456789"
            />
          </div>
        </div>

        {/* Government ID */}
        <div>
          <label className="block text-sm font-medium mb-1">Government ID (Valid ID) *</label>
          <input
            type="file"
            required
            name="government_id"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">e.g., Driver's License, Passport, PRC ID</p>
        </div>

        {/* Authorization Letter */}
        <div>
          <label className="block text-sm font-medium mb-1">Authorization Letter (Optional)</label>
          <input
            type="file"
            name="authorization_letter"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Required if representative is not the owner listed in DTI/SEC permits
          </p>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 font-bold"
        >
          {loading ? 'Submitting Registration...' : 'Submit Registration for Review'}
        </button>
      </form>
    </div>
  )
}
```

---

## API Service File

**File**: `src/services/employerService.js`

```javascript
const API_URL = 'http://localhost:8000/api'

export const employerService = {
  // Registration endpoints
  registerStep1: async (data) => {
    const response = await fetch(`${API_URL}/employer/register/step-1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to register')
    return response.json()
  },

  registerStep2: async (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      formData.append(key, data[key])
    })

    const response = await fetch(`${API_URL}/employer/register/step-2`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Failed to save profile')
    return response.json()
  },

  uploadDocument: async (employerId, documentType, file) => {
    const formData = new FormData()
    formData.append('employer_id', employerId)
    formData.append('document_type', documentType)
    formData.append('document_file', file)

    const response = await fetch(`${API_URL}/employer/register/step-3`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Failed to upload document')
    return response.json()
  },

  getRequiredDocuments: async (employerId) => {
    const response = await fetch(`${API_URL}/employer/required-documents/${employerId}`)
    if (!response.ok) throw new Error('Failed to get required documents')
    return response.json()
  },

  registerStep4: async (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      formData.append(key, data[key])
    })

    const response = await fetch(`${API_URL}/employer/register/step-4`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Failed to submit registration')
    return response.json()
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/employer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) throw new Error('Login failed')
    return response.json()
  },

  getProfile: async (employerId, token) => {
    const response = await fetch(`${API_URL}/employer/profile/${employerId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Failed to get profile')
    return response.json()
  },
}

export default employerService
```

---

## Helper Components Needed

1. **PsgcCascade.jsx** - Province → City → Barangay dropdown
2. **DocumentUploadZone.jsx** - Drag-drop file upload
3. **RequiredDocumentsCheckbox.jsx** - Shows upload progress
4. **PendingVerificationBanner.jsx** - Status indicator

---

## Ready to Build!

Your backend API is complete and tested. Start with the main component and work through each step. Ask questions if you get stuck!

